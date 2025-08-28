const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../database/connection');

// ฟังก์ชันสร้าง batch_code ตาม format: รหัสงาน+ปีเดือนวัน(ชื่องาน)
const generateBatchCode = (workplan) => {
	const today = new Date();
	const year = String(today.getFullYear()).slice(-2); // เอาแค่ 2 หลักท้าย
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	const dateStr = `${year}${month}${day}`;
	
	// ทำความสะอาดชื่องาน - เอาเฉพาะตัวอักษรและตัวเลข และจำกัดความยาว
	const cleanJobName = (workplan.job_name || '')
		.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '') // เอาเฉพาะไทย อังกฤษ ตัวเลข และช่องว่าง
		.trim()
		.substring(0, 50); // จำกัดความยาวไม่เกิน 50 ตัวอักษร
	
	return `${workplan.job_code}+${dateStr}(${cleanJobName})`;
};

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
		
		// สร้าง Mat_Id อัตโนมัติถ้าไม่ระบุ หรือตรวจสอบความซ้ำซ้อน
		let finalMatId = Mat_Id;
		if (!finalMatId || finalMatId.trim() === '') {
			// สร้าง Mat_Id ใหม่
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
		} else {
			// ตรวจสอบว่า Mat_Id ที่ส่งมามีการใช้งานแล้วหรือไม่
			const existingCheck = await query(
				'SELECT id FROM material WHERE Mat_Id = ?',
				[finalMatId]
			);
			
			if (existingCheck.length > 0) {
				// ถ้าซ้ำ ให้สร้าง Mat_Id ใหม่โดยเติม timestamp
				const timestamp = Date.now().toString().slice(-6);
				finalMatId = `${finalMatId}_${timestamp}`;
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

// GET /api/materials/bom/job/:jobCode - ดึง BOM ตาม job_code จาก workplan
router.get('/bom/job/:jobCode', async (req, res) => {
	try {
		const { jobCode } = req.params;
		
		// ใช้ job_code เป็น FG_Code โดยตรง (เพราะในระบบนี้ job_code = FG_Code)
		const fgCode = jobCode;
		
		// ดึง BOM ตาม FG_Code
		const bomSql = `
			SELECT 
				fb.Raw_Code,
				fb.Raw_Qty,
				fb.FG_Code,
				m.id as material_id,
				m.Mat_Name,
				m.Mat_Unit,
				m.price
			FROM fg_bom fb
			JOIN material m ON fb.Raw_Code = m.Mat_Id
			WHERE fb.FG_Code = ?
		`;
		
		const bomItems = await query(bomSql, [fgCode]);
		
		res.json({
			success: true,
			data: bomItems,
			count: bomItems.length,
			job_code: jobCode,
			fg_code: fgCode
		});
	} catch (error) {
		console.error('Error fetching BOM by job_code:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch BOM by job_code',
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
			// ตรวจสอบว่า batch_id เป็น workplan_id หรือไม่
			// ถ้าเป็น workplan_id ให้ใช้งาน batch ล่าสุดของงานนั้น (มีแล้วใช้ซ้ำ, ไม่มีให้สร้างใหม่)
			let actualBatchId = batch_id;
			
			// ตรวจสอบว่า batch_id นี้เป็น workplan_id หรือไม่
			const workplanCheck = await connection.execute(
				'SELECT id, job_code, job_name FROM work_plans WHERE id = ?',
				[batch_id]
			);
			
			if (workplanCheck[0].length > 0) {
				const workplan = workplanCheck[0][0];
				// หา batch ล่าสุดของงานนี้
				const [existingBatchRows] = await connection.execute(
					`SELECT id FROM production_batches WHERE work_plan_id = ? ORDER BY created_at DESC LIMIT 1`,
					[workplan.id]
				);
				if (existingBatchRows.length > 0) {
					actualBatchId = existingBatchRows[0].id;
					if (process.env.NODE_ENV === 'development') {
						console.log(`Reusing existing batch ID: ${actualBatchId} for workplan: ${workplan.job_code}`);
					}
				} else {
					const batchCode = generateBatchCode(workplan);
					const [batchResult] = await connection.execute(
						`INSERT INTO production_batches 
						(work_plan_id, batch_code, fg_code, planned_qty, actual_qty, status, start_time, created_at) 
						VALUES (?, ?, ?, 0, 0, 'producing', NOW(), NOW())`,
						[workplan.id, batchCode, workplan.job_code]
					);
					actualBatchId = batchResult.insertId;
					if (process.env.NODE_ENV === 'development') {
						if (process.env.NODE_ENV === 'development') {
					console.log(`Created new batch ID: ${actualBatchId} for workplan: ${workplan.job_code}`);
				}
					}
				}
			}
			
			// ถ้าเป็นการอัพเดท ให้ลบข้อมูลเก่าก่อน
			if (is_update) {
				await connection.execute(
					'DELETE FROM batch_material_usage WHERE batch_id = ?',
					[actualBatchId]
				);
			}
			
			const insertPromises = materials.map(async (material) => {
				const { material_id, planned_qty, actual_qty, unit, unit_price } = material;
				
				// ตรวจสอบ material_id
				if (!material_id) {
					throw new Error(`material_id is required for material: ${JSON.stringify(material)}`);
				}
				
				const sql = `
					INSERT INTO batch_material_usage 
					(batch_id, material_id, planned_qty, actual_qty, unit, unit_price, weighed_at)
					VALUES (?, ?, ?, ?, ?, ?, NOW())
				`;
				
				const [result] = await connection.execute(sql, [
					actualBatchId, material_id, planned_qty, actual_qty, unit, unit_price
				]);
				
				return result.insertId;
			});
			
			await Promise.all(insertPromises);
			
			return { success: true, batch_id: actualBatchId };
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

// POST /api/materials/production - บันทึกผลผลิต
router.post('/production', async (req, res) => {
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
			// ตรวจสอบว่า batch_id เป็น workplan_id หรือไม่
			// ถ้าเป็น workplan_id ให้สร้าง batch ใหม่
			let actualBatchId = batch_id;
			
			// ตรวจสอบว่า batch_id นี้เป็น workplan_id หรือไม่
			const workplanCheck = await connection.execute(
				'SELECT id, job_code, job_name FROM work_plans WHERE id = ?',
				[batch_id]
			);
			
			if (workplanCheck[0].length > 0) {
				// เป็น workplan_id ให้สร้าง batch ใหม่
				const workplan = workplanCheck[0][0];
				
				// ตรวจสอบและสร้าง FG record ถ้าไม่มี (แก้ปัญหา Foreign Key constraint)
				const fgCheck = await connection.execute(
					'SELECT FG_Code FROM fg WHERE FG_Code = ?',
					[workplan.job_code]
				);
				
				if (fgCheck[0].length === 0) {
					console.log(`🔧 Creating missing FG record: ${workplan.job_code} with values:`, {
						FG_Code: workplan.job_code,
						FG_Name: workplan.job_name || 'Unknown Product',
						FG_Unit: 'กก.',
						FG_Size: 'Standard'
					});
					
					try {
						await connection.execute(
							'INSERT INTO fg (FG_Code, FG_Name, FG_Unit, FG_Size) VALUES (?, ?, ?, ?)',
							[workplan.job_code, workplan.job_name || 'Unknown Product', 'กก.', 'Standard']
						);
						console.log(`✅ Successfully created FG record: ${workplan.job_code}`);
					} catch (fgError) {
						console.error(`❌ Error creating FG record:`, fgError);
						throw fgError;
					}
				}
				
				const batchCode = generateBatchCode(workplan);
				
				const [batchResult] = await connection.execute(
					`INSERT INTO production_batches 
					(work_plan_id, batch_code, fg_code, planned_qty, actual_qty, status, start_time, created_at) 
					VALUES (?, ?, ?, 0, 0, 'producing', NOW(), NOW())`,
					[workplan.id, batchCode, workplan.job_code]
				);
				
				actualBatchId = batchResult.insertId;
				if (process.env.NODE_ENV === 'development') {
					console.log(`Created new batch ID: ${actualBatchId} for workplan: ${workplan.job_code}`);
				}
			}
			
			// อัพเดทข้อมูลผลผลิตใน production_batches
			const fgMaterial = materials[0]; // ใช้ข้อมูลแรกเป็นผลผลิตหลัก
			if (fgMaterial) {
				const plannedQty = parseFloat(fgMaterial.planned_qty) || 0;
				const actualQty = parseFloat(fgMaterial.actual_qty) || 0;
				
				await connection.execute(
					`UPDATE production_batches 
					SET planned_qty = ?, actual_qty = ?, updated_at = NOW()
					WHERE id = ?`,
					[plannedQty, actualQty, actualBatchId]
				);
				
				if (process.env.NODE_ENV === 'development') {
					console.log(`Updated production batch ${actualBatchId}: planned=${plannedQty}, actual=${actualQty}`);
				}
			}
			
			return { success: true, batch_id: actualBatchId };
		});
		
		res.status(201).json({
			success: true,
			message: 'Production data recorded successfully',
			data: result
		});
	} catch (error) {
		console.error('Error recording production data:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to record production data',
			message: error.message
		});
	}
});

// POST /api/materials/inventory - บันทึกข้อมูลทั้งหมด (วัตถุดิบ + ผลผลิต)
router.post('/inventory', async (req, res) => {
	try {
		const { batch_id, raw_materials, fg_materials } = req.body;
		
		// Debug logging
		if (process.env.NODE_ENV === 'development') {
			console.log('📥 Inventory data received:', {
				batch_id,
				raw_materials_count: raw_materials?.length || 0,
				fg_materials_count: fg_materials?.length || 0,
				raw_materials_sample: raw_materials?.slice(0, 2) || [],
				fg_materials_sample: fg_materials?.slice(0, 2) || []
			});
		}
		
		if (!batch_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required field: batch_id'
			});
		}
		
		// ใช้ transaction เพื่อความปลอดภัย
		const result = await transaction(async (connection) => {
			// ตรวจสอบว่า batch_id เป็น workplan_id หรือไม่
			// ถ้าเป็น workplan_id ให้สร้าง batch ใหม่
			let actualBatchId = batch_id;
			
			// ตรวจสอบว่า batch_id นี้เป็น workplan_id หรือไม่
			const workplanCheck = await connection.execute(
				'SELECT id, job_code, job_name FROM work_plans WHERE id = ?',
				[batch_id]
			);
			
			if (workplanCheck[0].length > 0) {
				// เป็น workplan_id ให้สร้าง batch ใหม่
				const workplan = workplanCheck[0][0];
				
				// ตรวจสอบและสร้าง FG record ถ้าไม่มี (แก้ปัญหา Foreign Key constraint)
				const fgCheck = await connection.execute(
					'SELECT FG_Code FROM fg WHERE FG_Code = ?',
					[workplan.job_code]
				);
				
				if (fgCheck[0].length === 0) {
					console.log(`🔧 Creating missing FG record: ${workplan.job_code} with values:`, {
						FG_Code: workplan.job_code,
						FG_Name: workplan.job_name || 'Unknown Product',
						FG_Unit: 'กก.',
						FG_Size: 'Standard'
					});
					
					try {
						await connection.execute(
							'INSERT INTO fg (FG_Code, FG_Name, FG_Unit, FG_Size) VALUES (?, ?, ?, ?)',
							[workplan.job_code, workplan.job_name || 'Unknown Product', 'กก.', 'Standard']
						);
						console.log(`✅ Successfully created FG record: ${workplan.job_code}`);
					} catch (fgError) {
						console.error(`❌ Error creating FG record:`, fgError);
						throw fgError;
					}
				}
				
				const batchCode = generateBatchCode(workplan);
				
				const [batchResult] = await connection.execute(
					`INSERT INTO production_batches 
					(work_plan_id, batch_code, fg_code, planned_qty, actual_qty, status, start_time, created_at) 
					VALUES (?, ?, ?, 0, 0, 'producing', NOW(), NOW())`,
					[workplan.id, batchCode, workplan.job_code]
				);
				
				actualBatchId = batchResult.insertId;
				if (process.env.NODE_ENV === 'development') {
					console.log(`Created new batch ID: ${actualBatchId} for workplan: ${workplan.job_code}`);
				}
			}
			
			// ลบข้อมูลวัตถุดิบเดิมของ batch นี้ก่อน เพื่อให้การบันทึกใหม่เป็นการแทนที่
			await connection.execute('DELETE FROM batch_material_usage WHERE batch_id = ?', [actualBatchId]);
			
			// บันทึกข้อมูลวัตถุดิบ (Raw Materials)
			if (raw_materials && raw_materials.length > 0) {
				// แยกวัตถุดิบที่มีอยู่และวัตถุดิบใหม่
				const existingMaterials = raw_materials.filter(m => m.material_id && !m.is_custom);
				const newMaterials = raw_materials.filter(m => !m.material_id || m.is_custom);
				
				// สร้างวัตถุดิบใหม่ก่อน
				const createdMaterials = [];
				for (const material of newMaterials) {
					try {
						const materialData = {
							Mat_Id: material.Mat_Id || `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
							Mat_Name: material.Mat_Name || 'วัตถุดิบใหม่',
							Mat_Unit: material.unit || 'กก.',
							price: Number(material.unit_price) || 0
						};
						
						// สร้างวัตถุดิบใหม่ในฐานข้อมูล
						const [createResult] = await connection.execute(
							'INSERT INTO material (Mat_Id, Mat_Name, Mat_Unit, price) VALUES (?, ?, ?, ?)',
							[materialData.Mat_Id, materialData.Mat_Name, materialData.Mat_Unit, materialData.price]
						);
						
						createdMaterials.push({
							...material,
							material_id: createResult.insertId
						});
						
						if (process.env.NODE_ENV === 'development') {
							console.log(`Created new material: ${materialData.Mat_Name} (ID: ${createResult.insertId})`);
						}
					} catch (error) {
						console.error('Error creating material:', error);
						throw new Error(`ไม่สามารถสร้างวัตถุดิบ ${material.Mat_Name} ได้: ${error.message}`);
					}
				}
				
				// รวมวัตถุดิบทั้งหมด
				const allMaterials = [...existingMaterials, ...createdMaterials];
				
				// บันทึกการใช้วัตถุดิบ
				const insertPromises = allMaterials.map(async (material) => {
					const { material_id, planned_qty, actual_qty, unit, unit_price } = material;
					
					// ตรวจสอบ material_id (ตอนนี้ควรมีแล้วทั้งหมด)
					if (!material_id) {
						throw new Error(`material_id is still missing for material: ${JSON.stringify(material)}`);
					}
					
					const sql = `
						INSERT INTO batch_material_usage 
						(batch_id, material_id, planned_qty, actual_qty, unit, unit_price, weighed_at)
						VALUES (?, ?, ?, ?, ?, ?, NOW())
					`;
					
					const [result] = await connection.execute(sql, [
						actualBatchId, material_id, planned_qty || 0, actual_qty || 0, unit || 'กก.', unit_price || 0
					]);
					
					return result.insertId;
				});
				
				await Promise.all(insertPromises);
				if (process.env.NODE_ENV === 'development') {
					console.log(`Saved ${allMaterials.length} materials (${existingMaterials.length} existing, ${createdMaterials.length} new)`);
				}
			}
			
			// อัพเดทข้อมูลผลผลิตใน production_batches
			if (fg_materials && fg_materials.length > 0) {
				const fgMaterial = fg_materials[0]; // ใช้ข้อมูลแรกเป็นผลผลิตหลัก
				const plannedQty = parseFloat(fgMaterial.planned_qty) || 0;
				const actualQty = parseFloat(fgMaterial.actual_qty) || 0;
				
				await connection.execute(
					`UPDATE production_batches 
					SET planned_qty = ?, actual_qty = ?, updated_at = NOW()
					WHERE id = ?`,
					[plannedQty, actualQty, actualBatchId]
				);
				
				if (process.env.NODE_ENV === 'development') {
					console.log(`Updated production batch ${actualBatchId}: planned=${plannedQty}, actual=${actualQty}`);
				}
			}
			
			return { 
				success: true, 
				batch_id: actualBatchId,
				raw_materials_count: raw_materials ? raw_materials.length : 0,
				fg_materials_count: fg_materials ? fg_materials.length : 0
			};
		});
		
		res.status(201).json({
			success: true,
			message: 'Inventory data recorded successfully',
			data: result
		});
	} catch (error) {
		console.error('Error recording inventory data:', error);
		
		// ส่งข้อความ error ที่ละเอียดขึ้น
		let errorMessage = 'Failed to record inventory data';
		if (error.message.includes('ไม่สามารถสร้างวัตถุดิบ')) {
			errorMessage = error.message;
		} else if (error.message.includes('material_id')) {
			errorMessage = 'ข้อมูลวัตถุดิบไม่ครบถ้วน กรุณาตรวจสอบข้อมูลที่ import';
		} else if (error.code === 'ER_DUP_ENTRY') {
			errorMessage = 'พบข้อมูลซ้ำซ้อนในฐานข้อมูล';
		}
		
		res.status(500).json({
			success: false,
			error: errorMessage,
			message: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
});

// GET /api/materials/inventory/:workplanId - ดึงข้อมูลที่เคยบันทึก
router.get('/inventory/:workplanId', async (req, res) => {
	try {
		const { workplanId } = req.params;
		
		// ดึงข้อมูล batch ที่เกี่ยวข้องกับ workplan
		const batchSql = `
			SELECT id, batch_code, actual_qty, planned_qty
			FROM production_batches
			WHERE work_plan_id = ?
			ORDER BY created_at DESC
			LIMIT 1
		`;
		const batches = await query(batchSql, [workplanId]);
		
		if (batches.length === 0) {
			return res.json({
				success: true,
				data: null,
				message: 'ไม่พบข้อมูลที่บันทึก'
			});
		}
		
		const batch = batches[0];
		
		// ดึงข้อมูลวัตถุดิบที่เคยบันทึก
		const materialsSql = `
			SELECT 
				bmu.*,
				m.Mat_Name,
				m.Mat_Id,
				m.Mat_Unit,
				m.price
			FROM batch_material_usage bmu
			JOIN material m ON bmu.material_id = m.id
			WHERE bmu.batch_id = ?
			ORDER BY bmu.weighed_at DESC
		`;
		const materials = await query(materialsSql, [batch.id]);
		
		// แปลงข้อมูลให้ตรงกับ frontend
		const formattedMaterials = materials.map(material => ({
			material_id: material.material_id,
			planned_qty: Number(material.planned_qty) || 0,
			actual_qty: String(material.actual_qty) || '',
			unit: material.unit || material.Mat_Unit || 'กก.',
			unit_price: Number(material.unit_price) || Number(material.price) || 0,
			Mat_Name: material.Mat_Name,
			Mat_Id: material.Mat_Id,
			is_custom: false,
			is_fg: false // ข้อมูลจาก batch_material_usage เป็นวัตถุดิบ
		}));
		
		res.json({
			success: true,
			data: {
				batch_id: batch.id,
				batch_code: batch.batch_code,
				actual_qty: batch.actual_qty,
				planned_qty: batch.planned_qty,
				materials: formattedMaterials
			}
		});
	} catch (error) {
		console.error('Error fetching saved inventory data:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch saved inventory data',
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
				SUM(actual_qty * COALESCE(unit_price, 0)) as total_material_cost,
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
