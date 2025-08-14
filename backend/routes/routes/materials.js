const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../database/connection');

// GET /api/materials - ดึงรายการวัตถุดิบทั้งหมด
router.get('/', async (req, res) => {
	try {
		const sql = 'SELECT * FROM material ORDER BY Mat_Name';
		const materials = await query(sql);
		
		res.json({
			success: true,
			data: materials,
			count: materials.length
		});
	} catch (error) {
		console.error('Error fetching materials:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch materials',
			message: error.message
		});
	}
});

// GET /api/materials/search - ค้นหาวัตถุดิบ
router.get('/search', async (req, res) => {
	try {
		const { q } = req.query;
		
		if (!q || q.trim() === '') {
			return res.json({
				success: true,
				data: [],
				count: 0
			});
		}
		
		const searchTerm = `%${q.trim()}%`;
		const sql = `
			SELECT * FROM material 
			WHERE Mat_Name LIKE ? OR Mat_Id LIKE ?
			ORDER BY Mat_Name
			LIMIT 20
		`;
		
		const materials = await query(sql, [searchTerm, searchTerm]);
		
		res.json({
			success: true,
			data: materials,
			count: materials.length
		});
	} catch (error) {
		console.error('Error searching materials:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to search materials',
			message: error.message
		});
	}
});

// POST /api/materials - สร้างวัตถุดิบใหม่
router.post('/', async (req, res) => {
	try {
		const { Mat_Id, Mat_Name, Mat_Unit, price } = req.body;
		
		if (!Mat_Name || Mat_Name.trim() === '') {
			return res.status(400).json({
				success: false,
				error: 'Mat_Name is required'
			});
		}
		
		// ตรวจสอบว่ามี Mat_Id ซ้ำหรือไม่
		if (Mat_Id) {
			const existingMaterial = await query(
				'SELECT id FROM material WHERE Mat_Id = ?',
				[Mat_Id]
			);
			
			if (existingMaterial.length > 0) {
				return res.status(400).json({
					success: false,
					error: 'Material ID already exists'
				});
			}
		}
		
		// สร้าง Mat_Id อัตโนมัติถ้าไม่ระบุ
		let finalMatId = Mat_Id;
		if (!finalMatId || finalMatId.trim() === '') {
			const lastMaterial = await query(
				'SELECT Mat_Id FROM material WHERE Mat_Id LIKE "MAT%" ORDER BY Mat_Id DESC LIMIT 1'
			);
			
			if (lastMaterial.length > 0) {
				const lastId = lastMaterial[0].Mat_Id;
				const lastNumber = parseInt(lastId.replace('MAT', '')) || 0;
				finalMatId = `MAT${String(lastNumber + 1).padStart(3, '0')}`;
			} else {
				finalMatId = 'MAT001';
			}
		}
		
		const sql = `
			INSERT INTO material (Mat_Id, Mat_Name, Mat_Unit, price)
			VALUES (?, ?, ?, ?)
		`;
		
		const result = await query(sql, [
			finalMatId,
			Mat_Name.trim(),
			Mat_Unit || 'กก.',
			Number(price) || 0
		]);
		
		// ดึงข้อมูลวัตถุดิบที่สร้างใหม่
		const newMaterial = await query(
			'SELECT * FROM material WHERE id = ?',
			[result.insertId]
		);
		
		res.status(201).json({
			success: true,
			message: 'Material created successfully',
			data: newMaterial[0]
		});
	} catch (error) {
		console.error('Error creating material:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create material',
			message: error.message
		});
	}
});

// GET /api/materials/bom/:fgCode - ดึง BOM ตามรหัสผลิตภัณฑ์
router.get('/bom/:fgCode', async (req, res) => {
	try {
		const { fgCode } = req.params;
		
		const sql = `
			SELECT 
				fb.*,
				m.id as material_id,
				m.Mat_Id,
				m.Mat_Name,
				m.Mat_Unit,
				m.price
			FROM fg_bom fb
			JOIN material m ON fb.Raw_Code = m.Mat_Id
			WHERE fb.FG_Code = ?
		`;
		
		const bomItems = await query(sql, [fgCode]);
		
		res.json({
			success: true,
			data: bomItems,
			count: bomItems.length
		});
	} catch (error) {
		console.error('Error fetching BOM:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch BOM',
			message: error.message
		});
	}
});

// POST /api/materials/weighing - บันทึกการตวงวัตถุดิบ
router.post('/weighing', async (req, res) => {
	try {
		const { batch_id, materials, is_update } = req.body;
		
		if (!batch_id || !materials || !Array.isArray(materials)) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields: batch_id, materials (array)'
			});
		}
		
		// ใช้ transaction เพื่อความปลอดภัย
		const result = await transaction(async (connection) => {
			// ถ้าเป็นการอัพเดท ให้ลบข้อมูลเก่าก่อน
			if (is_update) {
				await connection.execute(
					'DELETE FROM batch_material_usage WHERE batch_id = ?',
					[batch_id]
				);
			}
			
			const insertPromises = materials.map(async (material) => {
				const { material_id, planned_qty, actual_qty, unit, unit_price, weighed_by } = material;
				
				const sql = `
					INSERT INTO batch_material_usage 
					(batch_id, material_id, planned_qty, actual_qty, unit, unit_price, weighed_by)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`;
				
				const [result] = await connection.execute(sql, [
					batch_id, material_id, planned_qty, actual_qty, unit, unit_price, weighed_by
				]);
				
				return result.insertId;
			});
			
			await Promise.all(insertPromises);
			
			// อัพเดทสถานะล็อตเป็น 'producing' (เฉพาะกรณีใหม่)
			if (!is_update) {
				await connection.execute(
					'UPDATE production_batches SET status = ? WHERE id = ?',
					['producing', batch_id]
				);
			}
			
			return { success: true };
		});
		
		res.status(201).json({
			success: true,
			message: is_update ? 'Material weighing updated successfully' : 'Material weighing recorded successfully',
			data: result
		});
	} catch (error) {
		console.error('Error recording material weighing:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to record material weighing',
			message: error.message
		});
	}
});

// GET /api/materials/usage/:batchId - ดึงข้อมูลการใช้วัตถุดิบของล็อต
router.get('/usage/:batchId', async (req, res) => {
	try {
		const { batchId } = req.params;
		
		const sql = `
			SELECT 
				bmu.*,
				m.Mat_Name,
				m.Mat_Unit
			FROM batch_material_usage bmu
			JOIN material m ON bmu.material_id = m.id
			WHERE bmu.batch_id = ?
			ORDER BY bmu.weighed_at DESC
		`;
		
		const usage = await query(sql, [batchId]);
		
		res.json({
			success: true,
			data: usage,
			count: usage.length
		});
	} catch (error) {
		console.error('Error fetching material usage:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch material usage',
			message: error.message
		});
	}
});

// GET /api/materials/summary/:batchId - สรุปการใช้วัตถุดิบของล็อต
router.get('/summary/:batchId', async (req, res) => {
	try {
		const { batchId } = req.params;
		
		const sql = `
			SELECT 
				SUM(actual_qty) as total_material_qty,
				SUM(total_cost) as total_material_cost,
				COUNT(*) as materials_count
			FROM batch_material_usage
			WHERE batch_id = ?
		`;
		
		const summary = await query(sql, [batchId]);
		
		res.json({
			success: true,
			data: summary[0] || {
				total_material_qty: 0,
				total_material_cost: 0,
				materials_count: 0
			}
		});
	} catch (error) {
		console.error('Error fetching material summary:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch material summary',
			message: error.message
		});
	}
});

module.exports = router;
