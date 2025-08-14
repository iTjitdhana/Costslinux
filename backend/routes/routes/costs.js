const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../database/connection');

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
			// ดึงข้อมูลการใช้วัตถุดิบ (รวมทุกแถว ไม่ group by หน่วย เพื่อไม่ตัดข้อมูลทิ้ง)
			const [materialAggRows] = await connection.execute(`
				SELECT 
					SUM(actual_qty) as input_material_qty,
					SUM(total_cost) as material_cost,
					MIN(unit) as unit
				FROM batch_material_usage
				WHERE batch_id = ?
			`, [batch_id]);
			const materialAgg = materialAggRows[0] || { input_material_qty: 0, material_cost: 0, unit: null };
			
			// ดึงข้อมูลผลผลิต
			const [prodRows] = await connection.execute(`
				SELECT good_qty as output_qty, total_qty
				FROM batch_production_results
				WHERE batch_id = ?
			`, [batch_id]);
			const productionData = prodRows[0] || { output_qty: 0, total_qty: 0 };
			
			// คำนวณเวลาการผลิต
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
				LEFT JOIN logs l_prev ON l.batch_id = l_prev.batch_id 
					AND l.process_number = l_prev.process_number 
					AND l_prev.timestamp < l.timestamp
				WHERE l.batch_id = ?
			`, [batch_id]);
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

                -- ข้อมูลวัตถุดิบ
                COALESCE(material_data.total_material_qty, 0) as total_material_qty,
                COALESCE(material_data.total_material_cost, 0) as total_material_cost,
                COALESCE(material_data.cost_per_unit, 0) as cost_per_unit,
                COALESCE(material_data.unit, 'กก.') as unit

            FROM production_batches pb
            JOIN work_plans wp ON pb.work_plan_id = wp.id
            LEFT JOIN batch_production_results bpr ON pb.id = bpr.batch_id

            -- Subquery สำหรับข้อมูลวัตถุดิบ
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
                    MAX(bmu.unit) as unit
                FROM batch_material_usage bmu
                GROUP BY bmu.batch_id
            ) material_data ON pb.id = material_data.batch_id

            WHERE DATE(wp.production_date) = ?
            AND pb.status = 'completed'
            ORDER BY wp.job_code, pb.created_at
        `;

        const results = await query(sql, [date]);

        // คำนวณเวลาที่ใช้สำหรับแต่ละ batch
        const resultsWithTime = await Promise.all(results.map(async (item) => {
            try {
                // ดึงข้อมูล logs ของ work plan นี้ (แทน batch_id)
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

                const logs = await query(logsSql, [item.work_plan_id]);

                // คำนวณเวลาที่ใช้
                let totalTimeMinutes = 0;
                logs.forEach(log => {
                    if (log.status === 'stop' && log.prev_timestamp) {
                        const startTime = new Date(log.prev_timestamp);
                        const endTime = new Date(log.timestamp);
                        const durationMs = endTime - startTime;
                        const durationMinutes = Math.round(durationMs / (1000 * 60));
                        totalTimeMinutes += durationMinutes;
                    }
                });

                return {
                    ...item,
                    time_used_minutes: totalTimeMinutes
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

		// ดึงข้อมูล logs ของ batch นี้
		const logsSql = `
			SELECT 
				l.process_number,
				l.status,
				l.timestamp,
				LAG(l.timestamp) OVER (PARTITION BY l.process_number ORDER BY l.timestamp) as prev_timestamp
			FROM logs l
			WHERE l.batch_id = ?
			ORDER BY l.process_number, l.timestamp
		`;

		const logs = await query(logsSql, [batchId]);

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

// ทดสอบดึงข้อมูล logs ทั้งหมด
router.get('/logs-test', async (req, res) => {
	try {
		const sql = `
			SELECT 
				l.id,
				l.work_plan_id,
				l.batch_id,
				l.process_number,
				l.status,
				l.timestamp,
				pb.batch_code,
				wp.job_code,
				wp.job_name
			FROM logs l
			LEFT JOIN production_batches pb ON l.batch_id = pb.id
			LEFT JOIN work_plans wp ON l.work_plan_id = wp.id
			ORDER BY l.timestamp DESC
			LIMIT 20
		`;

		const logs = await query(sql);

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

module.exports = router;
