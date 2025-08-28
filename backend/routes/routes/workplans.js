const express = require('express');
const router = express.Router();
const { query } = require('../../database/connection');

// GET /api/workplans - ดึงรายการงานทั้งหมด
router.get('/', async (req, res) => {
	try {
		const sql = `
			SELECT 
				id,
				job_code,
				job_name,
				production_date,
				status_id,
				start_time,
				end_time,
				notes,
				operators
			FROM work_plans 
			ORDER BY production_date DESC, job_code
		`;
		const workplans = await query(sql);
		
		res.json({
			success: true,
			data: workplans,
			count: workplans.length
		});
	} catch (error) {
		console.error('Error fetching workplans:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch workplans',
			message: error.message
		});
	}
});

// GET /api/workplans/active - ดึงงานที่ยังไม่เสร็จ
router.get('/active', async (req, res) => {
	try {
		const sql = `
			SELECT 
				id,
				job_code,
				job_name,
				production_date,
				status_id,
				start_time,
				end_time,
				notes,
				operators
			FROM work_plans 
			WHERE status_id IN (1, 2, 3) -- pending, in_progress, completed
			ORDER BY production_date DESC, job_code
		`;
		const workplans = await query(sql);
		
		res.json({
			success: true,
			data: workplans,
			count: workplans.length
		});
	} catch (error) {
		console.error('Error fetching active workplans:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch active workplans',
			message: error.message
		});
	}
});

// GET /api/workplans/:id - ดึงงานตาม ID
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		
		const sql = `
			SELECT 
				id,
				job_code,
				job_name,
				production_date,
				status_id,
				start_time,
				end_time,
				notes,
				operators
			FROM work_plans 
			WHERE id = ?
		`;
		const workplans = await query(sql, [id]);
		
		if (workplans.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Workplan not found'
			});
		}
		
		res.json({
			success: true,
			data: workplans[0]
		});
	} catch (error) {
		console.error('Error fetching workplan:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch workplan',
			message: error.message
		});
	}
});

// GET /api/workplans/date/:date - ดึงงานตามวันที่
router.get('/date/:date', async (req, res) => {
	try {
		const { date } = req.params;
		
		const sql = `
			SELECT 
				id,
				job_code,
				job_name,
				production_date,
				status_id,
				start_time,
				end_time,
				notes,
				operators
			FROM work_plans 
			WHERE DATE(production_date) = ?
			ORDER BY job_code
		`;
		const workplans = await query(sql, [date]);
		
		res.json({
			success: true,
			data: workplans,
			count: workplans.length
		});
	} catch (error) {
		console.error('Error fetching workplans by date:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch workplans by date',
			message: error.message
		});
	}
});

module.exports = router;
