const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../database/connection');
const { logsQuery } = require('../../database/logsConnection');

// POST /api/costs/calculate - คำนวณต้นทุนการผลิต
router.post('/calculate', async (req, res) => {
	try {
		let { batch_id, work_plan_id, job_code, job_name, production_date } = req.body;
		
		if (!batch_id) {
			return res.status(400).json({ success: false, error: 'Missing required field: batch_id' });
		}
		
		// เติมข้อมูลอัตโนมัติจาก batch/work_plan ถ้าผู้ใช้ไม่ได้ส่งมา
		if (!work_plan_id || !job_code || !job_name || !production_date) {
			const rows = await query(
				`SELECT pb.work_plan_id, wp.job_code, wp.job_name, wp.production_date
				 FROM production_batches pb
				 JOIN work_plans wp ON pb.work_plan_id = wp.id
				 WHERE pb.id = ?`,
				[batch_id]
			);
			if (rows.length === 0) {
				return res.status(404).json({ success: false, error: 'Batch not found' });
			}
			work_plan_id = work_plan_id || rows[0].work_plan_id;
			job_code = job_code || rows[0].job_code;
			job_name = job_name || rows[0].job_name;
			production_date = production_date || rows[0].production_date;
		}
		
		if (!work_plan_id || !job_code || !job_name || !production_date) {
			return res.status(400).json({ success: false, error: 'Missing job metadata (work_plan_id, job_code, job_name, production_date)' });
		}
		
		// ใช้ transaction เพื่อความปลอดภัย
		const result = await transaction(async (connection) => {
			// ดึงข้อมูลการใช้วัตถุดิบ (รวม conversion rates)
			const [materialAggRows] = await connection.execute(`
				SELECT 
					SUM(bmu.actual_qty) as input_material_qty,
					SUM(bmu.actual_qty * COALESCE(bmu.unit_price, 0)) as material_cost,
					MIN(bmu.unit) as unit,
					-- น้ำหนักรวมเป็นกก. จาก unit_conversions (ลำดับความสำคัญ: Mat_Id > material_name > pattern > generic)
					SUM(
						CASE 
							WHEN bmu.unit = 'กก.' THEN bmu.actual_qty
							ELSE bmu.actual_qty * COALESCE(
								uc_mat.conversion_rate,
								uc_name.conversion_rate,
								uc_pat.conversion_rate,
								uc_generic.conversion_rate,
								1
							)
						END
					) as total_weight_kg
				FROM batch_material_usage bmu
				LEFT JOIN material m ON bmu.material_id = m.id
				LEFT JOIN unit_conversions uc_mat 
				  ON uc_mat.Mat_Id COLLATE utf8mb4_unicode_ci = m.Mat_Id COLLATE utf8mb4_unicode_ci 
				  AND uc_mat.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
				  AND uc_mat.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci
				LEFT JOIN unit_conversions uc_name 
				  ON uc_name.Mat_Id IS NULL 
				  AND uc_name.material_name COLLATE utf8mb4_unicode_ci = m.Mat_Name COLLATE utf8mb4_unicode_ci 
				  AND uc_name.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
				  AND uc_name.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci
				LEFT JOIN unit_conversions uc_pat 
				  ON uc_pat.Mat_Id IS NULL 
				  AND (uc_pat.material_name IS NULL OR uc_pat.material_name = '' COLLATE utf8mb4_unicode_ci) 
				  AND uc_pat.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
				  AND uc_pat.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci 
				  AND (m.Mat_Name COLLATE utf8mb4_unicode_ci LIKE uc_pat.material_pattern COLLATE utf8mb4_unicode_ci)
				LEFT JOIN unit_conversions uc_generic 
				  ON uc_generic.Mat_Id IS NULL 
				  AND (uc_generic.material_name IS NULL OR uc_generic.material_name = '' COLLATE utf8mb4_unicode_ci) 
				  AND (uc_generic.material_pattern IS NULL OR uc_generic.material_pattern = '' COLLATE utf8mb4_unicode_ci) 
				  AND uc_generic.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
				  AND uc_generic.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci
				WHERE bmu.batch_id = ?
			`, [batch_id]);
			const materialAgg = materialAggRows[0] || { input_material_qty: 0, material_cost: 0, unit: null, total_weight_kg: 0 };
			
			// ดึงข้อมูลผลผลิตจาก production_batches (ที่บันทึกจากหน้า Inventory)
			const [prodRows] = await connection.execute(`
				SELECT actual_qty as output_qty, planned_qty as total_qty
				FROM production_batches
				WHERE id = ?
			`, [batch_id]);
			const productionData = prodRows[0] || { output_qty: 0, total_qty: 0 };
			
			// คำนวณเวลาการผลิต - ใช้ window functions เพื่อความแม่นยำ
			const [timeRows] = await connection.execute(`
				SELECT 
					SUM(
						CASE 
							WHEN status = 'stop' AND prev_status = 'start' 
							THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
							ELSE 0 
						END
					) as time_used_minutes
				FROM (
					SELECT 
						status,
						timestamp,
						LAG(status) OVER (PARTITION BY work_plan_id, process_number ORDER BY timestamp) as prev_status,
						LAG(timestamp) OVER (PARTITION BY work_plan_id, process_number ORDER BY timestamp) as prev_timestamp
					FROM logs 
					WHERE work_plan_id = ?
				) time_calc
			`, [work_plan_id]);
			const timeData = timeRows[0] || { time_used_minutes: 0 };
			
			// คำนวณต้นทุนต่อหน่วย
			const outputUnitCost = (Number(productionData.output_qty) > 0)
				? Number(materialAgg.material_cost || 0) / Number(productionData.output_qty)
				: 0;
			
			// บันทึกหรืออัพเดทข้อมูลต้นทุน
			const costSql = `
				INSERT INTO production_costs 
				(work_plan_id, batch_id, job_code, job_name, production_date, 
				 input_material_qty, input_material_unit, output_qty, output_unit_cost, output_unit,
				 time_used_minutes, operators_count, labor_rate_per_hour,
				 loss_percent, utility_percent, notes)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
				 batch_id = VALUES(batch_id),
				 input_material_qty = VALUES(input_material_qty),
				 input_material_unit = VALUES(input_material_unit),
				 output_qty = VALUES(output_qty),
				 output_unit_cost = VALUES(output_unit_cost),
				 output_unit = VALUES(output_unit),
				 time_used_minutes = VALUES(time_used_minutes),
				 operators_count = VALUES(operators_count),
				 labor_rate_per_hour = VALUES(labor_rate_per_hour),
				 loss_percent = VALUES(loss_percent),
				 utility_percent = VALUES(utility_percent),
				 notes = VALUES(notes),
				 updated_at = NOW()
			`;
			
			const params = [
				work_plan_id, batch_id, job_code, job_name, production_date,
				Number(materialAgg.input_material_qty || 0), materialAgg.unit || null,
				Number(productionData.output_qty || 0), outputUnitCost, materialAgg.unit || null,
				Number(timeData.time_used_minutes || 0),
				1, 480.00, 0.1000, 0.0100,
				`Calculated for batch ${batch_id}`
			];
			
			const costResult = await connection.execute(costSql, params);
			
			return {
				cost_id: costResult[0].insertId || costResult[0].affectedRows,
				input_material_qty: Number(materialAgg.input_material_qty || 0),
				total_weight_kg: Number(materialAgg.total_weight_kg || 0),
				material_cost: Number(materialAgg.material_cost || 0),
				output_qty: Number(productionData.output_qty || 0),
				output_unit_cost: outputUnitCost,
				time_used_minutes: Number(timeData.time_used_minutes || 0)
			};
		});
		
		res.status(201).json({
			success: true,
			message: 'Cost calculation completed successfully',
			data: result
		});
	} catch (error) {
		console.error('Error calculating costs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to calculate costs',
			message: error.message
		});
	}
});

// POST /api/costs/save - คำนวณและบันทึกแบบง่าย
router.post('/save', async (req, res) => {
    try {
        let { batch_id, work_plan_id, job_code, job_name, production_date, operators_count, labor_rate_per_hour, saved_by, saved_reason, labor_workers_count, labor_daily_wage } = req.body;

        if (!batch_id) {
            return res.status(400).json({ success: false, error: 'Missing required field: batch_id' });
        }

        // เติมข้อมูลอัตโนมัติจาก batch/work_plan ถ้าผู้ใช้ไม่ได้ส่งมา
        if (!work_plan_id || !job_code || !job_name || !production_date) {
            const rows = await query(
                `SELECT pb.work_plan_id, wp.job_code, wp.job_name, wp.production_date
                 FROM production_batches pb
                 JOIN work_plans wp ON pb.work_plan_id = wp.id
                 WHERE pb.id = ?`,
                [batch_id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Batch not found' });
            }
            work_plan_id = work_plan_id || rows[0].work_plan_id;
            job_code = job_code || rows[0].job_code;
            job_name = job_name || rows[0].job_name;
            production_date = production_date || rows[0].production_date;
        }

        operators_count = Number(operators_count || 1);
        labor_rate_per_hour = Number(labor_rate_per_hour || 480.00);
        labor_workers_count = Number(labor_workers_count || operators_count || 1);
        labor_daily_wage = Number(labor_daily_wage || labor_rate_per_hour || 480.00);

        const result = await transaction(async (connection) => {
            // สรุปวัตถุดิบ
            const [materialAggRows] = await connection.execute(`
                SELECT 
                    SUM(actual_qty) as input_material_qty,
                    SUM(actual_qty * COALESCE(unit_price, 0)) as material_cost,
                    MIN(unit) as unit,
                    SUM(
                        CASE 
                            WHEN bmu.unit = 'กก.' THEN bmu.actual_qty
                            WHEN bmu.unit = 'แพ็ค' THEN 
                                CASE 
                                    WHEN m.Mat_Name LIKE '%SanWu%' THEN bmu.actual_qty * 0.150
                                    WHEN m.Mat_Name LIKE '%ให้ตี๋เหล่า%' THEN bmu.actual_qty * 0.200
                                    ELSE bmu.actual_qty * 0.150
                                END
                            ELSE bmu.actual_qty
                        END
                    ) as total_weight_kg
                FROM batch_material_usage bmu
                LEFT JOIN material m ON bmu.material_id = m.id
                WHERE bmu.batch_id = ?
            `, [batch_id]);
            const materialAgg = materialAggRows[0] || { input_material_qty: 0, material_cost: 0, unit: null, total_weight_kg: 0 };

            			// ผลผลิต - ใช้ production_batches เป็นหลักเพื่อความสอดคล้อง
			const [prodRows] = await connection.execute(`
				SELECT actual_qty as output_qty, planned_qty as total_qty
				FROM production_batches
				WHERE id = ?
			`, [batch_id]);
			const productionData = prodRows[0] || { output_qty: 0, total_qty: 0 };

            // เวลา - ใช้ window functions เพื่อความแม่นยำ
            const [timeRows] = await connection.execute(`
                SELECT 
                    SUM(
                        CASE 
                            WHEN status = 'stop' AND prev_status = 'start' 
                            THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
                            ELSE 0 
                        END
                    ) as time_used_minutes
                FROM (
                    SELECT 
                        status,
                        timestamp,
                        LAG(status) OVER (PARTITION BY work_plan_id, process_number ORDER BY timestamp) as prev_status,
                        LAG(timestamp) OVER (PARTITION BY work_plan_id, process_number ORDER BY timestamp) as prev_timestamp
                    FROM logs 
                    WHERE work_plan_id = ?
                ) time_calc
            `, [work_plan_id]);
            const timeData = timeRows[0] || { time_used_minutes: 0 };

            // จำนวนผู้ปฏิบัติงานที่วางแผนไว้จาก work plan (operators JSON)
            let plannedOperatorsCount = operators_count;
            try {
                const [opRows] = await connection.execute(`
                    SELECT JSON_LENGTH(operators) AS planned_operators_count
                    FROM work_plans WHERE id = ?
                `, [work_plan_id]);
                plannedOperatorsCount = Number(opRows?.[0]?.planned_operators_count ?? operators_count ?? 1);
            } catch {}

            const outputUnitCost = (Number(productionData.output_qty) > 0)
                ? Number(materialAgg.material_cost || 0) / Number(productionData.output_qty)
                : 0;

            // INSERT ลง production_costs แบบง่ายๆ
            try {
                await connection.execute(`
                    INSERT INTO production_costs 
                    (work_plan_id, batch_id, job_code, job_name, production_date, 
                     input_material_qty, input_material_unit, output_qty, output_unit_cost, output_unit,
                     time_used_minutes, operators_count, labor_rate_per_hour,
                     loss_percent, utility_percent, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    work_plan_id, batch_id, job_code, job_name, production_date,
                    Number(materialAgg.input_material_qty || 0), materialAgg.unit || null,
                    Number(productionData.output_qty || 0), outputUnitCost, materialAgg.unit || null,
                    Number(timeData.time_used_minutes || 0),
                    plannedOperatorsCount, labor_daily_wage, 0.1000, 0.0100,
                    `Saved for batch ${batch_id}`
                ]);
                // บังคับอัพเดทเวลาเพื่อให้ /last-saved มองเห็นทันที
                await connection.execute(
                    `UPDATE production_costs SET updated_at = NOW() WHERE production_date = ? AND job_code = ?`,
                    [production_date, job_code]
                );
            } catch (insertError) {
                // ถ้า INSERT ไม่สำเร็จ ให้ลอง UPDATE
                if (insertError.code === 'ER_DUP_ENTRY') {
                    await connection.execute(`
                        UPDATE production_costs SET
                         batch_id = ?, input_material_qty = ?, input_material_unit = ?,
                         output_qty = ?, output_unit_cost = ?, output_unit = ?,
                         time_used_minutes = ?, operators_count = ?, labor_rate_per_hour = ?,
                         loss_percent = ?, utility_percent = ?, notes = ?, updated_at = NOW()
                        WHERE production_date = ? AND job_code = ?
                    `, [
                        batch_id, Number(materialAgg.input_material_qty || 0), materialAgg.unit || null,
                        Number(productionData.output_qty || 0), outputUnitCost, materialAgg.unit || null,
                        Number(timeData.time_used_minutes || 0), plannedOperatorsCount, labor_daily_wage,
                        0.1000, 0.0100, `Updated for batch ${batch_id}`,
                        production_date, job_code
                    ]);
                } else {
                    throw insertError;
                }
            }

            // หา cost_id ที่แท้จริง
            const [costIdRows] = await connection.execute(
                `SELECT id FROM production_costs WHERE production_date = ? AND job_code = ? LIMIT 1`,
                [production_date, job_code]
            );
            const cost_id = (costIdRows && costIdRows[0] && costIdRows[0].id) ? Number(costIdRows[0].id) : null;

            // เก็บประวัติการบันทึกลง production_costs_history
            try {
                await connection.execute(`
                    INSERT INTO production_costs_history (
                        cost_id, work_plan_id, batch_id, job_code, job_name, production_date,
                        input_material_qty, input_material_unit, total_weight_kg, material_cost,
                        output_qty, output_unit, output_unit_cost,
                        time_used_minutes, operators_count, labor_rate_per_hour,
                        saved_by, saved_reason
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    cost_id, work_plan_id, batch_id, job_code, job_name, production_date,
                    Number(materialAgg.input_material_qty || 0), materialAgg.unit || null, Number(materialAgg.total_weight_kg || 0), Number(materialAgg.material_cost || 0),
                    Number(productionData.output_qty || 0), materialAgg.unit || null, outputUnitCost,
                    Number(timeData.time_used_minutes || 0), plannedOperatorsCount, labor_daily_wage,
                    saved_by || null, saved_reason || null
                ]);
                				if (process.env.NODE_ENV === 'development') {
					console.log('History saved successfully for batch:', batch_id);
				}
            } catch (historyError) {
                console.error('History insert error:', historyError?.message || historyError);
                console.error('Error details:', {
                    cost_id, work_plan_id, batch_id, job_code, job_name, production_date,
                    material_qty: Number(materialAgg.input_material_qty || 0),
                    material_unit: materialAgg.unit || null,
                    total_weight: Number(materialAgg.total_weight_kg || 0),
                    material_cost: Number(materialAgg.material_cost || 0),
                    output_qty: Number(productionData.output_qty || 0),
                    output_unit: materialAgg.unit || null,
                    output_unit_cost: outputUnitCost,
                    time_used: Number(timeData.time_used_minutes || 0),
                    operators: plannedOperatorsCount,
                    labor_rate: labor_daily_wage,
                    saved_by: saved_by || null,
                    saved_reason: saved_reason || null
                });
            }

            return {
                cost_id,
                input_material_qty: Number(materialAgg.input_material_qty || 0),
                total_weight_kg: Number(materialAgg.total_weight_kg || 0),
                material_cost: Number(materialAgg.material_cost || 0),
                output_qty: Number(productionData.output_qty || 0),
                output_unit_cost: outputUnitCost,
                time_used_minutes: Number(timeData.time_used_minutes || 0)
            };
        });

        res.status(201).json({ success: true, message: 'Cost saved successfully', data: result, saved: true });
    } catch (error) {
        console.error('Error saving costs:', error);
        res.status(500).json({ success: false, error: 'Failed to save costs', message: error.message });
    }
});

// POST /api/costs/save-simple - บันทึกแบบง่าย
router.post('/save-simple', async (req, res) => {
    try {
        const { batch_id, saved_by, saved_reason } = req.body;
        
        if (!batch_id) {
            return res.status(400).json({ success: false, error: 'Missing required field: batch_id' });
        }

        // ดึงข้อมูล batch
        const batchRows = await query(
            `SELECT pb.work_plan_id, wp.job_code, wp.job_name, wp.production_date
             FROM production_batches pb
             JOIN work_plans wp ON pb.work_plan_id = wp.id
             WHERE pb.id = ?`,
            [batch_id]
        );
        
        if (batchRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Batch not found' });
        }
        
        const batchData = batchRows[0];
        
        // บันทึกข้อมูลง่ายๆ
        await query(`
            INSERT INTO production_costs 
            (work_plan_id, batch_id, job_code, job_name, production_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            notes = VALUES(notes), updated_at = NOW()
        `, [
            batchData.work_plan_id, 
            batch_id, 
            batchData.job_code, 
            batchData.job_name, 
            batchData.production_date,
            `Saved by ${saved_by || 'webapp'} - ${saved_reason || 'manual save'}`
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Cost saved successfully', 
            data: { batch_id, saved_by, saved_reason }
        });
    } catch (error) {
        console.error('Error saving costs (simple):', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save costs', 
            message: error.message 
        });
    }
});

// GET /api/costs/last-saved?date=YYYY-MM-DD - เวลาบันทึกล่าสุดของวัน
router.get('/last-saved', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, error: 'Date parameter is required' });
        }
        const rows = await query(
            `SELECT MAX(pc.updated_at) AS last_saved_at, COUNT(*) AS records
             FROM production_costs pc
             WHERE pc.production_date = ? AND pc.updated_at IS NOT NULL`,
            [date]
        );
        
        // Debug: ตรวจสอบข้อมูลในตาราง
        const debugRows = await query(
            `SELECT id, production_date, updated_at, created_at, job_code, notes
             FROM production_costs 
             WHERE production_date = ?
             ORDER BY updated_at DESC`,
            [date]
        );
        console.log('Debug - production_costs for date', date, ':', debugRows);
        const data = rows && rows[0] ? rows[0] : { last_saved_at: null, records: 0 };
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching last saved info:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch last saved info', message: error.message });
    }
});

// GET /api/costs/batch/:batchId - ดึงข้อมูลต้นทุนของล็อต
router.get('/batch/:batchId', async (req, res) => {
	try {
		const { batchId } = req.params;
		
		const sql = `
			SELECT 
				pc.*,
				pb.batch_code,
				pb.fg_code,
				fg.FG_Name as fg_name
			FROM production_costs pc
			JOIN production_batches pb ON pc.batch_id = pb.id
			JOIN fg ON pb.fg_code = fg.FG_Code
			WHERE pc.batch_id = ?
		`;
		
		const costs = await query(sql, [batchId]);
		
		if (costs.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Cost data not found for this batch'
			});
		}
		
		res.json({
			success: true,
			data: costs[0]
		});
	} catch (error) {
		console.error('Error fetching cost data:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch cost data',
			message: error.message
		});
	}
});

// GET /api/costs/summary - สรุปต้นทุนตามวันที่ (แสดงตาม Workplan)
router.get('/summary', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date parameter is required'
            });
        }

        // ดึงข้อมูลรายงานต้นทุนรายวันตาม Workplan
        const sql = `
            SELECT
                wp.id as work_plan_id,
                wp.job_code,
                wp.job_name,
                wp.production_date,
                wp.status_id,
                
                -- ข้อมูล batch (ถ้ามี)
                pb.id as batch_id,
                pb.batch_code,
                pb.status as batch_status,
                
                -- ข้อมูลผลผลิต (ดึงจาก production_batches)
                pb.actual_qty as good_qty,
                0 as defect_qty,
                pb.planned_qty as total_qty,
                0 as good_secondary_qty,
                'กก.' COLLATE utf8mb4_unicode_ci as good_secondary_unit,

                -- ข้อมูลวัตถุดิบ (ถ้ามี)
                COALESCE(material_data.total_material_qty, 0) as total_material_qty,
                COALESCE(material_data.total_material_cost, 0) as total_material_cost,
                COALESCE(material_data.cost_per_unit, 0) as cost_per_unit,
                COALESCE(material_data.unit COLLATE utf8mb4_unicode_ci, 'กก.' COLLATE utf8mb4_unicode_ci) as unit,

                -- ข้อมูล conversion rate
                COALESCE(fg.base_unit COLLATE utf8mb4_unicode_ci, 'กก.' COLLATE utf8mb4_unicode_ci) as base_unit,
                COALESCE(fg.conversion_rate, 1.0000) as conversion_rate,
                COALESCE(fg.conversion_description COLLATE utf8mb4_unicode_ci, '1 กก. = 1 กก.' COLLATE utf8mb4_unicode_ci) as conversion_description,
                COALESCE(fg.FG_Unit COLLATE utf8mb4_unicode_ci, 'กก.' COLLATE utf8mb4_unicode_ci) as display_unit,

                -- ข้อมูลน้ำหนักรวม
                COALESCE(material_data.total_weight_kg, 0) as total_weight_kg,

                -- จำนวนผู้ปฏิบัติงานจาก work plan (operators เป็น JSON)
                JSON_LENGTH(wp.operators) as operators_count,

                -- ข้อมูลที่บันทึกไว้ (ถ้ามี)
                pc.output_unit_cost as saved_output_unit_cost,
                pc.time_used_minutes as saved_time_used_minutes,
                pc.updated_at as saved_updated_at,
                pc.notes as saved_notes,

                -- สถานะการผลิต (จะถูกคำนวณใหม่ในส่วน JavaScript)
                'pending' as production_status,
                
                -- ข้อมูลจาก finished_flags (ถ้ามี)
                ff.is_finished as is_finished_flag

            FROM work_plans wp
            
            -- LEFT JOIN กับ production_batches (ถ้ามี)
            LEFT JOIN production_batches pb ON pb.work_plan_id = wp.id
            
            -- ข้อมูลผลการผลิตจะดึงจาก production_batches โดยตรง (actual_qty, planned_qty)

            -- Subquery สำหรับข้อมูลวัตถุดิบ (รวม conversion rates)
            LEFT JOIN (
                SELECT
                    bmu.batch_id,
                    SUM(bmu.actual_qty) as total_material_qty,
                    SUM(bmu.actual_qty * COALESCE(bmu.unit_price, 0)) as total_material_cost,
                    CASE
                        WHEN SUM(bmu.actual_qty) > 0
                        THEN SUM(bmu.actual_qty * COALESCE(bmu.unit_price, 0)) / SUM(bmu.actual_qty)
                        ELSE 0
                    END as cost_per_unit,
                    MAX(bmu.unit) as unit,
                    -- น้ำหนักรวมเป็นกก. จาก unit_conversions (Mat_Id > material_name > pattern > generic)
                    SUM(
                        CASE 
                            WHEN bmu.unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci THEN bmu.actual_qty
                            ELSE bmu.actual_qty * COALESCE(
                                uc_mat.conversion_rate,
                                uc_name.conversion_rate,
                                uc_pat.conversion_rate,
                                uc_generic.conversion_rate,
                                1
                            )
                        END
                    ) as total_weight_kg
                FROM batch_material_usage bmu
                LEFT JOIN material m ON bmu.material_id = m.id
                LEFT JOIN unit_conversions uc_mat 
                  ON uc_mat.Mat_Id COLLATE utf8mb4_unicode_ci = m.Mat_Id COLLATE utf8mb4_unicode_ci 
                  AND uc_mat.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
                  AND uc_mat.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci
                LEFT JOIN unit_conversions uc_name 
                  ON uc_name.Mat_Id IS NULL 
                  AND uc_name.material_name COLLATE utf8mb4_unicode_ci = m.Mat_Name COLLATE utf8mb4_unicode_ci 
                  AND uc_name.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
                  AND uc_name.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci
                LEFT JOIN unit_conversions uc_pat 
                  ON uc_pat.Mat_Id IS NULL 
                  AND (uc_pat.material_name IS NULL OR uc_pat.material_name = '' COLLATE utf8mb4_unicode_ci) 
                  AND uc_pat.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
                  AND uc_pat.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci 
                  AND (m.Mat_Name COLLATE utf8mb4_unicode_ci LIKE uc_pat.material_pattern COLLATE utf8mb4_unicode_ci)
                LEFT JOIN unit_conversions uc_generic 
                  ON uc_generic.Mat_Id IS NULL 
                  AND (uc_generic.material_name IS NULL OR uc_generic.material_name = '' COLLATE utf8mb4_unicode_ci) 
                  AND (uc_generic.material_pattern IS NULL OR uc_generic.material_pattern = '' COLLATE utf8mb4_unicode_ci) 
                  AND uc_generic.from_unit COLLATE utf8mb4_unicode_ci = bmu.unit COLLATE utf8mb4_unicode_ci 
                  AND uc_generic.to_unit COLLATE utf8mb4_unicode_ci = 'กก.' COLLATE utf8mb4_unicode_ci
                GROUP BY bmu.batch_id
            ) material_data ON pb.id = material_data.batch_id

            -- JOIN กับตาราง fg เพื่อดึงข้อมูล conversion rate (บังคับ collation ให้ตรงกัน)
            LEFT JOIN fg ON pb.fg_code COLLATE utf8mb4_unicode_ci = fg.FG_Code COLLATE utf8mb4_unicode_ci
            
            -- LEFT JOIN กับ production_costs (ถ้ามี)
            LEFT JOIN production_costs pc ON pc.batch_id = pb.id AND pc.production_date = wp.production_date
            
            -- LEFT JOIN กับ finished_flags (ถ้ามี)
            LEFT JOIN finished_flags ff ON ff.work_plan_id = wp.id
            
            WHERE DATE(wp.production_date) = ?
            ORDER BY wp.id
        `;

        const results = await query(sql, [date]);

        // คำนวณเวลาที่ใช้สำหรับแต่ละ work plan (ทั้งที่มีและไม่มี batch)
        const resultsWithTime = await Promise.all(results.map(async (item) => {
            try {

                // ดึงข้อมูล logs ของ work plan นี้ - ใช้ Database ใหม่
                const logsSql = `
                    SELECT 
                        work_plan_id,
                        process_number,
                        status,
                        timestamp
                    FROM logs 
                    WHERE work_plan_id = ?
                    AND DATE(timestamp) = ?
                    ORDER BY process_number, timestamp
                `;

                const timeResult = await query(logsSql, [item.work_plan_id, date]);
                
                // คำนวณเวลาและนับ logs จาก raw data
                let totalTimeMinutes = 0;
                let totalLogs = timeResult.length;
                let startLogs = 0;
                let stopLogs = 0;
                
                // นับ start และ stop logs
                timeResult.forEach(log => {
                    if (log.status === 'start') startLogs++;
                    if (log.status === 'stop') stopLogs++;
                });
                
                // คำนวณเวลาที่ใช้จาก start-stop pairs
                const logsByProcess = {};
                timeResult.forEach(log => {
                    if (!logsByProcess[log.process_number]) {
                        logsByProcess[log.process_number] = [];
                    }
                    logsByProcess[log.process_number].push(log);
                });
                
                Object.keys(logsByProcess).forEach(processNumber => {
                    const processLogs = logsByProcess[processNumber];
                    for (let i = 0; i < processLogs.length - 1; i++) {
                        const currentLog = processLogs[i];
                        const nextLog = processLogs[i + 1];
                        
                        if (currentLog.status === 'start' && nextLog.status === 'stop') {
                            const startTime = new Date(currentLog.timestamp);
                            const stopTime = new Date(nextLog.timestamp);
                            const diffMinutes = (stopTime - startTime) / (1000 * 60);
                            totalTimeMinutes += diffMinutes;
                        }
                    }
                });

                // คำนวณต้นทุนต่อหน่วยแสดงผล (ใช้ conversion rate)
                const costPerDisplayUnit = item.total_material_cost > 0 && item.good_qty > 0 
                    ? (item.total_material_cost / item.good_qty) * item.conversion_rate
                    : 0;

                // คำนวณสถานะการผลิต
                let productionStatus = 'pending';
                
                // Debug logging
                console.log(`🔍 Work Plan ${item.work_plan_id}: status_id=${item.status_id}, totalLogs=${totalLogs}, startLogs=${startLogs}, good_qty=${item.good_qty}, is_finished_flag=${item.is_finished_flag}`);
                
                if (item.status_id === 9) {
                    productionStatus = 'cancelled';
                    console.log(`  → Status: cancelled (status_id=9)`);
                } else if (item.is_finished_flag === 1) {
                    // ถ้ามี finished_flag = 1 แสดงว่าเสร็จสิ้น
                    productionStatus = 'completed';
                    console.log(`  → Status: completed (finished_flag = 1)`);
                } else if (totalLogs > 0) {
                    // ถ้ามี logs แสดงว่าเริ่มงานแล้ว
                    if (item.good_qty > 0) {
                        productionStatus = 'completed';
                        console.log(`  → Status: completed (has logs + good_qty > 0)`);
                    } else if (startLogs > 0) {
                        productionStatus = 'in_progress';
                        console.log(`  → Status: in_progress (has start logs)`);
                    }
                } else if (item.status_id === 4 && item.good_qty > 0) {
                    // ถ้า status_id = 4 และมีผลผลิต แสดงว่าเสร็จสิ้น
                    productionStatus = 'completed';
                    console.log(`  → Status: completed (status_id=4 + good_qty > 0)`);
                } else {
                    console.log(`  → Status: pending (no logs or no production)`);
                }

                return {
                    ...item,
                    time_used_minutes: totalTimeMinutes,
                    cost_per_display_unit: costPerDisplayUnit,
                    production_status: productionStatus
                };
            } catch (error) {
                console.error(`Error calculating time for work plan ${item.work_plan_id}:`, error);
                return {
                    ...item,
                    time_used_minutes: 0,
                    production_status: 'pending'
                };
            }
        }));

        res.json({
            success: true,
            data: resultsWithTime,
            count: resultsWithTime.length
        });
    } catch (error) {
        console.error('Error fetching cost summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cost summary',
            message: error.message
        });
    }
});

// GET /api/costs/detailed/:batchId - ข้อมูลต้นทุนแบบละเอียด
router.get('/detailed/:batchId', async (req, res) => {
	try {
		const { batchId } = req.params;
		
		// ดึงข้อมูลต้นทุนหลัก
		const costSql = `
			SELECT * FROM production_costs WHERE batch_id = ?
		`;
		
		const costResult = await query(costSql, [batchId]);
		
		if (costResult.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Cost data not found'
			});
		}
		
		const costData = costResult[0];
		
		// ดึงข้อมูลการใช้วัตถุดิบ
		const materialSql = `
			SELECT 
				bmu.*,
				m.Mat_Name,
				m.Mat_Unit
			FROM batch_material_usage bmu
			JOIN material m ON bmu.material_id = m.id
			WHERE bmu.batch_id = ?
		`;
		
		const materialData = await query(materialSql, [batchId]);
		
		// ดึงข้อมูลผลผลิต
		const productionSql = `
			SELECT * FROM batch_production_results WHERE batch_id = ?
		`;
		
		const productionData = await query(productionSql, [batchId]);
		
		const detailedData = {
			cost: costData,
			materials: materialData,
			production: productionData[0] || null,
			summary: {
				total_material_cost: materialData.reduce((sum, item) => sum + (parseFloat(item.actual_qty || 0) * parseFloat(item.unit_price || 0)), 0),
				total_labor_cost: parseFloat(costData.labor_cost || 0),
				total_loss_cost: parseFloat(costData.loss_cost || 0),
				total_utility_cost: parseFloat(costData.utility_cost || 0),
				total_cost: materialData.reduce((sum, item) => sum + (parseFloat(item.actual_qty || 0) * parseFloat(item.unit_price || 0)), 0) + 
					parseFloat(costData.labor_cost || 0) + 
					parseFloat(costData.loss_cost || 0) + 
					parseFloat(costData.utility_cost || 0)
			}
		};
		
		res.json({
			success: true,
			data: detailedData
		});
	} catch (error) {
		console.error('Error fetching detailed cost data:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch detailed cost data',
			message: error.message
		});
	}
});

// คำนวณเวลาที่ใช้จาก logs
router.get('/time-used/:workPlanId', async (req, res) => {
	try {
		const { workPlanId } = req.params;

		// ดึงข้อมูล logs ของ work_plan นี้
		const logsSql = `
			SELECT 
				l.process_number,
				l.status,
				l.timestamp,
				LAG(l.timestamp) OVER (PARTITION BY l.process_number ORDER BY l.timestamp) as prev_timestamp
			FROM logs l
			WHERE l.work_plan_id = ?
			ORDER BY l.process_number, l.timestamp
		`;

		const logs = await logsQuery(logsSql, [workPlanId]);

		// คำนวณเวลาที่ใช้ในแต่ละ process
		const processTimes = {};
		let totalTimeMinutes = 0;

		logs.forEach(log => {
			if (log.status === 'stop' && log.prev_timestamp) {
				const startTime = new Date(log.prev_timestamp);
				const endTime = new Date(log.timestamp);
				const durationMs = endTime - startTime;
				const durationMinutes = Math.round(durationMs / (1000 * 60));

				if (!processTimes[log.process_number]) {
					processTimes[log.process_number] = 0;
				}
				processTimes[log.process_number] += durationMinutes;
				totalTimeMinutes += durationMinutes;
			}
		});

		res.json({
			success: true,
			data: {
				work_plan_id: workPlanId,
				total_time_minutes: totalTimeMinutes,
				process_times: processTimes,
				logs_count: logs.length
			}
		});
	} catch (error) {
		console.error('Error calculating time used:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to calculate time used',
			message: error.message
		});
	}
});

// POST /api/costs/debug-logs - ตรวจสอบ logs แบบละเอียด
router.post('/debug-logs', async (req, res) => {
	try {
		const { work_plan_id } = req.body;
		
		if (!work_plan_id) {
			return res.status(400).json({ success: false, error: 'work_plan_id is required' });
		}

		// ดึง logs แบบละเอียด
		const logsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp,
				LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp,
				LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status
			FROM logs 
			WHERE work_plan_id = ?
			ORDER BY process_number, timestamp
		`;

		const logs = await logsQuery(logsSql, [work_plan_id]);

		// คำนวณเวลาที่ใช้แบบละเอียด
		const timeCalcSql = `
			WITH time_calc AS (
				SELECT
					process_number,
					status,
					timestamp,
					LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status,
					LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp
				FROM logs 
				WHERE work_plan_id = ?
			)
			SELECT 
				process_number,
				status,
				timestamp,
				prev_status,
				prev_timestamp,
				CASE 
					WHEN status = 'stop' AND prev_status = 'start' 
					THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
					ELSE 0 
				END as duration_minutes
			FROM time_calc
			ORDER BY process_number, timestamp
		`;

		const timeCalc = await logsQuery(timeCalcSql, [work_plan_id]);

		// สรุปเวลารวม
		const totalTimeSql = `
			SELECT 
				SUM(
					CASE 
						WHEN status = 'stop' AND prev_status = 'start' 
						THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
						ELSE 0 
					END
				) as total_minutes
			FROM (
				SELECT
					status,
					timestamp,
					LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status,
					LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp
				FROM logs 
				WHERE work_plan_id = ?
			) time_data
		`;

		const totalTime = await logsQuery(totalTimeSql, [work_plan_id]);

		res.json({
			success: true,
			data: {
				work_plan_id,
				logs,
				time_calculation: timeCalc,
				total_minutes: totalTime[0]?.total_minutes || 0
			}
		});
	} catch (error) {
		console.error('Error debugging logs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to debug logs',
			message: error.message
		});
	}
});

// GET /api/costs/debug-logs-simple - ตรวจสอบ logs แบบง่าย
router.get('/debug-logs-simple/:work_plan_id', async (req, res) => {
	try {
		const { work_plan_id } = req.params;
		const { date } = req.query;
		
		if (!work_plan_id) {
			return res.status(400).json({ success: false, error: 'work_plan_id is required' });
		}

		// ดึง logs แบบง่าย - กรองตามวันที่ถ้ามี
		let logsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp
			FROM logs 
			WHERE work_plan_id = ?
		`;
		
		let params = [work_plan_id];
		
		if (date) {
			logsSql += ` AND DATE(timestamp) = ?`;
			params.push(date);
		}
		
		logsSql += ` ORDER BY process_number, timestamp`;

		const logs = await logsQuery(logsSql, params);

		// คำนวณเวลารวมแบบง่าย - กรองตามวันที่ถ้ามี
		let totalTimeSql = `
			WITH time_calc AS (
				SELECT
					process_number,
					status,
					timestamp,
					LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status,
					LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp
				FROM logs 
				WHERE work_plan_id = ?
		`;
		
		params = [work_plan_id];
		
		if (date) {
			totalTimeSql += ` AND DATE(timestamp) = ?`;
			params.push(date);
		}
		
		totalTimeSql += `
			)
			SELECT 
				SUM(
					CASE 
						WHEN status = 'stop' AND prev_status = 'start' 
						THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
						ELSE 0 
					END
				) as total_minutes
			FROM time_calc
		`;

		const totalTime = await logsQuery(totalTimeSql, params);

		res.json({
			success: true,
			data: {
				work_plan_id,
				logs,
				total_minutes: totalTime[0]?.total_minutes || 0
			}
		});
	} catch (error) {
		console.error('Error debugging logs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to debug logs',
			message: error.message
		});
	}
});

// ทดสอบดึงข้อมูล logs ทั้งหมด
router.get('/logs-test', async (req, res) => {
	try {
		const limit = parseInt(req.query.limit) || 1000;
		const offset = parseInt(req.query.offset) || 0;
		
		const sql = `
			WITH time_calc AS (
				SELECT 
					inner_l.work_plan_id,
					inner_l.process_number,
					MIN(CASE WHEN inner_l.status = 'start' THEN inner_l.timestamp END) AS actual_start_time,
					MAX(CASE WHEN inner_l.status = 'stop' THEN inner_l.timestamp END) AS actual_end_time,
					SUM(
						CASE 
							WHEN inner_l.status = 'stop' AND inner_l.prev_status = 'start'
							THEN TIMESTAMPDIFF(MINUTE, inner_l.prev_timestamp, inner_l.timestamp)
							ELSE 0
						END
					) AS actual_total_minutes
				FROM (
					SELECT 
						l.work_plan_id,
						l.process_number,
						l.status,
						l.timestamp,
						LAG(l.status) OVER (PARTITION BY l.work_plan_id, l.process_number ORDER BY l.timestamp) AS prev_status,
						LAG(l.timestamp) OVER (PARTITION BY l.work_plan_id, l.process_number ORDER BY l.timestamp) AS prev_timestamp
					FROM logs l
				) inner_l
				GROUP BY inner_l.work_plan_id, inner_l.process_number
			)
			SELECT 
				l.id,
				l.work_plan_id,
				l.batch_id,
				l.process_number,
				l.status,
				l.timestamp,
				DATE(l.timestamp) as date_only,
				TIME(l.timestamp) as time_only,
				wp.job_code,
				wp.job_name,
				wp.production_date,
				CONCAT(wp.production_date, ' ', wp.start_time) as planned_start_time,
				CONCAT(wp.production_date, ' ', wp.end_time) as planned_end_time,
				TIMESTAMPDIFF(MINUTE, wp.start_time, wp.end_time) as planned_total_minutes,
				tc.actual_start_time,
				tc.actual_end_time,
				tc.actual_total_minutes
			FROM logs l
			LEFT JOIN work_plans wp ON l.work_plan_id = wp.id
			LEFT JOIN time_calc tc ON l.work_plan_id = tc.work_plan_id AND l.process_number = tc.process_number
			ORDER BY l.timestamp DESC
			LIMIT ${limit} OFFSET ${offset}
		`;

		const logs = await logsQuery(sql);

		// ดึงจำนวน logs ทั้งหมด
		const countSql = `SELECT COUNT(*) as total FROM logs`;
		const countResult = await logsQuery(countSql);
		const totalCount = countResult[0].total;

		res.json({
			success: true,
			data: logs,
			count: logs.length,
			total: totalCount,
			limit: limit,
			offset: offset
		});
	} catch (error) {
		console.error('Error fetching logs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch logs',
			message: error.message
		});
	}
});

// สรุปเวลาใช้งานจาก logs จัดกลุ่มตามงาน (job_code) และวันที่ผลิต (ต่อแถวละ work_plan)
// GET /api/costs/logs-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&job_code=optional
router.get('/logs-summary', async (req, res) => {
	try {
		let { from, to, job_code, job_name } = req.query;
		
		if (!from && !to) {
			return res.status(400).json({ success: false, error: 'at least one of "from" or "to" is required' });
		}
		// รองรับส่งมาแค่วันเดียว
		if (from && !to) to = from;
		if (!from && to) from = to;

		const params = [from, to];
		let jobCodeClause = '';
		let jobNameClause = '';
		if (job_code) {
			jobCodeClause = ' AND wp.job_code = ? ';
			params.push(job_code);
		}
		if (job_name) {
			jobNameClause = ' AND wp.job_name LIKE ? ';
			params.push(`%${job_name}%`);
		}

		// เลือกลำดับการเรียง
		const isSameDay = from === to;
		let orderBy = `
			ORDER BY 
				wp.start_time IS NULL ASC,
				wp.start_time ASC,
				CASE WHEN COALESCE(JSON_UNQUOTE(JSON_EXTRACT(wp.operators,'$[0].name')), '') LIKE 'อ%' THEN 0 ELSE 1 END ASC,
				operator_first_json_name ASC,
				wp.id ASC
		`;
		if (!isSameDay || job_code || job_name) {
			orderBy = `
			ORDER BY 
				DATE(wp.production_date) ASC,
				wp.start_time IS NULL ASC,
				wp.start_time ASC,
				wp.id ASC
			`;
		}

		// คำนวณเวลารวมต่อ work_plan จาก logs ด้วย window function
		const sql = `
			WITH time_calc AS (
				SELECT 
					inner_l.work_plan_id,
					MIN(CASE WHEN inner_l.status = 'start' THEN inner_l.timestamp END) AS actual_start_time,
					MAX(CASE WHEN inner_l.status = 'stop' THEN inner_l.timestamp END) AS actual_end_time,
					SUM(
						CASE 
							WHEN inner_l.status = 'stop' AND inner_l.prev_status = 'start'
							THEN TIMESTAMPDIFF(MINUTE, inner_l.prev_timestamp, inner_l.timestamp)
							ELSE 0
						END
					) AS time_used_minutes
				FROM (
					SELECT 
						l.work_plan_id,
						l.process_number,
						l.status,
						l.timestamp,
						LAG(l.status) OVER (PARTITION BY l.work_plan_id, l.process_number ORDER BY l.timestamp) AS prev_status,
						LAG(l.timestamp) OVER (PARTITION BY l.work_plan_id, l.process_number ORDER BY l.timestamp) AS prev_timestamp
					FROM logs l
				) inner_l
				GROUP BY inner_l.work_plan_id
			)
			SELECT 
				wp.id AS work_plan_id,
				wp.job_code,
				wp.job_name,
				DATE(wp.production_date) AS production_date,
				CASE 
					WHEN wp.start_time IS NOT NULL AND wp.end_time IS NOT NULL 
					THEN CONCAT(wp.production_date, ' ', wp.start_time)
					ELSE NULL
				END AS planned_start_time,
				CASE 
					WHEN wp.start_time IS NOT NULL AND wp.end_time IS NOT NULL 
					THEN CONCAT(wp.production_date, ' ', wp.end_time)
					ELSE NULL
				END AS planned_end_time,
				CASE 
					WHEN wp.start_time IS NOT NULL AND wp.end_time IS NOT NULL 
					THEN TIMESTAMPDIFF(MINUTE, wp.start_time, wp.end_time)
					ELSE NULL
				END AS planned_total_minutes,
				tc.actual_start_time,
				tc.actual_end_time,
				COALESCE(tc.time_used_minutes, 0) AS time_used_minutes,
				COUNT(DISTINCT l.id) AS logs_count,
				-- หากมีการผูก operator ผ่านตาราง ให้ใช้เป็น fallback
				GROUP_CONCAT(DISTINCT COALESCE(u.name, wpo.id_code) ORDER BY COALESCE(u.name, wpo.id_code) SEPARATOR ', ') AS operators_fallback,
				wp.operators AS operators_json,
				JSON_UNQUOTE(JSON_EXTRACT(wp.operators,'$[0].name')) AS operator_first_json_name
			FROM work_plans wp
			LEFT JOIN time_calc tc ON tc.work_plan_id = wp.id
			LEFT JOIN logs l ON l.work_plan_id = wp.id
			LEFT JOIN work_plan_operators wpo ON wpo.work_plan_id = wp.id
			LEFT JOIN users u ON u.id = wpo.user_id
			WHERE DATE(wp.production_date) BETWEEN ? AND ?
			${jobCodeClause}
			${jobNameClause}
			GROUP BY wp.id, wp.job_code, wp.job_name, wp.production_date, wp.start_time, wp.end_time, tc.actual_start_time, tc.actual_end_time, tc.time_used_minutes, wp.operators
			${orderBy}
		`;

		const rows = await logsQuery(sql, params);

		// ปรับค่าผู้ปฏิบัติงาน ให้ดึงจาก wp.operators (JSON/กึ่ง JSON) ก่อน ถ้าไม่มีจึงใช้ fallback
		const tryParseOperators = (raw) => {
			if (!raw) return null;
			if (Array.isArray(raw)) return raw;
			if (typeof raw === 'object') return raw; // already parsed JSON
			// raw บางฐานข้อมูลเก็บเป็นสตริงที่มี single quote ซึ่งไม่ใช่ JSON มาตรฐาน
			// พยายาม parse แบบปกติ ก่อน
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed : null;
			} catch (_) {
				// ลองแปลง single quotes -> double quotes แบบปลอดภัยเบื้องต้น
				try {
					const normalized = String(raw)
						.replace(/\\'/g, "'")
						.replace(/'\s*:\s*'/g, '":"')
						.replace(/'\s*:\s*\{/g, '":{')
						.replace(/\{\s*'/g, '{"')
						.replace(/',\s*'/g, '","')
						.replace(/'\s*\}/g, '"}')
						.replace(/^\s*'|"?\s*$/g, '');
					const fixQuotes = normalized.replace(/'/g, '"');
					const parsed = JSON.parse(fixQuotes);
					return Array.isArray(parsed) ? parsed : null;
				} catch (__){
					return null;
				}
			}
		};

		const normalized = (rows || []).map(r => {
			let operators = r.operators_fallback || '';
			const parsed = tryParseOperators(r.operators_json);
			if (parsed) {
				const pickName = (o) => {
					if (!o || typeof o !== 'object') return '';
					for (const key of ['name', 'Name', 'full_name', 'fullname', 'display_name', 'th_name', 'thai_name']) {
						if (typeof o[key] === 'string' && o[key].trim()) return o[key].trim();
					}
					if (typeof o.id_code === 'string' && o.id_code.trim()) return o.id_code.trim();
					return '';
				};
				const names = parsed.map(pickName).filter(Boolean);
				if (names.length > 0) operators = names.join(', ');
			}
			return {
				...r,
				operators
			};
		});
		return res.json({ success: true, data: normalized, count: normalized.length });
	} catch (error) {
		console.error('Error fetching logs summary:', error);
		return res.status(500).json({ success: false, error: 'Failed to fetch logs summary', message: error.message });
	}
});

// ค้นหาแนะนำชื่องาน/รหัสงานจาก work_plans สำหรับ autocomplete
// GET /api/costs/logs-job-suggest?q=คำค้น&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/logs-job-suggest', async (req, res) => {
    try {
        const { q, from, to } = req.query;
        if (!q || !from || !to) {
            return res.status(400).json({ success: false, error: 'q, from, to are required' });
        }

        const sql = `
            SELECT 
                wp.job_code,
                wp.job_name,
                COUNT(*) AS cnt,
                MAX(DATE(wp.production_date)) AS last_date
            FROM work_plans wp
            WHERE DATE(wp.production_date) BETWEEN ? AND ?
              AND (wp.job_name LIKE ? OR wp.job_code LIKE ?)
            GROUP BY wp.job_code, wp.job_name
            ORDER BY last_date DESC, cnt DESC
            LIMIT 10
        `;
        const like = `%${q}%`;
        const rows = await logsQuery(sql, [from, to, like, like]);
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching job suggestions:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch job suggestions' });
    }
});

// GET /api/costs/check-logs - ตรวจสอบข้อมูลล่าสุดใน logs database
router.get('/check-logs', async (req, res) => {
	try {
		// ดึง logs ล่าสุด 20 รายการ
		const latestLogsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp,
				DATE(timestamp) as log_date
			FROM logs 
			ORDER BY timestamp DESC
			LIMIT 20
		`;

		const latestLogs = await logsQuery(latestLogsSql);

		// สำหรับ debug - สามารถส่ง work_plan_id และ date เป็น query parameters
		const { work_plan_id, date } = req.query;
		
		let wp482Logs = [];
		let dateLogs = [];
		
		if (work_plan_id) {
			const wp482LogsSql = `
				SELECT 
					id,
					work_plan_id,
					process_number,
					status,
					timestamp,
					DATE(timestamp) as log_date
				FROM logs 
				WHERE work_plan_id = ?
				ORDER BY timestamp DESC
			`;
			wp482Logs = await logsQuery(wp482LogsSql, [work_plan_id]);
		}

		if (date) {
			const dateLogsSql = `
				SELECT 
					id,
					work_plan_id,
					process_number,
					status,
					timestamp
				FROM logs 
				WHERE DATE(timestamp) = ?
				ORDER BY timestamp DESC
			`;
			dateLogs = await logsQuery(dateLogsSql, [date]);
		}

		res.json({
			success: true,
			data: {
				latest_logs: latestLogs,
				filtered_work_plan_logs: wp482Logs,
				filtered_date_logs: dateLogs,
				summary: {
					total_logs: latestLogs.length,
					filtered_work_plan_count: wp482Logs.length,
					filtered_date_count: dateLogs.length
				}
			}
		});
	} catch (error) {
		console.error('Error checking logs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to check logs',
			message: error.message
		});
	}
});

// GET /api/costs/check-new-db-logs - ตรวจสอบ logs ใน Database ใหม่
router.get('/check-new-db-logs', async (req, res) => {
	try {
		// ดึง logs ล่าสุด 20 รายการจาก Database ใหม่
		const latestLogsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp,
				DATE(timestamp) as log_date
			FROM logs 
			ORDER BY timestamp DESC
			LIMIT 20
		`;

		const latestLogs = await query(latestLogsSql);

		// สำหรับ debug - สามารถส่ง work_plan_id และ date เป็น query parameters  
		const { work_plan_id, date } = req.query;
		
		let wp482Logs = [];
		let dateLogs = [];
		
		if (work_plan_id) {
			const wp482LogsSql = `
				SELECT 
					id,
					work_plan_id,
					process_number,
					status,
					timestamp,
					DATE(timestamp) as log_date
				FROM logs 
				WHERE work_plan_id = ?
				ORDER BY timestamp DESC
			`;
			wp482Logs = await query(wp482LogsSql, [work_plan_id]);
		}

		if (date) {
			const dateLogsSql = `
				SELECT 
					id,
					work_plan_id,
					process_number,
					status,
					timestamp
				FROM logs 
				WHERE DATE(timestamp) = ?
				ORDER BY timestamp DESC
			`;
			dateLogs = await query(dateLogsSql, [date]);
		}

		res.json({
			success: true,
			data: {
				latest_logs: latestLogs,
				filtered_work_plan_logs: wp482Logs,
				filtered_date_logs: dateLogs,
				summary: {
					total_logs: latestLogs.length,
					filtered_work_plan_count: wp482Logs.length,
					filtered_date_count: dateLogs.length
				}
			}
		});
	} catch (error) {
		console.error('Error checking new DB logs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to check new DB logs',
			message: error.message
		});
	}
});

// GET /api/costs/fg-conversion-rates - ดึงข้อมูล conversion rates ของ FG
router.get('/fg-conversion-rates', async (req, res) => {
	try {
		const sql = `
			SELECT 
				id,
				FG_Code,
				FG_Name,
				FG_Unit,
				base_unit,
				conversion_rate,
				conversion_description
			FROM fg
			WHERE conversion_rate IS NOT NULL
			ORDER BY FG_Code
		`;

		const results = await query(sql);
		res.json({ success: true, data: results });
	} catch (error) {
		console.error('Error fetching FG conversion rates:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch FG conversion rates',
			message: error.message
		});
	}
});

// POST /api/costs/fg-conversion-rates - สร้างหรืออัพเดท conversion rate ของ FG ตาม FG_Code
router.post('/fg-conversion-rates', async (req, res) => {
    try {
        const { FG_Code, FG_Name, FG_Unit, base_unit, conversion_rate, conversion_description } = req.body || {};
        if (!FG_Code || !FG_Unit || !base_unit || conversion_rate == null) {
            return res.status(400).json({ success: false, error: 'Missing required fields (FG_Code, FG_Unit, base_unit, conversion_rate)' });
        }

        // ทำ upsert แบบ manual ตาม FG_Code (ไม่พึ่ง unique index)
        const exists = await query('SELECT id, FG_Size FROM fg WHERE FG_Code = ? LIMIT 1', [FG_Code]);
        if (exists.length > 0) {
            const size = exists[0].FG_Size || '';
            await query(
                `UPDATE fg SET FG_Name = ?, FG_Unit = ?, FG_Size = ?, base_unit = ?, conversion_rate = ?, conversion_description = ? WHERE FG_Code = ?`,
                [FG_Name || '', FG_Unit, size, base_unit, Number(conversion_rate), conversion_description || null, FG_Code]
            );
        } else {
            await query(
                `INSERT INTO fg (FG_Code, FG_Name, FG_Unit, FG_Size, base_unit, conversion_rate, conversion_description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [FG_Code, FG_Name || '', FG_Unit, '', base_unit, Number(conversion_rate), conversion_description || null]
            );
        }

        return res.json({ success: true, message: 'FG conversion rate saved (by FG_Code)' });
    } catch (error) {
        console.error('Error saving FG conversion rate:', error);
        return res.status(500).json({ success: false, error: 'Failed to save FG conversion rate', message: error.message });
    }
});

// PUT /api/costs/fg-conversion-rates/:id - อัพเดท conversion rate ตาม id
router.put('/fg-conversion-rates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { FG_Unit, base_unit, conversion_rate, conversion_description } = req.body || {};
        if (!id) return res.status(400).json({ success: false, error: 'Missing id' });

        const updateSql = `
            UPDATE fg SET
                FG_Unit = COALESCE(?, FG_Unit),
                base_unit = COALESCE(?, base_unit),
                conversion_rate = COALESCE(?, conversion_rate),
                conversion_description = COALESCE(?, conversion_description)
            WHERE id = ?
        `;
        const result = await query(updateSql, [FG_Unit || null, base_unit || null, conversion_rate != null ? Number(conversion_rate) : null, conversion_description || null, id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'FG not found' });
        return res.json({ success: true, message: 'FG conversion rate updated' });
    } catch (error) {
        console.error('Error updating FG conversion rate:', error);
        return res.status(500).json({ success: false, error: 'Failed to update FG conversion rate', message: error.message });
    }
});

// DELETE /api/costs/fg-conversion-rates/:id - รีเซ็ต conversion rate เป็น 1.0000
router.delete('/fg-conversion-rates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, error: 'Missing id' });
        const resetSql = `UPDATE fg SET conversion_rate = 1.0000, conversion_description = NULL WHERE id = ?`;
        const result = await query(resetSql, [id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'FG not found' });
        return res.json({ success: true, message: 'FG conversion rate reset to 1.0000' });
    } catch (error) {
        console.error('Error deleting FG conversion rate:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete FG conversion rate', message: error.message });
    }
});

// GET /api/costs/fg/search?q=...
router.get('/fg/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ success: true, data: [] });
        const like = `%${q}%`;
        const rows = await query(
            `SELECT id, FG_Code, FG_Name, FG_Unit, FG_Size, base_unit, conversion_rate, conversion_description
             FROM fg
             WHERE FG_Code LIKE ? OR FG_Name LIKE ?
             ORDER BY FG_Code
             LIMIT 50`,
            [like, like]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error searching FG:', error);
        return res.status(500).json({ success: false, error: 'Failed to search FG', message: error.message });
    }
});

// POST /api/costs/fg - สร้าง FG ใหม่อย่างง่าย
router.post('/fg', async (req, res) => {
    try {
        const { FG_Code, FG_Name, FG_Unit, FG_Size, base_unit, conversion_rate, conversion_description } = req.body || {};
        if (!FG_Code || !FG_Name || !FG_Unit) {
            return res.status(400).json({ success: false, error: 'Missing required fields (FG_Code, FG_Name, FG_Unit)' });
        }
        // manual upsert by FG_Code
        const exists = await query('SELECT id FROM fg WHERE FG_Code = ? LIMIT 1', [FG_Code]);
        if (exists.length > 0) {
            await query(
                `UPDATE fg SET FG_Name = ?, FG_Unit = ?, FG_Size = ?, base_unit = COALESCE(?, base_unit), conversion_rate = COALESCE(?, conversion_rate), conversion_description = COALESCE(?, conversion_description) WHERE FG_Code = ?`,
                [FG_Name, FG_Unit, FG_Size || '', base_unit || null, conversion_rate != null ? Number(conversion_rate) : null, conversion_description || null, FG_Code]
            );
        } else {
            await query(
                `INSERT INTO fg (FG_Code, FG_Name, FG_Unit, FG_Size, base_unit, conversion_rate, conversion_description) VALUES (?, ?, ?, ?, COALESCE(?, 'กก.'), COALESCE(?, 1.0000), ?)`,
                [FG_Code, FG_Name, FG_Unit, FG_Size || '', base_unit || 'กก.', conversion_rate != null ? Number(conversion_rate) : 1.0000, conversion_description || null]
            );
        }
        return res.json({ success: true, message: 'FG created/updated (by FG_Code)' });
    } catch (error) {
        console.error('Error creating FG:', error);
        return res.status(500).json({ success: false, error: 'Failed to create FG', message: error.message });
    }
});

// GET /api/costs/material-conversion-rates - ดึงข้อมูล conversion rates ของวัตถุดิบ
router.get('/material-conversion-rates', async (req, res) => {
	try {
		const sql = `
			SELECT 
				id,
				from_unit,
				to_unit,
				conversion_rate,
				description,
				material_name,
				material_pattern,
				Mat_Id
			FROM unit_conversions
			ORDER BY from_unit, conversion_rate
		`;

		const results = await query(sql);
		res.json({ success: true, data: results });
	} catch (error) {
		console.error('Error fetching material conversion rates:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch material conversion rates',
			message: error.message
		});
	}
});

// POST /api/costs/material-conversion-rates - เพิ่มค่าแปลงหน่วยใหม่
router.post('/material-conversion-rates', async (req, res) => {
	try {
		const { from_unit, to_unit, conversion_rate, description, material_name, material_pattern, Mat_Id } = req.body;
		
		if (!from_unit || !to_unit || !conversion_rate) {
			return res.status(400).json({ success: false, error: 'Missing required fields' });
		}

		const sql = `
			INSERT INTO unit_conversions 
			(from_unit, to_unit, conversion_rate, description, material_name, material_pattern, Mat_Id)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`;

		const result = await query(sql, [from_unit, to_unit, conversion_rate, description, material_name, material_pattern, Mat_Id]);
		
		res.json({ 
			success: true, 
			data: { id: result.insertId },
			message: 'เพิ่มค่าแปลงหน่วยสำเร็จ'
		});
	} catch (error) {
		console.error('Error creating material conversion rate:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create material conversion rate',
			message: error.message
		});
	}
});

// PUT /api/costs/material-conversion-rates/:id - อัพเดทค่าแปลงหน่วย
router.put('/material-conversion-rates/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const { from_unit, to_unit, conversion_rate, description, material_name, material_pattern, Mat_Id } = req.body;
		
		if (!from_unit || !to_unit || !conversion_rate) {
			return res.status(400).json({ success: false, error: 'Missing required fields' });
		}

		const sql = `
			UPDATE unit_conversions 
			SET from_unit = ?, to_unit = ?, conversion_rate = ?, description = ?, 
				material_name = ?, material_pattern = ?, Mat_Id = ?
			WHERE id = ?
		`;

		const result = await query(sql, [from_unit, to_unit, conversion_rate, description, material_name, material_pattern, Mat_Id, id]);
		
		if (result.affectedRows === 0) {
			return res.status(404).json({ success: false, error: 'Conversion rate not found' });
		}
		
		res.json({ 
			success: true, 
			message: 'อัพเดทค่าแปลงหน่วยสำเร็จ'
		});
	} catch (error) {
		console.error('Error updating material conversion rate:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update material conversion rate',
			message: error.message
		});
	}
});

// DELETE /api/costs/material-conversion-rates/:id - ลบค่าแปลงหน่วย
router.delete('/material-conversion-rates/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const sql = `DELETE FROM unit_conversions WHERE id = ?`;
		const result = await query(sql, [id]);
		
		if (result.affectedRows === 0) {
			return res.status(404).json({ success: false, error: 'Conversion rate not found' });
		}
		
		res.json({ 
			success: true, 
			message: 'ลบค่าแปลงหน่วยสำเร็จ'
		});
	} catch (error) {
		console.error('Error deleting material conversion rate:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete material conversion rate',
			message: error.message
		});
	}
});

module.exports = router;
