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
	const [showHelpModal, setShowHelpModal] = useState(false);
	const [showManualInputModal, setShowManualInputModal] = useState(false);
	const [manualInputText, setManualInputText] = useState('');
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
				toast.error('เลือกล็อตและรายการวัตถุดิบก่อน (โหลด BOM หรือ Import จาก Clipboard)');
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
			let text = '';
			
			// วิธีที่ 1: ลองใช้ Clipboard API ใหม่
			if (navigator.clipboard && navigator.clipboard.readText) {
				try {
					text = await navigator.clipboard.readText();
					console.log('✅ Successfully read from clipboard API');
				} catch (clipboardError) {
					console.warn('⚠️ Clipboard API failed:', clipboardError);
					// ถ้า Clipboard API ไม่ทำงาน ให้ใช้ fallback method
					text = await fallbackClipboardRead();
				}
			} else {
				console.log('⚠️ Clipboard API not available, using fallback');
				text = await fallbackClipboardRead();
			}

			if (!text.trim()) {
				// วิธีที่ 2: ถ้าไม่มีข้อมูล ให้ใช้วิธี Manual Input
				openManualInputModal();
				return;
			}

			// Debug: แสดงข้อมูลที่ Copy มา
			console.log('📋 Raw clipboard data:', text);
			console.log('📏 Data length:', text.length);
			console.log('🔍 First 500 characters:', text.substring(0, 500));

			const materials = parseClipboardData(text);
			if (materials.length === 0) {
							// วิธีที่ 3: ถ้าแปลงข้อมูลไม่ได้ ให้ใช้วิธี Manual Input
			toast.error('ไม่สามารถแปลงข้อมูลได้ - ใช้วิธี Manual Input แทน');
			openManualInputModal();
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
			const newMaterialCount = unmatchedMaterials.length;
			
			if (newMaterialCount > 0) {
				toast.success(`Import สำเร็จ: พบในฐานข้อมูล ${successCount} รายการ, จะสร้างใหม่ ${newMaterialCount} รายการ`);
			} else {
				toast.success(`Import ข้อมูล ${allMaterials.length} รายการสำเร็จ (ทั้งหมดมีในฐานข้อมูลแล้ว)`);
			}
		} catch (error) {
			console.error('❌ Error importing from clipboard:', error);
			toast.error('Import จาก Clipboard ไม่สำเร็จ - ใช้วิธี Manual Input แทน');
			openManualInputModal();
		}
	};

	// Fallback method สำหรับอ่าน Clipboard
	const fallbackClipboardRead = () => {
		return new Promise((resolve, reject) => {
			// สร้าง textarea ซ่อนไว้
			const textarea = document.createElement('textarea');
			textarea.style.position = 'fixed';
			textarea.style.left = '-9999px';
			textarea.style.top = '-9999px';
			document.body.appendChild(textarea);
			
			// Focus และ paste
			textarea.focus();
			document.execCommand('paste');
			
			const text = textarea.value;
			document.body.removeChild(textarea);
			
			if (text) {
				resolve(text);
			} else {
				reject(new Error('ไม่สามารถอ่านข้อมูลจาก Clipboard ได้ กรุณาตรวจสอบว่าได้คัดลอกข้อมูลแล้ว'));
			}
		});
	};

	// แสดงคำแนะนำการใช้ Clipboard
	const showClipboardHelp = () => {
		setShowHelpModal(true);
	};

	// แสดง Manual Input Modal
	const openManualInputModal = () => {
		setShowManualInputModal(true);
	};

	// จัดการ Manual Input
	const handleManualInput = async () => {
		try {
			if (!manualInputText.trim()) {
				toast.error('กรุณาใส่ข้อมูล');
				return;
			}

			console.log('📋 Manual input data:', manualInputText);
			const materials = parseClipboardData(manualInputText);
			
			if (materials.length === 0) {
				toast.error('ไม่สามารถแปลงข้อมูลได้ - ตรวจสอบรูปแบบข้อมูล');
				return;
			}

			// จับคู่กับฐานข้อมูล
			const { matchedMaterials, unmatchedMaterials } = await matchMaterialsWithDatabase(materials);
			
			// รวมข้อมูลทั้งหมด
			const allMaterials = [...matchedMaterials, ...unmatchedMaterials];
			allMaterials.sort((a, b) => (a.clipboard_index || 0) - (b.clipboard_index || 0));

			// แทนที่ข้อมูลเดิม
			replace(allMaterials);
			setDataSource('manual');
			setShowManualInputModal(false);
			setManualInputText('');
			
			// แจ้งผลลัพธ์
			const successCount = matchedMaterials.length;
			const unmatchedCount = unmatchedMaterials.length;
			
			if (unmatchedCount > 0) {
				toast.success(`Import สำเร็จ ${successCount} รายการ, ไม่พบในฐานข้อมูล ${unmatchedCount} รายการ`);
			} else {
				toast.success(`Import ข้อมูล ${allMaterials.length} รายการสำเร็จ`);
			}
		} catch (error) {
			console.error('❌ Error processing manual input:', error);
			toast.error('ประมวลผลข้อมูลไม่สำเร็จ: ' + error.message);
		}
	};

	// Parse ข้อมูลจาก Clipboard
	const parseClipboardData = (text) => {
		// แทนที่ \r\n และ \r ด้วย \n เพื่อให้เป็นรูปแบบเดียวกัน
		const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		
		// แบ่งเป็นแถวตาม \n
		const lines = normalizedText.split('\n');
		const materials = [];
		let lineIndex = 0;

		console.log('Parsing clipboard data...');
		console.log('Total lines:', lines.length);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const columns = line.split('\t');
			const colsTrim = columns.map(c => (c || '').trim());
			
			console.log(`Line ${i}:`, colsTrim);

			// ข้ามแถว Header
			if (i === 0 && (colsTrim[0] === 'ลำดับ' || colsTrim[0] === 'Order')) {
				console.log('Skipping header row');
				continue;
			}

			// ตรวจสอบว่าเป็นแถวที่มีข้อมูล (มีลำดับและ Type)
			if (colsTrim.length >= 5 && /^\d+$/.test(colsTrim[0]) && (colsTrim[1] === 'I' || colsTrim[1] === 'O')) {
				console.log(`Processing line ${i} as material`);
				
				// ดึงข้อมูลตามโครงสร้างใหม่
				const orderNumber = parseInt(colsTrim[0]) || 0;
				const type = colsTrim[1]; // I = FG, O = วัตถุดิบ
				const materialCode = colsTrim[4] || ''; // รหัสสินค้า
				const materialName = colsTrim[5] || ''; // ชื่อสินค้า
				const plannedQty = parseFloat(colsTrim[6]) || 0; // จำนวน
				const actualQty = parseFloat(colsTrim[7]) || plannedQty; // จำนวนเบิก (ถ้าว่างให้ใช้จำนวนวางแผน)
				const unit = colsTrim[8] || 'กก.'; // หน่วยใหญ่
				const pricePerUnit = parseFloat(colsTrim[14]) || 0; // ราคา/หน่วย

				console.log(`Parsed: Code=${materialCode}, Name=${materialName}, Type=${type}, Planned=${plannedQty}, Actual=${actualQty}, Unit=${unit}, Price=${pricePerUnit}`);

				// สร้างข้อมูลวัตถุดิบ (เฉพาะ Type O)
				if (materialName && materialCode && type === 'O') {
					materials.push({
						material_id: null,
						planned_qty: plannedQty,
						actual_qty: String(actualQty),
						unit,
						unit_price: pricePerUnit,
						weighed_by: null,
						Mat_Name: materialName,
						Mat_Id: materialCode,
						is_custom: false,
						clipboard_index: lineIndex
					});
					lineIndex++;
					console.log(`Added material: ${materialName}, Qty: ${actualQty} ${unit}`);
				}
			}
		}

		console.log('Total materials found:', materials.length);
		return materials;
	};

	// จับคู่ข้อมูลกับฐานข้อมูลและสร้างวัตถุดิบใหม่อัตโนมัติ
	const matchMaterialsWithDatabase = async (materials) => {
		const matchedMaterials = [];
		const unmatchedMaterials = [];

		for (const material of materials) {
			try {
				// ค้นหาวัตถุดิบในฐานข้อมูล - ลองหาทั้งรหัสและชื่อ
				const searchQueries = [
					material.Mat_Id,
					material.Mat_Name
				].filter(q => q && q.trim());

				let matched = null;
				
				for (const query of searchQueries) {
					try {
						const res = await materialAPI.search(query);
						const foundMaterials = res.data.data || [];

						// หาวัตถุดิบที่ตรงกัน (เข้มงวดขึ้น)
						matched = foundMaterials.find(m => 
							m.Mat_Id === material.Mat_Id || 
							m.Mat_Id.toLowerCase() === material.Mat_Id.toLowerCase() ||
							m.Mat_Name.toLowerCase().includes(material.Mat_Name.toLowerCase()) ||
							material.Mat_Name.toLowerCase().includes(m.Mat_Name.toLowerCase())
						);
						
						if (matched) break;
					} catch (searchError) {
						console.warn(`Search failed for query: ${query}`, searchError);
					}
				}

				if (matched) {
					matchedMaterials.push({
						...material,
						material_id: matched.id,
						Mat_Name: matched.Mat_Name,
						// คงค่าที่ได้จาก Clipboard เป็นหลัก ถ้าไม่มีค่อย fallback เป็นค่าจากฐานข้อมูล
						unit: material.unit || matched.Mat_Unit || 'กก.',
						unit_price: (material.unit_price && Number(material.unit_price) > 0)
							? material.unit_price
							: (matched.price || 0),
						is_custom: false
					});
				} else {
					// สร้างวัตถุดิบใหม่อัตโนมัติสำหรับรายการที่ไม่พบ
					console.log(`Material not found in database: ${material.Mat_Id} - ${material.Mat_Name}, creating as custom material`);
					unmatchedMaterials.push({
						...material,
						material_id: null, // จะได้ค่าหลังจากสร้างใน database
						is_custom: true, // ทำเครื่องหมายว่าเป็นวัตถุดิบใหม่
						Mat_Id: material.Mat_Id || `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
						Mat_Name: material.Mat_Name || 'วัตถุดิบใหม่',
						unit: material.unit || 'กก.',
						unit_price: material.unit_price || 0
					});
				}
			} catch (error) {
				console.error(`Error matching material ${material.Mat_Id}:`, error);
				// ถ้าเกิดข้อผิดพลาด ให้สร้างเป็นวัตถุดิบใหม่
				unmatchedMaterials.push({
					...material,
					material_id: null,
					is_custom: true,
					Mat_Id: material.Mat_Id || `ERROR_${Date.now()}`,
					Mat_Name: material.Mat_Name || 'วัตถุดิบใหม่',
					unit: material.unit || 'กก.',
					unit_price: material.unit_price || 0
				});
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
								title="Import ข้อมูลจาก Clipboard (ไม่จำเป็นต้องมี BOM)"
							>
								<Clipboard size={16} />
								Import Clipboard
							</button>
							<button
								type="button"
								onClick={() => showClipboardHelp()}
								className="btn btn-outline flex items-center gap-2"
								title="วิธีใช้ Import Clipboard"
							>
								?
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

			{/* Manual Input Modal */}
			{showManualInputModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold">Manual Input - ใส่ข้อมูลด้วยตนเอง</h2>
							<button
								onClick={() => setShowManualInputModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								<X size={24} />
							</button>
						</div>

						<div className="space-y-4">
							<div className="bg-blue-50 p-4 rounded-lg">
								<h3 className="font-semibold text-blue-800 mb-2">📋 วิธีใช้:</h3>
								<ol className="list-decimal list-inside space-y-2 text-sm">
									<li>คัดลอกข้อมูลจาก Excel (Ctrl+C)</li>
									<li>วางข้อมูลในช่องด้านล่าง (Ctrl+V)</li>
									<li>คลิก "ประมวลผลข้อมูล"</li>
									<li>ตรวจสอบข้อมูลในตาราง</li>
								</ol>
							</div>

							<div className="bg-yellow-50 p-4 rounded-lg">
								<h3 className="font-semibold text-yellow-800 mb-2">⚠️ รูปแบบข้อมูลที่ต้องการ:</h3>
								<div className="text-sm">
									<p className="mb-2">ข้อมูลต้องมีคอลัมน์ดังนี้ (คั่นด้วย Tab):</p>
									<code className="bg-gray-100 p-2 rounded text-xs block">
										ลำดับ	Type	เลือก	ลบ	รหัสสินค้า	ชื่อสินค้า	จำนวน	จำนวนเบิก	หน่วยใหญ่	%	ค่าแปลง	หน่วยย่อย	จำนวนคุมสต็อก	หน่วยคุมสต๊อก	ราคา/หน่วย	ราคาสินค้า
									</code>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									ข้อมูลจาก Clipboard (วางข้อมูลที่นี่):
								</label>
								<textarea
									value={manualInputText}
									onChange={(e) => setManualInputText(e.target.value)}
									className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none"
									placeholder="วางข้อมูลจาก Excel ที่นี่..."
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3 mt-6">
							<button
								onClick={() => setShowManualInputModal(false)}
								className="btn btn-secondary"
							>
								ยกเลิก
							</button>
							<button
								onClick={handleManualInput}
								className="btn btn-primary"
							>
								ประมวลผลข้อมูล
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Help Modal */}
			{showHelpModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold">วิธีใช้ Import Clipboard</h2>
							<button
								onClick={() => setShowHelpModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								<X size={24} />
							</button>
						</div>

						<div className="space-y-4">
							<div className="bg-blue-50 p-4 rounded-lg">
								<h3 className="font-semibold text-blue-800 mb-2">📋 ขั้นตอนการใช้งาน:</h3>
								<ol className="list-decimal list-inside space-y-2 text-sm">
									<li>เปิดไฟล์ Excel ที่มีข้อมูลวัตถุดิบ</li>
									<li>เลือกข้อมูลที่ต้องการ (Ctrl+A หรือลากเลือก)</li>
									<li>คัดลอกข้อมูล (Ctrl+C)</li>
									<li>กลับมาที่หน้าเว็บและคลิกปุ่ม "Import Clipboard"</li>
									<li>ตรวจสอบข้อมูลในตาราง</li>
									<li>คลิก "บันทึกการตวง" เพื่อบันทึก</li>
								</ol>
							</div>

							<div className="bg-yellow-50 p-4 rounded-lg">
								<h3 className="font-semibold text-yellow-800 mb-2">⚠️ หาก Import ไม่สำเร็จ:</h3>
								<ul className="list-disc list-inside space-y-1 text-sm">
									<li>ตรวจสอบว่าได้คัดลอกข้อมูลแล้ว</li>
									<li>ลองใช้ Ctrl+V ใน Notepad ก่อน เพื่อตรวจสอบข้อมูล</li>
									<li>หากใช้ HTTPS ให้ตรวจสอบว่า browser อนุญาต Clipboard access</li>
									<li>ลองรีเฟรชหน้าเว็บและทำซ้ำ</li>
									<li><strong>หากยังไม่ทำงาน:</strong> ระบบจะเปิด Manual Input Modal ให้ใส่ข้อมูลด้วยตนเอง</li>
								</ul>
							</div>

							<div className="bg-green-50 p-4 rounded-lg">
								<h3 className="font-semibold text-green-800 mb-2">✅ รูปแบบข้อมูลที่รองรับ:</h3>
								<ul className="list-disc list-inside space-y-1 text-sm">
									<li>ข้อมูลจาก Excel ที่คัดลอกมา (Tab-separated)</li>
									<li>ต้องมีคอลัมน์ Type = 'O' สำหรับวัตถุดิบ</li>
									<li>ต้องมีคอลัมน์จำนวนวางแผนและจำนวนเบิก</li>
									<li>ระบบจะจับคู่กับฐานข้อมูลอัตโนมัติ</li>
								</ul>
							</div>

							<div className="bg-purple-50 p-4 rounded-lg">
								<h3 className="font-semibold text-purple-800 mb-2">🔧 การแก้ไขปัญหา:</h3>
								<ul className="list-disc list-inside space-y-1 text-sm">
									<li><strong>Clipboard API ไม่ทำงาน:</strong> ระบบจะใช้ fallback method อัตโนมัติ</li>
									<li><strong>ข้อมูลไม่แสดง:</strong> ตรวจสอบ Console (F12) เพื่อดู error</li>
									<li><strong>ข้อมูลผิด:</strong> ตรวจสอบรูปแบบข้อมูลใน Excel</li>
									<li><strong>Browser เก่า:</strong> ใช้ Chrome, Firefox, Edge เวอร์ชันใหม่</li>
								</ul>
							</div>
						</div>

						<div className="flex justify-end mt-6">
							<button
								onClick={() => setShowHelpModal(false)}
								className="btn btn-primary"
							>
								เข้าใจแล้ว
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default MaterialWeighing;
