import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { batchAPI, materialAPI, formatCurrency, formatNumber } from '../services/api';
import { Plus, Search, X, Clipboard } from 'lucide-react';

const MaterialWeighing = () => {
	const { register, handleSubmit, control, reset, watch, setValue } = useForm({
		defaultValues: {
			batch_id: '',
			fg_code: '',
			materials: []
		}
	});
	const { fields, replace, append, remove } = useFieldArray({ control, name: 'materials' });

	const [batches, setBatches] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showAddMaterial, setShowAddMaterial] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const [dataSource, setDataSource] = useState(''); // 'existing' หรือ 'bom'
	const [newMaterial, setNewMaterial] = useState({
		Mat_Id: '',
		Mat_Name: '',
		Mat_Unit: 'กก.',
		price: 0
	});
	
	const batchId = watch('batch_id');
	const fgCode = watch('fg_code');

	const loadBatches = async () => {
		try {
			const res = await batchAPI.getAll();
			setBatches(res.data.data || []);
		} catch (error) {
			console.error('Error loading batches:', error);
			toast.error('โหลดล็อตไม่สำเร็จ');
		}
	};

	const loadBOM = async () => {
		try {
			if (!fgCode) {
				toast.error('กรอก FG Code ก่อน');
				return;
			}
			setLoading(true);
			const res = await materialAPI.getBOM(fgCode);
			const bom = (res.data.data || []).map((item) => ({
				material_id: item.material_id,
				planned_qty: Number(item.Raw_Qty),
				actual_qty: '', // เริ่มต้นว่าง ให้ผู้ใช้ใส่เอง
				unit: item.Mat_Unit,
				unit_price: item.price,
				weighed_by: null,
				Mat_Name: item.Mat_Name,
				is_custom: false
			}));
			replace(bom);
			setDataSource('bom');
			toast.success('โหลด BOM สำเร็จ');
		} catch (error) {
			console.error('Error loading BOM:', error);
			toast.error('โหลด BOM ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// โหลดข้อมูลการตวงที่มีอยู่
	const loadExistingWeighing = async (batchId) => {
		try {
			if (!batchId) return;
			
			setLoading(true);
			const res = await materialAPI.getUsage(batchId);
			const existingData = res.data.data || [];
			
			if (existingData.length > 0) {
				// แปลงข้อมูลให้เข้ากับรูปแบบของ form
				const materials = existingData.map((item) => ({
					material_id: item.material_id,
					planned_qty: Number(item.planned_qty) || 0,
					actual_qty: String(item.actual_qty || ''),
					unit: item.unit || 'กก.',
					unit_price: Number(item.unit_price) || 0,
					weighed_by: item.weighed_by,
					Mat_Name: item.Mat_Name,
					is_custom: false
				}));
				
				replace(materials);
				setDataSource('existing');
				toast.success('โหลดข้อมูลการตวงที่มีอยู่แล้ว');
			} else {
				// ถ้าไม่มีข้อมูลการตวง ให้โหลด BOM แทน
				const batch = batches.find(b => b.id == batchId);
				if (batch) {
					setValue('fg_code', batch.fg_code);
					await loadBOM();
				}
			}
		} catch (error) {
			console.error('Error loading existing weighing:', error);
			toast.error('โหลดข้อมูลการตวงไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// เมื่อเลือกล็อตใหม่
	useEffect(() => {
		if (batchId) {
			loadExistingWeighing(batchId);
		}
	}, [batchId]);

	useEffect(() => { loadBatches(); }, []);

	const searchMaterials = async (query) => {
		if (!query.trim()) {
			setSearchResults([]);
			return;
		}
		try {
			setSearching(true);
			const res = await materialAPI.search(query);
			setSearchResults(res.data.data || []);
		} catch (error) {
			console.error('Error searching materials:', error);
			toast.error('ค้นหาวัตถุดิบไม่สำเร็จ');
		} finally {
			setSearching(false);
		}
	};

	const addExistingMaterial = (material) => {
		const newMaterialItem = {
			material_id: material.id,
			planned_qty: 0,
			actual_qty: '',
			unit: material.Mat_Unit || 'กก.',
			unit_price: material.price || 0,
			weighed_by: null,
			Mat_Name: material.Mat_Name,
			is_custom: false
		};
		append(newMaterialItem);
		setShowAddMaterial(false);
		setSearchQuery('');
		setSearchResults([]);
		toast.success(`เพิ่ม ${material.Mat_Name} แล้ว`);
	};

	const addCustomMaterial = () => {
		if (!newMaterial.Mat_Name.trim()) {
			toast.error('กรุณากรอกชื่อวัตถุดิบ');
			return;
		}
		
		const customMaterial = {
			material_id: null, // จะถูกกำหนดเมื่อบันทึก
			planned_qty: 0,
			actual_qty: '',
			unit: newMaterial.Mat_Unit,
			unit_price: Number(newMaterial.price) || 0,
			weighed_by: null,
			Mat_Name: newMaterial.Mat_Name,
			Mat_Id: newMaterial.Mat_Id,
			is_custom: true
		};
		
		append(customMaterial);
		setShowAddMaterial(false);
		setNewMaterial({
			Mat_Id: '',
			Mat_Name: '',
			Mat_Unit: 'กก.',
			price: 0
		});
		toast.success(`เพิ่ม ${newMaterial.Mat_Name} แล้ว`);
	};

	const round3 = (val) => {
		const n = parseFloat(val || '0');
		return Math.round(n * 1000) / 1000;
	};

	const onSave = async (values) => {
		try {
			if (!values.batch_id || !values.materials?.length) {
				toast.error('เลือกล็อตและรายการวัตถุดิบก่อน');
				return;
			}
			setSaving(true);
			
			// ตรวจสอบว่ามีข้อมูลการตวงอยู่แล้วหรือไม่
			const existingData = await materialAPI.getUsage(values.batch_id);
			const hasExistingData = existingData.data.data && existingData.data.data.length > 0;
			
			// แยกวัตถุดิบที่มีอยู่และวัตถุดิบใหม่
			const existingMaterials = values.materials.filter(m => !m.is_custom);
			const newMaterials = values.materials.filter(m => m.is_custom);
			
			// สร้างวัตถุดิบใหม่ก่อน
			const createdMaterials = [];
			for (const material of newMaterials) {
				try {
					const materialData = {
						Mat_Id: material.Mat_Id || `CUSTOM_${Date.now()}`,
						Mat_Name: material.Mat_Name,
						Mat_Unit: material.unit,
						price: Number(material.unit_price) || 0
					};
					const res = await materialAPI.create(materialData);
					createdMaterials.push({
						...material,
						material_id: res.data.data.id
					});
				} catch (error) {
					console.error('Error creating material:', error);
					toast.error(`ไม่สามารถสร้างวัตถุดิบ ${material.Mat_Name} ได้`);
				}
			}
			
			// รวมวัตถุดิบทั้งหมด
			const allMaterials = [
				...existingMaterials,
				...createdMaterials
			];
			
			const payload = {
				batch_id: Number(values.batch_id),
				materials: allMaterials.map((m) => ({
					material_id: Number(m.material_id),
					planned_qty: round3(m.planned_qty),
					actual_qty: round3(m.actual_qty),
					unit: m.unit,
					unit_price: Number(m.unit_price || 0),
					weighed_by: m.weighed_by ? Number(m.weighed_by) : null
				})),
				is_update: hasExistingData // ส่ง flag เพื่อบอกว่าเป็นการอัพเดท
			};
			
			await materialAPI.recordWeighing(payload);
			toast.success(hasExistingData ? 'อัพเดทการตวงวัตถุดิบสำเร็จ' : 'บันทึกการตวงวัตถุดิบสำเร็จ');
		} catch (error) {
			console.error('Error saving material weighing:', error);
			toast.error(error.response?.data?.error || 'บันทึกไม่สำเร็จ');
		} finally {
			setSaving(false);
		}
	};

	const totalQty = (watch('materials') || []).reduce((s, m) => s + (parseFloat(m.actual_qty) || 0), 0);
	const totalCost = (watch('materials') || []).reduce((s, m) => s + (parseFloat(m.actual_qty) || 0) * Number(m.unit_price || 0), 0);

	// ฟังก์ชัน Import จาก Clipboard
	const handleImportFromClipboard = async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (!text.trim()) {
				toast.error('ไม่มีข้อมูลใน Clipboard');
				return;
			}

			// Debug: แสดงข้อมูลที่ Copy มา
			console.log('Raw clipboard data:', text);
			console.log('Data length:', text.length);
			console.log('First 500 characters:', text.substring(0, 500));

			const materials = parseClipboardData(text);
			if (materials.length === 0) {
				toast.error('ไม่สามารถแปลงข้อมูลได้ - ตรวจสอบ Console เพื่อดูข้อมูล');
				return;
			}

			// จับคู่กับฐานข้อมูล
			const { matchedMaterials, unmatchedMaterials } = await matchMaterialsWithDatabase(materials);
			
			// รวมข้อมูลทั้งหมด (matched + unmatched)
			const allMaterials = [...matchedMaterials, ...unmatchedMaterials];
			
			// เรียงตามลำดับจาก Clipboard
			allMaterials.sort((a, b) => (a.clipboard_index || 0) - (b.clipboard_index || 0));

			// แทนที่ข้อมูลเดิม
			replace(allMaterials);
			setDataSource('clipboard');
			
			// แจ้งผลลัพธ์
			const successCount = matchedMaterials.length;
			const unmatchedCount = unmatchedMaterials.length;
			
			if (unmatchedCount > 0) {
				toast.success(`Import สำเร็จ ${successCount} รายการ, ไม่พบในฐานข้อมูล ${unmatchedCount} รายการ`);
			} else {
				toast.success(`Import ข้อมูล ${allMaterials.length} รายการสำเร็จ`);
			}
		} catch (error) {
			console.error('Error importing from clipboard:', error);
			toast.error('Import จาก Clipboard ไม่สำเร็จ');
		}
	};

	// Parse ข้อมูลจาก Clipboard
	const parseClipboardData = (text) => {
		// แทนที่ \r\n และ \r ด้วย \n เพื่อให้เป็นรูปแบบเดียวกัน
		const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		
		// แบ่งเป็นแถวตาม \n
		const lines = normalizedText.split('\n');
		const materials = [];
		let currentMaterial = null;
		let lineIndex = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const columns = line.split('\t');
			console.log(`Line ${i}:`, columns); // Debug log

			// ข้ามแถว Header
			if (i === 0 && columns[0] === 'ลำดับ' && columns[1] === 'Type') {
				console.log('Skipping header row');
				continue;
			}

			// ตรวจสอบว่าเป็นแถวที่มีข้อมูลรหัสสินค้า (เอาเฉพาะ Type O - วัตถุดิบ)
			const colsTrim = columns.map(c => (c || '').trim());
			if (columns.length >= 5 && (colsTrim[1] === 'O')) {
				// บันทึกข้อมูลแถวก่อนหน้า (ถ้ามี)
				if (currentMaterial) {
					materials.push(currentMaterial);
				}

				// เริ่มข้อมูลใหม่
				// หา Mat_Id จากคอลัมน์ที่เป็นตัวเลขยาว (อย่างน้อย 4 หลัก)
				let materialCode = colsTrim[4] || '';
				if (!/^\d{4,}$/.test(materialCode)) {
					const codeToken = colsTrim.find(t => /^\d{4,}$/.test(t));
					materialCode = codeToken || materialCode;
				}
				// ชื่ออาจอยู่คอลัมน์ถัดไปหรือย้ายไปบรรทัดถัดไป ให้ลองหยิบ token ถัดจากรหัสที่เป็นตัวอักษร
				let inlineName = '';
				const idIndex = colsTrim.indexOf(materialCode);
				if (idIndex >= 0) {
					inlineName = colsTrim.slice(idIndex + 1).find(t => /[ก-๙A-Za-z]/.test(t) && !/^\d+(?:\.\d+)?$/.test(t)) || '';
				} else {
					inlineName = (columns[5] || '').trim();
				}

				// ตรวจจับเคส "บรรทัดเดียวจบ" (single-line)
				const hasInlineNumbers = columns.length >= 10 && /\d/.test((columns[6] || '').toString()) && /\d/.test((columns[7] || '').toString());
				if (hasInlineNumbers) {
					const toNumber = (s) => {
						const cleaned = (s || '').toString().replace(/[^\d.-]/g, '');
						const n = parseFloat(cleaned);
						return isNaN(n) ? 0 : n;
					};
					const planned = toNumber(columns[6]);
					const actual = toNumber(columns[7]);
					let unit = (columns[8] || '').trim() || 'กก.';
					// ราคา/หน่วยอยู่ใกล้ท้ายบรรทัด (ก่อนมูลค่ารวม)
					const pricePerUnit = toNumber(columns[14] ?? columns[columns.length - 2]);

					materials.push({
						material_id: null,
						planned_qty: planned,
						actual_qty: String(actual || planned),
						unit,
						unit_price: pricePerUnit,
						weighed_by: null,
						Mat_Name: inlineName,
						Mat_Id: materialCode,
						is_custom: false,
						clipboard_index: lineIndex
					});
					lineIndex++;
					currentMaterial = null; // จบในบรรทัดเดียว
				} else {
					// รูปแบบหลายบรรทัด: สร้างโครง แล้วพยายามดึงตัวเลขจากบรรทัดถัดไปทันที (lookahead)
					const base = {
						material_id: null,
						planned_qty: 0,
						actual_qty: '0',
						unit: 'กก.',
						unit_price: 0,
						weighed_by: null,
						Mat_Name: inlineName || '',
						Mat_Id: materialCode,
						is_custom: false,
						clipboard_index: lineIndex
					};
					// หาแถวตัวเลขถัดไปที่มีอย่างน้อย 2 ตัวเลข
					let found = false;
					for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
						const probe = lines[j].trim();
						if (!probe) continue;
						const nums = (probe.match(/-?\d+(?:\.\d+)?/g) || []).map(v => parseFloat(v));
						if (nums.length >= 2) {
							// หน่วย: หา token ที่เป็นหน่วยที่รู้จักในบรรทัดเดียวกัน
							const probeCols = probe.split('\t').map(t => t.trim());
							const knownUnits = ['กก.', 'กรัม', 'ลิตร', 'มิลลิลิตร', 'ชิ้น', 'แพ็ค', 'แพค', 'ถุง', 'ขวด', 'ปี๊ป', 'กระป๋อง', 'ซอง', 'กก'];
							let unit = 'กก.';
							for (const t of probeCols) {
								if (knownUnits.includes(t)) { unit = t; break; }
								if (/[ก-๙A-Za-z]/.test(t) && !/^-?\d+(?:\.\d+)?$/.test(t)) { unit = t; break; }
							}
							const planned = nums[0] || 0;
							const actual = (typeof nums[1] !== 'undefined') ? nums[1] : planned;
							const pricePerUnit = nums.length >= 2 ? (nums[nums.length - 2] || 0) : 0;

							materials.push({ ...base, planned_qty: planned, actual_qty: String(actual), unit, unit_price: pricePerUnit });
							lineIndex++;
							found = true;
							i = j; // ขยับ index ถึงแถวที่ประมวลผลแล้ว
							break;
						}
					}
					if (!found) {
						currentMaterial = base; // ถ้ายังไม่เจอ ให้รอ logic ถัดไปประมวลผลตามเดิม
						lineIndex++;
					} else {
						currentMaterial = null; // จบแล้ว
					}
				}
			}
			// ตรวจสอบว่าเป็นแถวที่มีชื่อสินค้า (ไม่มี Type แต่มีชื่อ)
			else if (currentMaterial && columns.length >= 1 && !columns[0].match(/^\d+$/)) {
				currentMaterial.Mat_Name = columns[0]?.trim();
			}
			// ตรวจสอบว่าเป็นแถวที่มีข้อมูลจำนวนและราคา
			else if (currentMaterial) {
				// บางระบบจะมีจำนวนคอลัมน์ไม่แน่นอน จึงใช้ regex จับตัวเลขทั้งหมดจากทั้งบรรทัด
				const numberMatches = line.match(/-?\d+(?:\.\d+)?/g) || [];
				const toNumber = (s) => {
					const cleaned = (s || '').toString().replace(/[^\d.-]/g, '');
					const n = parseFloat(cleaned);
					return isNaN(n) ? 0 : n;
				};

				const quantity = toNumber(numberMatches[0]); // จำนวนตามสูตร
				const withdrawalQty = toNumber(numberMatches[1] ?? numberMatches[0]); // จำนวนจริง (จำนวนเบิก)
				// ราคา/หน่วย: สมมติเลขตัวสุดท้ายเป็นมูลค่ารวม เลขก่อนสุดท้ายเป็นราคาต่อหน่วย
				const pricePerUnit = toNumber(numberMatches[numberMatches.length - 2]);

				// หา 'หน่วยใหญ่' จากชุด token โดยหา unit ที่รู้จักตัวแรกหลังจากตัวเลขสองตัวแรก
				const knownUnits = ['กก.', 'กรัม', 'ลิตร', 'มิลลิลิตร', 'ชิ้น', 'แพ็ค', 'แพค', 'ถุง', 'ขวด', 'ปี๊ป', 'กระป๋อง', 'ซอง', 'กก'];
				let unit = 'กก.';
				for (let t of columns) {
					const token = (t || '').trim();
					if (!token) continue;
					if (knownUnits.includes(token)) { unit = token; break; }
					// เผื่อมีช่องว่าง/รูปแบบพิเศษ ให้เลือก token แรกที่มีตัวอักษรไทย
					if (/[ก-๙A-Za-z]/.test(token) && !/^-?\d+(?:\.\d+)?$/.test(token)) { unit = token; break; }
				}

				currentMaterial.planned_qty = quantity;
				currentMaterial.actual_qty = String(withdrawalQty);
				currentMaterial.unit = unit;
				currentMaterial.unit_price = pricePerUnit;

				console.log('Parsed numeric line:', { quantity, withdrawalQty, unit, pricePerUnit, numberMatches, columns });
			}
		}

		// เพิ่มข้อมูลแถวสุดท้าย
		if (currentMaterial) {
			materials.push(currentMaterial);
		}

		// กรองข้อมูลที่ไม่สมบูรณ์
		const validMaterials = materials.filter(m => 
			m.Mat_Id && 
			m.Mat_Name && 
			m.Mat_Id !== 'รหัสสินค้า' &&
			m.Mat_Name !== 'ชื่อสินค้า'
		);

		console.log('All materials before filter:', materials); // Debug log
		console.log('Valid materials after filter:', validMaterials); // Debug log
		
		// แสดงข้อมูลแต่ละรายการ
		validMaterials.forEach((material, index) => {
			console.log(`Material ${index + 1}:`, {
				Mat_Id: material.Mat_Id,
				Mat_Name: material.Mat_Name,
				planned_qty: material.planned_qty,
				actual_qty: material.actual_qty,
				unit: material.unit,
				unit_price: material.unit_price
			});
		});

		return validMaterials;
	};

	// จับคู่ข้อมูลกับฐานข้อมูล
	const matchMaterialsWithDatabase = async (materials) => {
		const matchedMaterials = [];
		const unmatchedMaterials = [];

		for (const material of materials) {
			try {
				// ค้นหาวัตถุดิบในฐานข้อมูล
				const res = await materialAPI.search(material.Mat_Id);
				const foundMaterials = res.data.data || [];

				// หาวัตถุดิบที่ตรงกัน
				const matched = foundMaterials.find(m => 
					m.Mat_Id === material.Mat_Id || 
					m.Mat_Name.includes(material.Mat_Name) ||
					material.Mat_Name.includes(m.Mat_Name)
				);

				if (matched) {
					matchedMaterials.push({
						...material,
						material_id: matched.id,
						Mat_Name: matched.Mat_Name,
						// คงค่าที่ได้จาก Clipboard เป็นหลัก ถ้าไม่มีค่อย fallback เป็นค่าจากฐานข้อมูล
						unit: material.unit || matched.Mat_Unit || 'กก.',
						unit_price: (material.unit_price && Number(material.unit_price) > 0)
							? material.unit_price
							: (matched.price || 0)
					});
				} else {
					unmatchedMaterials.push(material);
				}
			} catch (error) {
				console.error(`Error matching material ${material.Mat_Id}:`, error);
				unmatchedMaterials.push(material);
			}
		}

		return { matchedMaterials, unmatchedMaterials };
	};

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h2 className="text-lg font-semibold text-gray-900">ตวงวัตถุดิบ</h2>
				</div>
				<div className="card-body space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className="block text-sm text-gray-700 mb-1">ล็อต</label>
							<select className="input" {...register('batch_id')}>
								<option value="">-- เลือกล็อต --</option>
								{batches.map((b) => (
									<option key={b.id} value={b.id}>{b.batch_code} ({b.fg_code})</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">FG Code (สำหรับโหลด BOM)</label>
							<input type="text" className="input" placeholder="เช่น FG0001" {...register('fg_code')} />
						</div>
						<div className="flex items-end gap-2">
							<button type="button" className="btn btn-secondary" onClick={loadBOM} disabled={loading}>
								{loading ? 'กำลังโหลด...' : 'โหลด BOM'}
							</button>
							<button 
								type="button" 
								className="btn btn-primary flex items-center gap-2" 
								onClick={() => setShowAddMaterial(true)}
							>
								<Plus size={16} />
								เพิ่มวัตถุดิบ
							</button>
							<button 
								type="button" 
								className="btn btn-accent flex items-center gap-2" 
								onClick={handleImportFromClipboard}
							>
								<Clipboard size={16} />
								Import Clipboard
							</button>
						</div>
					</div>

					{/* แสดงสถานะข้อมูล */}
					{dataSource && (
						<div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
							<div className={`w-3 h-3 rounded-full ${
								dataSource === 'existing' ? 'bg-green-500' : 
								dataSource === 'clipboard' ? 'bg-purple-500' : 'bg-blue-500'
							}`}></div>
							<span className="text-sm text-gray-700">
								{dataSource === 'existing' && 'โหลดข้อมูลการตวงที่มีอยู่แล้ว (สามารถแก้ไขได้)'}
								{dataSource === 'bom' && 'โหลดข้อมูลจาก BOM (ข้อมูลใหม่)'}
								{dataSource === 'clipboard' && 'โหลดข้อมูลจาก Clipboard (สามารถแก้ไขได้)'}
							</span>
						</div>
					)}

					{/* Modal เพิ่มวัตถุดิบ */}
					{showAddMaterial && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
							<div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
								<div className="flex justify-between items-center mb-4">
									<h3 className="text-lg font-semibold">เพิ่มวัตถุดิบ</h3>
									<button 
										onClick={() => setShowAddMaterial(false)}
										className="text-gray-500 hover:text-gray-700"
									>
										<X size={20} />
									</button>
								</div>
								
								{/* ค้นหาวัตถุดิบที่มีอยู่ */}
								<div className="mb-6">
									<h4 className="font-medium mb-2">ค้นหาวัตถุดิบที่มีอยู่</h4>
									<div className="flex gap-2 mb-3">
										<div className="flex-1 relative">
											<Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
											<input
												type="text"
												className="input pl-10"
												placeholder="ค้นหาจากชื่อหรือรหัสวัตถุดิบ..."
												value={searchQuery}
												onChange={(e) => {
													setSearchQuery(e.target.value);
													searchMaterials(e.target.value);
												}}
											/>
										</div>
									</div>
									
									{searching && <p className="text-sm text-gray-500">กำลังค้นหา...</p>}
									
									{searchResults.length > 0 && (
										<div className="border rounded-lg max-h-40 overflow-y-auto">
											{searchResults.map((material) => (
												<div
													key={material.id}
													className="p-3 border-b hover:bg-gray-50 cursor-pointer"
													onClick={() => addExistingMaterial(material)}
												>
													<div className="font-medium">{material.Mat_Name}</div>
													<div className="text-sm text-gray-600">
														รหัส: {material.Mat_Id} | หน่วย: {material.Mat_Unit} | ราคา: {formatCurrency(material.price || 0)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
								
								{/* เพิ่มวัตถุดิบใหม่ */}
								<div>
									<h4 className="font-medium mb-2">เพิ่มวัตถุดิบใหม่</h4>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm text-gray-700 mb-1">รหัสวัตถุดิบ</label>
											<input
												type="text"
												className="input"
												placeholder="เช่น MAT001"
												value={newMaterial.Mat_Id}
												onChange={(e) => setNewMaterial(prev => ({ ...prev, Mat_Id: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm text-gray-700 mb-1">ชื่อวัตถุดิบ *</label>
											<input
												type="text"
												className="input"
												placeholder="ชื่อวัตถุดิบ"
												value={newMaterial.Mat_Name}
												onChange={(e) => setNewMaterial(prev => ({ ...prev, Mat_Name: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm text-gray-700 mb-1">หน่วย</label>
											<select
												className="input"
												value={newMaterial.Mat_Unit}
												onChange={(e) => setNewMaterial(prev => ({ ...prev, Mat_Unit: e.target.value }))}
											>
												<option value="กก.">กก.</option>
												<option value="กรัม">กรัม</option>
												<option value="ลิตร">ลิตร</option>
												<option value="มิลลิลิตร">มิลลิลิตร</option>
												<option value="ชิ้น">ชิ้น</option>
												<option value="ถุง">ถุง</option>
												<option value="ขวด">ขวด</option>
											</select>
										</div>
										<div>
											<label className="block text-sm text-gray-700 mb-1">ราคาต่อหน่วย</label>
											<input
												type="number"
												step="0.01"
												className="input"
												placeholder="0.00"
												value={newMaterial.price}
												onChange={(e) => setNewMaterial(prev => ({ ...prev, price: e.target.value }))}
											/>
										</div>
									</div>
									<div className="mt-4">
										<button
											type="button"
											className="btn btn-primary"
											onClick={addCustomMaterial}
										>
											เพิ่มวัตถุดิบใหม่
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					<div className="overflow-x-auto">
						<table className="table">
							<thead>
								<tr>
									<th>วัตถุดิบ</th>
									<th>ตามสูตร</th>
									<th>จำนวนจริง</th>
									<th>หน่วย</th>
									<th>ราคา/หน่วย</th>
									<th>มูลค่า</th>
									<th>จัดการ</th>
								</tr>
							</thead>
							<tbody>
								{fields.map((field, idx) => (
									<tr key={field.id}>
										<td>
											{field.Mat_Name || '-'}
											{field.is_custom && (
												<span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
													ใหม่
												</span>
											)}
										</td>
										<td>{formatNumber(field.planned_qty, 3)}</td>
										<td>
											<input type="number" step="0.001" className="input" placeholder={String(formatNumber(field.planned_qty, 3))}
												{...register(`materials.${idx}.actual_qty`)} />
											<input type="hidden" {...register(`materials.${idx}.material_id`)} />
											<input type="hidden" {...register(`materials.${idx}.is_custom`)} />
										</td>
										<td>
											<input type="text" className="input" {...register(`materials.${idx}.unit`)} />
										</td>
										<td>
											<input type="number" step="0.01" className="input" {...register(`materials.${idx}.unit_price`)} />
										</td>
										<td className="font-medium">
											{formatCurrency(round3(watch(`materials.${idx}.actual_qty`) || 0) * Number(watch(`materials.${idx}.unit_price`) || 0))}
										</td>
										<td>
											<button
												type="button"
												className="text-red-600 hover:text-red-800"
												onClick={() => remove(idx)}
											>
												<X size={16} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-between">
						<div className="text-sm text-gray-700">
							รวมจำนวน: <span className="font-semibold">{formatNumber(totalQty, 3)}</span>
							&nbsp;|&nbsp; มูลค่าวัตถุดิบรวม: <span className="font-semibold">{formatCurrency(totalCost)}</span>
						</div>
						<button className="btn btn-primary" onClick={handleSubmit(onSave)} disabled={saving || !batchId || fields.length === 0}>
							{saving ? 'กำลังบันทึก...' : 'บันทึกการตวง'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MaterialWeighing;
