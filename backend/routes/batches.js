const express = require('express');
const router = express.Router();
const { query, transaction } = require('../database/connection');

// Get all batches
router.get('/', async (req, res) => {
	try {
		const sql = `
			SELECT 
				pb.*,
				fg.FG_Name as fg_name,
				wp.job_code,
				wp.job_name,
				wp.production_date
			FROM production_batches pb
			LEFT JOIN fg ON pb.fg_code = fg.FG_Code
			LEFT JOIN work_plans wp ON pb.work_plan_id = wp.id
			ORDER BY pb.created_at DESC
		`;
		const [rows] = await query(sql);
		res.json({ success: true, data: rows });
	} catch (error) {
		console.error('Error fetching batches:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch batches' });
	}
});

// Get work plans by date
router.get('/work-plans/:date', async (req, res) => {
	try {
		const { date } = req.params;
		const sql = `
			SELECT 
				wp.*,
				fg.FG_Name as fg_name
			FROM work_plans wp
			LEFT JOIN fg ON wp.fg_code = fg.FG_Code
			WHERE DATE(wp.production_date) = ?
			ORDER BY wp.job_code
		`;
		const [rows] = await query(sql, [date]);
		res.json({ success: true, data: rows });
	} catch (error) {
		console.error('Error fetching work plans:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch work plans' });
	}
});

// Create new batch
router.post('/', async (req, res) => {
	try {
		const { batch_code, work_plan_id, fg_code, planned_qty, production_date, status = 'pending' } = req.body;
		
		if (!batch_code || !work_plan_id || !fg_code || !planned_qty) {
			return res.status(400).json({ success: false, error: 'Missing required fields' });
		}

		const sql = `
			INSERT INTO production_batches (batch_code, work_plan_id, fg_code, planned_qty, production_date, status, created_at)
			VALUES (?, ?, ?, ?, ?, ?, NOW())
		`;
		
		const [result] = await query(sql, [batch_code, work_plan_id, fg_code, planned_qty, production_date, status]);
		
		res.json({ 
			success: true, 
			data: { 
				id: result.insertId, 
				batch_code, 
				work_plan_id, 
				fg_code, 
				planned_qty, 
				production_date, 
				status 
			} 
		});
	} catch (error) {
		console.error('Error creating batch:', error);
		res.status(500).json({ success: false, error: 'Failed to create batch' });
	}
});

// Update batch status
router.patch('/:id/status', async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		
		if (!status) {
			return res.status(400).json({ success: false, error: 'Status is required' });
		}

		const sql = 'UPDATE production_batches SET status = ? WHERE id = ?';
		await query(sql, [status, id]);
		
		res.json({ success: true, data: { id, status } });
	} catch (error) {
		console.error('Error updating batch status:', error);
		res.status(500).json({ success: false, error: 'Failed to update batch status' });
	}
});

module.exports = router;
