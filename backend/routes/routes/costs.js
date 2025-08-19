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
					SUM(actual_qty) as input_material_qty,
					SUM(total_cost) as material_cost,
					MIN(unit) as unit,
					-- คำนวณน้ำหนักรวมในหน่วยกก.
					SUM(
						CASE 
							WHEN bmu.unit = 'กก.' THEN bmu.actual_qty
							WHEN bmu.unit = 'แพ็ค' THEN 
								CASE 
									WHEN m.Mat_Name LIKE '%SanWu%' THEN bmu.actual_qty * 0.150
									WHEN m.Mat_Name LIKE '%ให้ตี๋เหล่า%' THEN bmu.actual_qty * 0.200
									ELSE bmu.actual_qty * 0.150 -- ค่าเริ่มต้น
								END
							ELSE bmu.actual_qty -- ถ้าไม่มี conversion rate ให้ใช้ค่าวัตถุดิบ
						END
					) as total_weight_kg
				FROM batch_material_usage bmu
				LEFT JOIN material m ON bmu.material_id = m.id
				WHERE bmu.batch_id = ?
			`, [batch_id]);
			const materialAgg = materialAggRows[0] || { input_material_qty: 0, material_cost: 0, unit: null, total_weight_kg: 0 };
			
			// ดึงข้อมูลผลผลิต
			const [prodRows] = await connection.execute(`
				SELECT good_qty as output_qty, total_qty
				FROM batch_production_results
				WHERE batch_id = ?
			`, [batch_id]);
			const productionData = prodRows[0] || { output_qty: 0, total_qty: 0 };
			
			// คำนวณเวลาการผลิต - ใช้ work_plan_id แทน batch_id
			const [timeRows] = await connection.execute(`
				SELECT 
					SUM(
						CASE 
							WHEN l.status = 'stop' AND l_prev.status = 'start' 
							THEN TIMESTAMPDIFF(MINUTE, l_prev.timestamp, l.timestamp)
							ELSE 0 
						END
					) as time_used_minutes
				FROM logs l 
				LEFT JOIN logs l_prev ON l.work_plan_id = l_prev.work_plan_id 
					AND l.process_number = l_prev.process_number 
					AND l_prev.timestamp < l.timestamp
				WHERE l.work_plan_id = ?
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
                    SUM(total_cost) as material_cost,
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

            // ผลผลิต
            const [prodRows] = await connection.execute(`
                SELECT good_qty as output_qty, total_qty
                FROM batch_production_results
                WHERE batch_id = ?
            `, [batch_id]);
            const productionData = prodRows[0] || { output_qty: 0, total_qty: 0 };

            // เวลา
            const [timeRows] = await connection.execute(`
                SELECT 
                    SUM(
                        CASE 
                            WHEN l.status = 'stop' AND l_prev.status = 'start' 
                            THEN TIMESTAMPDIFF(MINUTE, l_prev.timestamp, l.timestamp)
                            ELSE 0 
                        END
                    ) as time_used_minutes
                FROM logs l 
                LEFT JOIN logs l_prev ON l.work_plan_id = l_prev.work_plan_id 
                    AND l.process_number = l_prev.process_number 
                    AND l_prev.timestamp < l.timestamp
                WHERE l.work_plan_id = ?
            `, [work_plan_id]);
            const timeData = timeRows[0] || { time_used_minutes: 0 };

            // จำนวน Operator ที่วางแผนไว้จาก work plan (operators JSON)
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
                console.log('History saved successfully for batch:', batch_id);
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

// GET /api/costs/summary - สรุปต้นทุนตามวันที่
router.get('/summary', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date parameter is required'
            });
        }

        // ดึงข้อมูลรายงานต้นทุนรายวัน
        const sql = `
            SELECT
                pb.id as batch_id,
                pb.batch_code,
                pb.status,
                wp.id as work_plan_id,
                wp.job_code,
                wp.job_name,
                wp.production_date,

                -- ข้อมูลผลผลิต
                bpr.good_qty,
                bpr.defect_qty,
                bpr.total_qty,
                bpr.good_secondary_qty,
                bpr.good_secondary_unit,

                -- ข้อมูลวัตถุดิบ
                COALESCE(material_data.total_material_qty, 0) as total_material_qty,
                COALESCE(material_data.total_material_cost, 0) as total_material_cost,
                COALESCE(material_data.cost_per_unit, 0) as cost_per_unit,
                COALESCE(material_data.unit, 'กก.') as unit,

                -- ข้อมูล conversion rate
                COALESCE(fg.base_unit, 'กก.') as base_unit,
                COALESCE(fg.conversion_rate, 1.0000) as conversion_rate,
                COALESCE(fg.conversion_description, '1 กก. = 1 กก.') as conversion_description,
                COALESCE(fg.FG_Unit, 'กก.') as display_unit,

                -- ข้อมูลน้ำหนักรวม
                COALESCE(material_data.total_weight_kg, 0) as total_weight_kg,

                -- จำนวน Operator จาก work plan (operators เป็น JSON)
                JSON_LENGTH(wp.operators) as operators_count,

                -- ข้อมูลที่บันทึกไว้ (ถ้ามี)
                pc.output_unit_cost as saved_output_unit_cost,
                pc.time_used_minutes as saved_time_used_minutes,
                pc.updated_at as saved_updated_at,
                pc.notes as saved_notes

            FROM production_batches pb
            JOIN work_plans wp ON pb.work_plan_id = wp.id
            LEFT JOIN batch_production_results bpr ON pb.id = bpr.batch_id

            -- Subquery สำหรับข้อมูลวัตถุดิบ (รวม conversion rates)
            LEFT JOIN (
                SELECT
                    bmu.batch_id,
                    SUM(bmu.actual_qty) as total_material_qty,
                    SUM(bmu.actual_qty * bmu.unit_price) as total_material_cost,
                    CASE
                        WHEN SUM(bmu.actual_qty) > 0
                        THEN SUM(bmu.actual_qty * bmu.unit_price) / SUM(bmu.actual_qty)
                        ELSE 0
                    END as cost_per_unit,
                    MAX(bmu.unit) as unit,
                    -- คำนวณน้ำหนักรวมในหน่วยกก.
                    SUM(
                        CASE 
                            WHEN bmu.unit = 'กก.' THEN bmu.actual_qty
                            WHEN bmu.unit = 'แพ็ค' THEN 
                                CASE 
                                    WHEN m.Mat_Name LIKE '%SanWu%' THEN bmu.actual_qty * 0.150
                                    WHEN m.Mat_Name LIKE '%ให้ตี๋เหล่า%' THEN bmu.actual_qty * 0.200
                                    ELSE bmu.actual_qty * 0.150 -- ค่าเริ่มต้น
                                END
                            ELSE bmu.actual_qty -- ถ้าไม่มี conversion rate ให้ใช้ค่าวัตถุดิบ
                        END
                    ) as total_weight_kg
                FROM batch_material_usage bmu
                LEFT JOIN material m ON bmu.material_id = m.id
                GROUP BY bmu.batch_id
            ) material_data ON pb.id = material_data.batch_id

            -- JOIN กับตาราง fg เพื่อดึงข้อมูล conversion rate
            LEFT JOIN fg ON pb.fg_code = fg.FG_Code
            LEFT JOIN production_costs pc ON pc.batch_id = pb.id AND pc.production_date = wp.production_date

            WHERE DATE(wp.production_date) = ?
            AND pb.status = 'completed'
            ORDER BY wp.job_code, pb.created_at
        `;

        const results = await query(sql, [date]);

        // คำนวณเวลาที่ใช้สำหรับแต่ละ batch
        const resultsWithTime = await Promise.all(results.map(async (item) => {
            try {
                // ดึงข้อมูล logs ของ work plan นี้ - ใช้ Database ใหม่
                const logsSql = `
                    WITH time_calc AS (
                        SELECT 
                            l.work_plan_id,
                            l.process_number,
                            l.status,
                            l.timestamp,
                            LAG(l.status) OVER (PARTITION BY l.work_plan_id, l.process_number ORDER BY l.timestamp) as prev_status,
                            LAG(l.timestamp) OVER (PARTITION BY l.work_plan_id, l.process_number ORDER BY l.timestamp) as prev_timestamp
                        FROM logs l
                        WHERE l.work_plan_id = ?
                        AND DATE(l.timestamp) = ?
                    )
                    SELECT 
                        SUM(
                            CASE 
                                WHEN status = 'stop' AND prev_status = 'start' 
                                THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
                                ELSE 0 
                            END
                        ) as time_used_minutes
                    FROM time_calc
                `;

                const timeResult = await query(logsSql, [item.work_plan_id, date]);
                const totalTimeMinutes = Number(timeResult[0]?.time_used_minutes || 0);

                // คำนวณต้นทุนต่อหน่วยแสดงผล (ใช้ conversion rate)
                const costPerDisplayUnit = item.total_material_cost > 0 && item.good_qty > 0 
                    ? (item.total_material_cost / item.good_qty) * item.conversion_rate
                    : 0;

                return {
                    ...item,
                    time_used_minutes: totalTimeMinutes,
                    cost_per_display_unit: costPerDisplayUnit
                };
            } catch (error) {
                console.error(`Error calculating time for work plan ${item.work_plan_id}:`, error);
                return {
                    ...item,
                    time_used_minutes: 0
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
				total_material_cost: materialData.reduce((sum, item) => sum + parseFloat(item.total_cost), 0),
				total_labor_cost: parseFloat(costData.labor_cost || 0),
				total_loss_cost: parseFloat(costData.loss_cost || 0),
				total_utility_cost: parseFloat(costData.utility_cost || 0),
				total_cost: parseFloat(costData.labor_cost || 0) + 
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
router.get('/time-used/:batchId', async (req, res) => {
	try {
		const { batchId } = req.params;

		// ดึงข้อมูล logs ของ batch นี้ - ใช้ work_plan_id แทน batch_id
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

		const logs = await logsQuery(logsSql, [batchId]);

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
				batch_id: batchId,
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
		const sql = `
			SELECT 
				l.id,
				l.work_plan_id,
				l.process_number,
				l.status,
				l.timestamp,
				wp.job_code,
				wp.job_name
			FROM logs l
			LEFT JOIN work_plans wp ON l.work_plan_id = wp.id
			ORDER BY l.timestamp DESC
			LIMIT 20
		`;

		const logs = await logsQuery(sql);

		res.json({
			success: true,
			data: logs,
			count: logs.length
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

		// คำนวณเวลารวมต่อ work_plan จาก logs ด้วย window function
		const sql = `
			WITH time_calc AS (
				SELECT 
					inner_l.work_plan_id,
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
				COALESCE(tc.time_used_minutes, 0) AS time_used_minutes,
				COUNT(DISTINCT l.id) AS logs_count,
				GROUP_CONCAT(DISTINCT COALESCE(u.name, wpo.id_code) ORDER BY COALESCE(u.name, wpo.id_code) SEPARATOR ', ') AS operators
			FROM work_plans wp
			LEFT JOIN time_calc tc ON tc.work_plan_id = wp.id
			LEFT JOIN logs l ON l.work_plan_id = wp.id
			LEFT JOIN work_plan_operators wpo ON wpo.work_plan_id = wp.id
			LEFT JOIN users u ON u.id = wpo.user_id
			WHERE DATE(wp.production_date) BETWEEN ? AND ?
			${jobCodeClause}
			${jobNameClause}
			GROUP BY wp.id
			ORDER BY wp.job_code ASC, DATE(wp.production_date) DESC, wp.id DESC
		`;

		const rows = await logsQuery(sql, params);
		return res.json({ success: true, data: rows, count: rows.length });
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

		// ดึง logs ของ work_plan_id 482 ทั้งหมด
		const wp482LogsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp,
				DATE(timestamp) as log_date
			FROM logs 
			WHERE work_plan_id = 482
			ORDER BY timestamp DESC
		`;

		const wp482Logs = await logsQuery(wp482LogsSql);

		// ดึง logs ของวันที่ 2025-08-15
		const dateLogsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp
			FROM logs 
			WHERE DATE(timestamp) = '2025-08-15'
			ORDER BY timestamp DESC
		`;

		const dateLogs = await logsQuery(dateLogsSql);

		res.json({
			success: true,
			data: {
				latest_logs: latestLogs,
				wp482_logs: wp482Logs,
				date_2025_08_15_logs: dateLogs,
				summary: {
					total_logs: latestLogs.length,
					wp482_count: wp482Logs.length,
					date_2025_08_15_count: dateLogs.length
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

		// ดึง logs ของ work_plan_id 482 ทั้งหมดจาก Database ใหม่
		const wp482LogsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp,
				DATE(timestamp) as log_date
			FROM logs 
			WHERE work_plan_id = 482
			ORDER BY timestamp DESC
		`;

		const wp482Logs = await query(wp482LogsSql);

		// ดึง logs ของวันที่ 2025-08-15 จาก Database ใหม่
		const dateLogsSql = `
			SELECT 
				id,
				work_plan_id,
				process_number,
				status,
				timestamp
			FROM logs 
			WHERE DATE(timestamp) = '2025-08-15'
			ORDER BY timestamp DESC
		`;

		const dateLogs = await query(dateLogsSql);

		res.json({
			success: true,
			data: {
				latest_logs: latestLogs,
				wp482_logs: wp482Logs,
				date_2025_08_15_logs: dateLogs,
				summary: {
					total_logs: latestLogs.length,
					wp482_count: wp482Logs.length,
					date_2025_08_15_count: dateLogs.length
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
