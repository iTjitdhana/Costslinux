const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../database/connection');

// GET /api/batches - ดึงรายการล็อตการผลิตทั้งหมด
router.get('/', async (req, res) => {
	try {
		const sql = `
			SELECT 
				pb.*,
				fg.FG_Name as fg_name,
				fg.FG_Unit as unit,
				wp.job_code,
				wp.job_name,
				wp.production_date
			FROM production_batches pb
			JOIN fg ON pb.fg_code = fg.FG_Code
			JOIN work_plans wp ON pb.work_plan_id = wp.id
			ORDER BY pb.created_at DESC
		`;
		
		const batches = await query(sql);
		res.json({
			success: true,
			data: batches,
			count: batches.length
		});
	} catch (error) {
		console.error('Error fetching batches:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch batches',
			message: error.message
		});
	}
});

// GET /api/batches/:id - ดึงข้อมูลล็อตการผลิตตาม ID
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		
		const sql = `
			SELECT 
				pb.*,
				fg.FG_Name as fg_name,
				fg.FG_Unit as unit,
				wp.job_code,
				wp.job_name,
				wp.production_date
			FROM production_batches pb
			JOIN fg ON pb.fg_code = fg.FG_Code
			JOIN work_plans wp ON pb.work_plan_id = wp.id
			WHERE pb.id = ?
		`;
		
		const batches = await query(sql, [id]);
		
		if (batches.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Batch not found'
			});
		}
		
		res.json({
			success: true,
			data: batches[0]
		});
	} catch (error) {
		console.error('Error fetching batch:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch batch',
			message: error.message
		});
	}
});

// POST /api/batches - สร้างล็อตการผลิตใหม่
router.post('/', async (req, res) => {
	try {
		const { work_plan_id, fg_code, planned_qty, fg_name } = req.body;
		
		// ตรวจสอบข้อมูลที่จำเป็น
		if (!work_plan_id || !fg_code || !planned_qty) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields: work_plan_id, fg_code, planned_qty'
			});
		}
		
		// สร้างรหัสล็อตแบบใหม่
		const generateBatchCode = (jobCode, fgName) => {
			const now = new Date();
			const year = String(now.getFullYear() + 543).slice(-2); // พ.ศ. 2 หลัก
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			const dateStr = `${year}${month}${day}`;
			return `${jobCode}+${dateStr}(${fgName || 'Unknown'})`;
		};
		
		// ดึงข้อมูล work plan เพื่อสร้าง batch code
		const workPlanData = await query(
			'SELECT job_code, job_name FROM work_plans WHERE id = ?',
			[work_plan_id]
		);
		
		if (workPlanData.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Work plan not found'
			});
		}
		
		const batchCode = generateBatchCode(workPlanData[0].job_code, fg_name || workPlanData[0].job_name);
		
		const sql = `
			INSERT INTO production_batches 
			(work_plan_id, batch_code, fg_code, planned_qty, start_time, status)
			VALUES (?, ?, ?, ?, NOW(), 'preparing')
		`;
		
		const result = await query(sql, [work_plan_id, batchCode, fg_code, planned_qty]);
		
		// ดึงข้อมูลล็อตที่สร้างใหม่
		const newBatch = await query(
			`SELECT pb.*, fg.FG_Name as fg_name, fg.FG_Unit as unit, wp.job_code, wp.job_name, wp.production_date
			 FROM production_batches pb
			 JOIN fg ON pb.fg_code = fg.FG_Code
			 JOIN work_plans wp ON pb.work_plan_id = wp.id
			 WHERE pb.id = ?`,
			[result.insertId]
		);
		
		res.status(201).json({
			success: true,
			message: 'Batch created successfully',
			data: newBatch[0]
		});
	} catch (error) {
		console.error('Error creating batch:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create batch',
			message: error.message
		});
	}
});

// PUT /api/batches/:id/status - อัพเดทสถานะล็อตการผลิต
router.put('/:id/status', async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		
		// ตรวจสอบสถานะที่ถูกต้อง
		const validStatuses = ['preparing', 'producing', 'completed', 'cancelled'];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid status. Must be one of: preparing, producing, completed, cancelled'
			});
		}
		
		const sql = `
			UPDATE production_batches 
			SET status = ?, updated_at = NOW()
			WHERE id = ?
		`;
		
		await query(sql, [status, id]);
		
		// ดึงข้อมูลที่อัพเดทแล้ว
		const updatedBatch = await query(
			`SELECT pb.*, fg.FG_Name as fg_name, fg.FG_Unit as unit, wp.job_code, wp.job_name, wp.production_date
			 FROM production_batches pb
			 JOIN fg ON pb.fg_code = fg.FG_Code
			 JOIN work_plans wp ON pb.work_plan_id = wp.id
			 WHERE pb.id = ?`,
			[id]
		);
		
		if (updatedBatch.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Batch not found'
			});
		}
		
		res.json({
			success: true,
			message: 'Batch status updated successfully',
			data: updatedBatch[0]
		});
	} catch (error) {
		console.error('Error updating batch status:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update batch status',
			message: error.message
		});
	}
});

// GET /api/batches/workplan/:workPlanId - ดึงล็อตการผลิตตาม work plan
router.get('/workplan/:workPlanId', async (req, res) => {
	try {
		const { workPlanId } = req.params;
		
		const sql = `
			SELECT 
				pb.*,
				fg.FG_Name as fg_name,
				fg.FG_Unit as unit,
				wp.production_date
			FROM production_batches pb
			JOIN fg ON pb.fg_code = fg.FG_Code
			JOIN work_plans wp ON pb.work_plan_id = wp.id
			WHERE pb.work_plan_id = ?
			ORDER BY pb.created_at DESC
		`;
		
		const batches = await query(sql, [workPlanId]);
		
		res.json({
			success: true,
			data: batches,
			count: batches.length
		});
	} catch (error) {
		console.error('Error fetching batches by work plan:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch batches by work plan',
			message: error.message
		});
	}
});

router.get('/work-plans/:date', async (req, res) => {
	try {
		const { date } = req.params;
		const sqlByDate = `
			SELECT 
				wp.*,
				wp.job_code AS fg_code,
				fg.FG_Name as fg_name
			FROM work_plans wp
			LEFT JOIN fg ON (fg.FG_Code COLLATE utf8mb4_general_ci) = wp.job_code
			WHERE DATE(wp.production_date) = ?
			ORDER BY wp.job_code
		`;
		let rows = await query(sqlByDate, [date]);
		if (!rows || rows.length === 0) {
			// Fallback: use the latest production_date that has data
			const latestDateRows = await query(
				`SELECT production_date FROM work_plans ORDER BY production_date DESC LIMIT 1`
			);
			if (latestDateRows && latestDateRows.length > 0) {
				const latestDate = latestDateRows[0].production_date;
				rows = await query(sqlByDate, [latestDate]);
			}
		}
		res.json({ success: true, data: rows || [], count: (rows || []).length });
	} catch (error) {
		console.error('Error fetching work plans by date:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch work plans' });
	}
});

module.exports = router;
