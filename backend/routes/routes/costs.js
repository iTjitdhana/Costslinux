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

module.exports = router;
