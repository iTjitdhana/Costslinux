import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { workplanAPI, materialAPI, formatCurrency, formatNumber, formatNumberPreservePrecision, pricesAPI } from '../services/api';
import { Plus, Search, X, Clipboard, Eye, Edit, Save, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';

const InventoryData = () => {
	const { register, handleSubmit, control, reset, watch, setValue } = useForm({
		defaultValues: {
			workplan_id: '',
			job_code: '',
			job_name: '',
			fg_code: '',
			materials: []
		}
	});
	const { fields, replace, append, remove } = useFieldArray({ control, name: 'materials' });

	const [workplans, setWorkplans] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [previewData, setPreviewData] = useState([]);
	const [dataSource, setDataSource] = useState('');
	const [showHelpModal, setShowHelpModal] = useState(false);
	const [showManualInputModal, setShowManualInputModal] = useState(false);
	const [manualInputText, setManualInputText] = useState('');
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // วันปัจจุบันเป็นค่าเริ่มต้น
	const [latestPrices, setLatestPrices] = useState({}); // { material_id: { price_per_unit, display_unit, currency } }

	// AbortController refs for canceling API calls
	const bomAbortController = useRef(null);
	const priceAbortController = useRef(null);

	const workplanId = watch('workplan_id');
	const jobCode = watch('job_code');
	const jobName = watch('job_name');
	
	// จัดเรียงรายการวัตถุดิบตามชื่อสินค้า (ก-ฮ)
	const sortedFields = React.useMemo(() => {
		return (fields || [])
			.map((f, i) => ({ ...f, _idx: i }))
			.sort((a, b) => (a.Mat_Name || '').localeCompare(b.Mat_Name || '', 'th'));
	}, [fields]);
	
	// หา workplan ที่เลือกไว้ เพื่อแสดงเป็นแถวแรกของข้อมูลวัตถุดิบ (บอกว่างานอะไร)
	const selectedWorkplanObj = React.useMemo(() => {
		try {
			return workplans.find(w => String(w.id) === String(workplanId)) || null;
		} catch (_) {
			return null;
		}
	}, [workplans, workplanId]);

	// ข้อมูลที่ใช้แสดงในแถวสรุปงาน
	const jobRowCode = jobCode || selectedWorkplanObj?.job_code || '';
	const jobRowName = jobName || selectedWorkplanObj?.job_name_th || selectedWorkplanObj?.job_name || '';

	const loadWorkplans = async (date = selectedDate) => {
		try {
			const res = await workplanAPI.getByDate(date);
			setWorkplans(res.data.data || []);
		} catch (error) {
			console.error('Error loading workplans:', error);
			
			// ปรับปรุง error message
			const errorMessage = error.response?.data?.error || 
								 error.message || 
								 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
			toast.error(`โหลดงานไม่สำเร็จ: ${errorMessage}`);
		}
	};

	// Helper: load latest prices for current materials (by material_id)
	const loadLatestPricesForMaterials = React.useCallback(async (materialIds) => {
		try {
			const ids = Array.from(new Set((materialIds || []).filter(id => id && Number.isFinite(id))));
			if (ids.length === 0) {
				setLatestPrices({});
				return;
			}
			const res = await pricesAPI.getLatestBatch(ids);
			const rows = res.data || [];
			const map = {};
			for (const row of rows) {
				map[row.material_id] = row;
			}
			setLatestPrices(map);
		} catch (e) {
			console.error('Error loading latest prices:', e);
			
			// ปรับปรุง error message
			if (e.name !== 'AbortError') {
				const errorMessage = e.response?.data?.error || e.message || 'เกิดข้อผิดพลาดในการโหลดราคา';
				toast.error(`โหลดราคาไม่สำเร็จ: ${errorMessage}`);
			}
		}
	}, []);

	// Memoized materialIds for performance
	const materialIdsString = useMemo(() => 
		(fields || [])
			.map(f => f.material_id)
			.filter(id => id && Number.isFinite(id))
			.join(','), 
		[fields]
	);

	// Trigger price load after materials change (BOM/saved/import)
	useEffect(() => {
		const materialIds = materialIdsString ? materialIdsString.split(',').map(Number) : [];
		
		if (materialIds.length > 0) {
			loadLatestPricesForMaterials(materialIds);
		}
	}, [materialIdsString, loadLatestPricesForMaterials]);

	// โหลด BOM ตาม job_code
	const loadBOMByJobCode = async (jobCode) => {
		try {
			if (!jobCode) {
				toast.error('เลือกงาน');
				return;
			}
			
			// Cancel previous BOM request if exists
			if (bomAbortController.current) {
				bomAbortController.current.abort();
			}
			bomAbortController.current = new AbortController();
			
			setLoading(true);
			const res = await materialAPI.getBOMByJobCode(jobCode);
			const bomData = res.data.data || [];
			
			if (bomData.length === 0) {
				toast.error(`ไม่พบสูตร BOM สำหรับงาน ${jobCode} กรุณาใช้ Import Clipboard แทน`);
				setDataSource('');
				replace([]); // ล้างข้อมูลวัตถุดิบ
				return;
			}
			
			const bom = bomData.map((item) => {
				// Validate และแปลง Raw_Code เป็น number
				if (!item || !item.Raw_Code) {
					console.warn('Invalid BOM item:', item);
					return null;
				}
				
				const materialId = parseInt(item.Raw_Code, 10);
				if (isNaN(materialId) || materialId <= 0) {
					console.warn(`Invalid Raw_Code: ${item.Raw_Code}, skipping item`);
					return null;
				}
				
				console.log(`BOM item: ${item.Mat_Name}, Raw_Code: ${item.Raw_Code}, material_id: ${materialId}, is_fg: ${item.is_fg}`);
				
				return {
					material_id: materialId,
					planned_qty: Number(item.Raw_Qty) || 0,
					actual_qty: '', // เริ่มต้นว่าง ให้ผู้ใช้ใส่เอง
					unit: item.Mat_Unit || 'กก.',
					unit_price: Number(item.price) || 0,
					weighed_by: null,
					Mat_Name: item.Mat_Name || 'Unknown',
					Mat_Id: item.Raw_Code,
					is_fg: item.is_fg === '1' || item.is_fg === 1,
					is_custom: false
				};
			}).filter(Boolean); // กรอง null values ออก

			// กรองกรณีสูตรอ้างอิงวัตถุดิบเป็นตัวเอง (Raw_Code เท่ากับ FG/Job Code)
			const jobCodeNum = parseInt(jobCode, 10);
			const baseBom = isNaN(jobCodeNum)
				? bom
				: bom.filter(it => it.material_id !== jobCodeNum);
			
			// กรองรายการซ้ำ โดยเก็บเฉพาะ FG หากมี Raw Material ซ้ำ
			let uniqueBom = [];
			const materialIdMap = new Map(); // เก็บ material_id และ priority (FG > Raw Material)
			
			// ผ่าน 1: เก็บ FG ก่อน (priority สูง)
			baseBom.forEach(item => {
				if (item.is_fg) {
					materialIdMap.set(item.material_id, item);
					console.log(`Added FG: ${item.material_id} (${item.Mat_Name})`);
				}
			});
			
			// ผ่าน 2: เก็บ Raw Material เฉพาะที่ไม่ซ้ำกับ FG
			baseBom.forEach(item => {
				if (!item.is_fg && !materialIdMap.has(item.material_id)) {
					materialIdMap.set(item.material_id, item);
					console.log(`Added Raw Material: ${item.material_id} (${item.Mat_Name})`);
				} else if (!item.is_fg && materialIdMap.has(item.material_id)) {
					console.log(`Skipped duplicate Raw Material: ${item.material_id} (${item.Mat_Name})`);
				}
			});
			
			// แปลง Map กลับเป็น Array
			uniqueBom = Array.from(materialIdMap.values());
			
			console.log(`Original BOM items: ${bom.length}`);
			console.log(`After self-reference filter: ${baseBom.length}`);
			console.log(`Unique BOM items: ${uniqueBom.length}`);
			console.log(`Removed ${bom.length - uniqueBom.length} duplicate items`);
			console.log('Unique BOM data:', uniqueBom.map(item => ({ material_id: item.material_id, Mat_Name: item.Mat_Name, is_fg: item.is_fg })));
			replace(uniqueBom);
			setDataSource('bom');
			toast.success(`โหลดสูตร BOM สำเร็จ (${uniqueBom.length} รายการ)`);
		} catch (error) {
			console.error('Error loading BOM:', error);
			
			// ปรับปรุง error message ให้ละเอียดขึ้น
			let errorMessage = 'โหลดสูตร BOM ไม่สำเร็จ';
			if (error.name === 'AbortError') {
				return; // ถูก cancel ไม่ต้องแสดง error
			} else if (error.response?.data?.error) {
				errorMessage = `โหลดสูตร BOM ไม่สำเร็จ: ${error.response.data.error}`;
			} else if (error.message) {
				errorMessage = `โหลดสูตร BOM ไม่สำเร็จ: ${error.message}`;
			}
			
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// โหลดข้อมูลที่เคยบันทึก
	const loadSavedData = async (workplanId) => {
		try {
			if (!workplanId) return false;
			
			setLoading(true);
			const res = await materialAPI.getSavedInventoryData(workplanId);
			const savedData = res.data.data || null;
			
			if (savedData) {
				// แสดงข้อมูลที่เคยบันทึก
				const materials = savedData.materials || [];
				replace(materials);
				setDataSource('saved');
				toast.success(`โหลดข้อมูลที่เคยบันทึกสำเร็จ (${materials.length} รายการ)`);
				return true;
			} else {
				// ถ้าไม่มีข้อมูลที่บันทึก ให้โหลด BOM ทันที
				const jobCode = watch('job_code');
				if (jobCode) {
					await loadBOMByJobCode(jobCode); // ใช้ jobCode แทน selectedWorkplanObj?.id
				}
				return false;
			}
		} catch (error) {
			console.error('Error loading saved data:', error);
			// ถ้าโหลดข้อมูลที่บันทึกไม่สำเร็จ ให้โหลด BOM
			const jobCode = watch('job_code');
			if (jobCode) {
				await loadBOMByJobCode(jobCode); // ใช้ jobCode แทน selectedWorkplanObj?.id
			}
			return false;
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { 
		loadWorkplans(); 
		
		// Cleanup function
		return () => {
			// Cancel any pending API calls when component unmounts
			if (bomAbortController.current) {
				bomAbortController.current.abort();
			}
			if (priceAbortController.current) {
				priceAbortController.current.abort();
			}
		};
	}, [selectedDate]);

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

			console.log('📋 Raw clipboard data:', text);
			const materials = parseClipboardData(text);
			if (materials.length === 0) {
				// วิธีที่ 3: ถ้าแปลงข้อมูลไม่ได้ ให้ใช้วิธี Manual Input
				toast.error('ไม่สามารถแปลงข้อมูลได้ - ใช้วิธี Manual Input แทน');
				openManualInputModal();
				return;
			}

			// จับคู่กับฐานข้อมูล
			const { matchedMaterials, unmatchedMaterials } = await matchMaterialsWithDatabase(materials);
			const allMaterials = [...matchedMaterials, ...unmatchedMaterials];
			allMaterials.sort((a, b) => (a.clipboard_index || 0) - (b.clipboard_index || 0));

			// แสดง Preview Modal
			setPreviewData(allMaterials);
			setShowPreviewModal(true);
			
		} catch (error) {
			console.error('❌ Error importing from clipboard:', error);
			
			// ปรับปรุง error message
			let errorMessage = 'Import จาก Clipboard ไม่สำเร็จ';
			if (error.name === 'NotAllowedError') {
				errorMessage = 'ไม่สามารถเข้าถึง Clipboard ได้ - กรุณาอนุญาตการเข้าถึง';
			} else if (error.name === 'NotFoundError') {
				errorMessage = 'ไม่พบข้อมูลใน Clipboard';
			} else if (error.message) {
				errorMessage = `Import ไม่สำเร็จ: ${error.message}`;
			}
			
			toast.error(`${errorMessage} - ใช้วิธี Manual Input แทน`);
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

			// แสดง Preview Modal
			setPreviewData(allMaterials);
			setShowManualInputModal(false);
			setManualInputText('');
			setShowPreviewModal(true);
			
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
		const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
				
				// Validate ข้อมูลหลัก
				if (!materialCode.trim() || !materialName.trim()) {
					console.warn(`Skipping line ${i}: missing material code or name`);
					continue;
				}
				// จำนวนวางแผน (อาจเป็น 0 ได้)
				const plannedQtyParsed = parseFloat(colsTrim[6]);
				const plannedQty = isNaN(plannedQtyParsed) ? 0 : plannedQtyParsed; // ถ้าเว้นว่าง = 0
				// จำนวนเบิก: ถ้า "ค่าว่างจริงๆ" ให้เป็น 0 (ไม่ fallback เป็นจำนวนวางแผน)
				const hasActualCol = colsTrim.length > 7;
				const actualText = hasActualCol ? colsTrim[7] : '';
				const actualQty = actualText === '' ? 0 : (parseFloat(actualText) || 0);
				const unit = colsTrim[8] || 'กก.'; // หน่วยใหญ่
				const pricePerUnit = parseFloat(colsTrim[14]) || 0; // ราคา/หน่วย

				console.log(`Parsed: Code=${materialCode}, Name=${materialName}, Type=${type}, Planned=${plannedQty}, Actual=${actualQty}, Unit=${unit}, Price=${pricePerUnit}`);

				// สร้างข้อมูลวัตถุดิบ
				if (materialName && materialCode) {
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
						is_fg: type === 'I', // FG ถ้า Type เป็น I
						clipboard_index: lineIndex
					});
					lineIndex++;
					console.log(`Added material: ${materialName}, Qty: ${actualQty} ${unit}, FG: ${type === 'I'}`);
				}
			}
		}

		console.log('Total materials found:', materials.length);
		return materials;
	};

	// จับคู่กับฐานข้อมูล
	const matchMaterialsWithDatabase = async (materials) => {
		const matchedMaterials = [];
		const unmatchedMaterials = [];

		for (const material of materials) {
			try {
				if (material.Mat_Id) {
					const res = await materialAPI.search(material.Mat_Id);
					const dbMaterials = res.data.data || [];
					
					if (dbMaterials.length > 0) {
						const dbMaterial = dbMaterials[0];
						matchedMaterials.push({
							...material,
							material_id: dbMaterial.id,
							Mat_Name: material.Mat_Name || dbMaterial.Mat_Name,
							unit: material.unit || dbMaterial.Mat_Unit,
							// ใช้ข้อมูลจาก Clipboard เป็นหลัก
							planned_qty: material.planned_qty,
							actual_qty: material.actual_qty,
							unit_price: material.unit_price || dbMaterial.price || 0,
							is_custom: false,
							is_fg: material.is_fg // ส่งต่อ is_fg
						});
					} else {
						unmatchedMaterials.push({
							...material,
							is_custom: true,
							is_fg: material.is_fg // ส่งต่อ is_fg
						});
					}
				} else {
					unmatchedMaterials.push({
						...material,
						is_custom: true,
						is_fg: material.is_fg // ส่งต่อ is_fg
					});
				}
			} catch (error) {
				console.error('Error matching material:', material.Mat_Id, error);
				unmatchedMaterials.push({
					...material,
					is_custom: true,
					is_fg: material.is_fg // ส่งต่อ is_fg
				});
			}
		}

		return { matchedMaterials, unmatchedMaterials };
	};

	// ยืนยัน Import
	const confirmImport = () => {
		replace(previewData);
		setDataSource('clipboard');
		setShowPreviewModal(false);
		
		const successCount = previewData.filter(m => !m.is_custom).length;
		const unmatchedCount = previewData.filter(m => m.is_custom).length;
		
		if (unmatchedCount > 0) {
			toast.success(`Import สำเร็จ ${successCount} รายการ, ไม่พบในฐานข้อมูล ${unmatchedCount} รายการ`);
		} else {
			toast.success(`Import ข้อมูล ${previewData.length} รายการสำเร็จ`);
		}
	};

	// บันทึกข้อมูล
	const onSave = async (data) => {
		if (!data.workplan_id) {
			toast.error('เลือกงานก่อน');
			return;
		}

		if (!data.materials || data.materials.length === 0) {
			toast.error('ไม่มีข้อมูลวัตถุดิบ');
			return;
		}

		setSaving(true);
		try {
		// Validate input data
		if (!data.materials || !Array.isArray(data.materials)) {
			toast.error('ข้อมูลวัตถุดิบไม่ถูกต้อง');
			return;
		}
		
		const allMaterials = data.materials.filter(m => {
			const actualQty = parseFloat(m.actual_qty);
			return m.actual_qty && !isNaN(actualQty) && actualQty > 0;
		});
		
		if (allMaterials.length === 0) {
			toast.error('ไม่มีข้อมูลการตวงที่ถูกต้อง (จำนวนเบิกต้องมากกว่า 0)');
			return;
		}

			// แยกข้อมูล FG และ Raw Materials
			const fgMaterials = allMaterials.filter(m => m.is_fg === '1' || m.is_fg === 1); // Type "I" = ผลผลิต
			const rawMaterials = allMaterials.filter(m => !(m.is_fg === '1' || m.is_fg === 1)); // Type "O" = วัตถุดิบ

			// ตรวจสอบและปรับปรุงข้อมูล raw materials ให้มีข้อมูลที่จำเป็น
			const processedRawMaterials = rawMaterials.map(material => ({
				...material,
				// ตรวจสอบว่ามี field ที่จำเป็นสำหรับการสร้างวัตถุดิบใหม่
				Mat_Id: material.Mat_Id || material.material_code || `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
				Mat_Name: material.Mat_Name || material.material_name || 'วัตถุดิบใหม่',
				is_custom: material.is_custom || !material.material_id || material.material_id === null,
				unit: material.unit || 'กก.',
				unit_price: Number(material.unit_price) || 0
			}));

			console.log('📊 แยกข้อมูล:', {
				fg: fgMaterials.length,
				raw: rawMaterials.length,
				processed_raw: processedRawMaterials.length,
				total: allMaterials.length,
				custom_materials: processedRawMaterials.filter(m => m.is_custom).length
			});

			// บันทึกข้อมูลทั้งหมดในครั้งเดียว
			await materialAPI.saveInventoryData(data.workplan_id, processedRawMaterials, fgMaterials);
			console.log('✅ บันทึกข้อมูลสำเร็จ:', {
				raw: rawMaterials.length,
				fg: fgMaterials.length
			});

			// แสดงข้อความสรุป
			let message = 'บันทึกข้อมูลสำเร็จ';
			if (rawMaterials.length > 0 && fgMaterials.length > 0) {
				message = `บันทึกข้อมูลสำเร็จ (วัตถุดิบ: ${rawMaterials.length} รายการ, ผลผลิต: ${fgMaterials.length} รายการ)`;
			} else if (rawMaterials.length > 0) {
				message = `บันทึกข้อมูลวัตถุดิบสำเร็จ (${rawMaterials.length} รายการ)`;
			} else if (fgMaterials.length > 0) {
				message = `บันทึกข้อมูลผลผลิตสำเร็จ (${fgMaterials.length} รายการ)`;
			}

			toast.success(message);
			reset();
			setDataSource('');
		} catch (error) {
			console.error('Error saving materials:', error);
			
			// แสดงข้อความ error ที่ละเอียดขึ้น
			let errorMessage = 'บันทึกไม่สำเร็จ';
			if (error.response?.data?.error) {
				errorMessage = error.response.data.error;
			} else if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			toast.error(errorMessage);
			
			// Debug information in development
			if (process.env.NODE_ENV === 'development') {
				console.error('Full error details:', {
					response: error.response?.data,
					status: error.response?.status,
					message: error.message
				});
			}
		} finally {
			setSaving(false);
		}
	};

	// Memoized totalCost calculation for performance
	const totalCost = useMemo(() => {
		const materials = watch('materials') || [];
		return materials.reduce((sum, material) => {
			const actualQty = parseFloat(material.actual_qty);
			const unitPrice = parseFloat(material.unit_price);
			
			// Validate numbers before calculation
			if (isNaN(actualQty) || isNaN(unitPrice) || actualQty < 0 || unitPrice < 0) {
				return sum;
			}
			
			return sum + (actualQty * unitPrice);
		}, 0);
	}, [watch('materials')]);

	return (
		<>
			<Helmet>
				<title>{getPageTitle('inventory')}</title>
			</Helmet>
			<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold text-gray-900">ข้อมูล Inventory</h1>
			</div>

			{/* เลือกงาน */}
			<div className="card">
				<div className="card-header">
					<h2 className="text-lg font-semibold">เลือกงาน</h2>
				</div>
				<div className="card-body">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => {
									setSelectedDate(e.target.value);
									// รีเซ็ตการเลือกงานเมื่อเปลี่ยนวันที่
									setValue('workplan_id', '');
									setValue('job_code', '');
									setValue('job_name', '');
									setValue('fg_code', '');
									replace([]); // ล้างข้อมูลวัตถุดิบ
									setDataSource('');
								} }
								className="input" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">งาน</label>
							<select
								{...register('workplan_id')}
								className="input"
								onChange={(e) => {
									const selectedWorkplan = workplans.find(w => String(w.id) === String(e.target.value));
									if (selectedWorkplan) {
										setValue('job_code', selectedWorkplan.job_code);
										setValue('job_name', selectedWorkplan.job_name);
										setValue('fg_code', selectedWorkplan.job_code); // ใช้ job_code เป็น fg_code


										// โหลดข้อมูลที่เคยบันทึก (ถ้ามี) ถ้าไม่มีให้โหลด BOM ทันที
										loadSavedData(selectedWorkplan.id).then((hasSaved) => {
											if (!hasSaved) {
												loadBOMByJobCode(selectedWorkplan.job_code);
											}
										});
									} else {
										// ล้างข้อมูลเมื่อไม่เลือกงาน
										setValue('job_code', '');
										setValue('job_name', '');
										setValue('fg_code', '');
										replace([]);
										setDataSource('');
									}
								} }
							>
								<option value="">เลือกงาน</option>
								{workplans.map((workplan) => (
									<option key={workplan.id} value={workplan.id}>
										{workplan.job_code} - {workplan.job_name}
									</option>
								))}
							</select>
						</div>
						{/* Job Code, Job Name และ FG Code ซ่อนไว้แต่ยังใช้งานในหลังบ้าน */}
						<input type="hidden" {...register('job_code')} />
						<input type="hidden" {...register('job_name')} />
						<input type="hidden" {...register('fg_code')} />
					</div>

					{workplans.length === 0 && (
						<div className="mt-3 p-2 bg-yellow-50 rounded-lg">
							<span className="text-sm text-yellow-700">
								ไม่พบงานสำหรับวันที่ {selectedDate}
							</span>
						</div>
					)}


				</div>
			</div>
			<div className="card">
					<div className="card-header">
						<h2 className="text-lg font-semibold">Import ข้อมูล</h2>
					</div>
					<div className="card-body">
						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								className="btn btn-accent flex items-center gap-2"
								onClick={handleImportFromClipboard}
							>
								<Clipboard size={16} />
								วางข้อมูล Inventory
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

						{/* แสดงสถานะข้อมูล - แสดงเฉพาะ Clipboard */}
						{dataSource === 'clipboard' && (
							<div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mt-4">
								<div className="w-3 h-3 rounded-full bg-purple-500"></div>
								<span className="text-sm text-gray-700">โหลดข้อมูลจาก Clipboard (สามารถแก้ไขได้)</span>
							</div>
						)}
					</div>
				</div>

				<div className="card">
					<div className="card-header">
						<h2 className="text-lg font-semibold">ข้อมูลวัตถุดิบ</h2>
					</div>
					<div className="card-body">
						{fields.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">ลำดับ</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">Type</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">รหัสสินค้า</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">ชื่อสินค้า</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">จำนวน</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">จำนวนเบิก</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">หน่วยใหญ่</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">ค่าแปลง</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">หน่วย</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">ราคา/หน่วย(ราคากลาง)</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">ราคา/หน่วย</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">มูลค่ารวม</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words leading-tight">จัดการ</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{(workplanId || jobRowCode) && (
											<tr className="bg-blue-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">1</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">I</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">{jobRowCode}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-left">{jobRowName}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-center">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-center">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-center">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-right">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-right">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">-</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center"></td>
											</tr>
										)}
										{sortedFields.map((field, index) => (
											<tr key={field.id} className={(field.is_fg === '1' || field.is_fg === 1) ? 'bg-blue-50' :
												field.is_custom ? 'bg-yellow-50' : ''}>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{(workplanId || jobRowCode) ? index + 2 : index + 1}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{field.is_fg === '1' || field.is_fg === 1 ? 'I' : 'O'}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{field.Mat_Id}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-left">
													{String(field.Mat_Name || '').replace(/<[^>]*>/g, '')}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{formatNumber(field.planned_qty, 3)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<input
														type="text"
														inputMode="decimal"
														pattern="^[0-9]*[.,]?[0-9]*$"
														{...register(`materials.${index}.actual_qty`)}
														className="input w-16"
														onWheel={(e) => e.currentTarget.blur()}
														onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
														placeholder="0" />
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{(() => {
														const p = latestPrices[field.material_id];
														if (!p) return '-';
														return p.display_unit || field.unit;
													})()}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{(() => {
														const p = latestPrices[field.material_id];
														if (!p) return '-';
														return p.display_to_base_rate || '1.0';
													})()}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{field.unit}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-right">
													{(() => {
														const p = latestPrices[field.material_id];
														if (!p) return '-';
														
														// ตรวจสอบหน่วยและแปลงราคา
														let price = p.price_per_unit;
														if (p.display_unit !== field.unit) {
															// แปลงราคาตามอัตราส่วนหน่วย
															price = p.price_per_base_unit * (p.display_to_base_rate || 1);
														}
														
														return formatCurrency(Number(price || 0));
													})()}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-right">
													<input
														type="text"
														inputMode="decimal"
														pattern="^[0-9]*[.,]?[0-9]*$"
														{...register(`materials.${index}.unit_price`)}
														className="input w-20 text-sm text-right"
														onWheel={(e) => e.currentTarget.blur()}
														onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
														placeholder="0" />
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
													{(() => {
														// เลือกจำนวน: ใช้จำนวนเบิก ถ้ายังไม่ใส่ให้ fallback เป็นจำนวนวางแผน
														const actual = parseFloat(watch(`materials.${index}.actual_qty`));
														const qty = !isNaN(actual) && actual > 0 ? actual : (Number(field.planned_qty) || 0);

														// เลือกราคา/หน่วย: ใช้ที่ผู้ใช้กรอกก่อน ถ้าไม่มีให้ fallback เป็นราคากลาง (พร้อมแปลงหน่วย)
														const upInput = parseFloat(watch(`materials.${index}.unit_price`));
														let unitPrice = !isNaN(upInput) && upInput > 0 ? upInput : undefined;
														if (unitPrice === undefined) {
															const p = latestPrices[field.material_id];
															if (p) {
																unitPrice = p.price_per_unit;
																if (p.display_unit !== field.unit) {
																	unitPrice = p.price_per_base_unit * (p.display_to_base_rate || 1);
																}
															}
														}

														return formatCurrency((Number(qty) || 0) * (Number(unitPrice) || 0));
													})()}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
													<button
														type="button"
														onClick={() => remove(index)}
														className="text-red-600 hover:text-red-900"
													>
														<Trash2 size={16} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<p>ไม่มีข้อมูลวัตถุดิบ</p>
								<p className="text-sm">กรุณาเลือกงาน หรือ วางข้อมูล Inventory</p>
							</div>
						)}

						{/* แสดงสถานะข้อมูล - ไม่แสดง BOM */}
						{dataSource && (
							<div className="mt-3 p-2 rounded-lg text-sm">
								{dataSource === 'saved' && (
									<div className="bg-green-50 text-green-700">
										โหลดข้อมูลที่เคยบันทึก (สามารถแก้ไขได้)
									</div>
								)}
								{dataSource === 'clipboard' && (
									<div className="bg-purple-50 text-purple-700">
										Import ข้อมูลจาก Clipboard (สามารถแก้ไขได้)
									</div>
								)}
							</div>
						)}

						{/* สรุปค่าใช้จ่าย */}
						{fields.length > 0 && (
							<div className="mt-4 p-4 bg-gray-50 rounded-lg">
								<div className="flex justify-between items-center">
									<span className="text-lg font-semibold">มูลค่ารวม:</span>
									<span className="text-xl font-bold text-green-600">{formatCurrency(totalCost)}</span>
								</div>
							</div>
						)}

						{/* ปุ่มบันทึก */}
						{fields.length > 0 && (
							<div className="mt-4 flex justify-end">
								<button
									type="button"
									onClick={handleSubmit(onSave)}
									disabled={saving || !workplanId}
									className="btn btn-success flex items-center gap-2"
								>
									{saving ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											กำลังบันทึก...
										</>
									) : (
										<>
											<Save size={16} />
											บันทึกข้อมูลวัตถุดิบ
										</>
									)}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
 			
			{showPreviewModal ? (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Preview ข้อมูลจาก Clipboard</h3>
							<button 
								onClick={() => setShowPreviewModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								<X size={20} />
							</button>
						</div>
						
						<div className="mb-4 p-3 bg-blue-50 rounded-lg">
							<div className="flex items-center gap-2 text-sm text-blue-800">
								<Eye size={16} />
								<span>
									พบข้อมูล {previewData.length} รายการ 
									(ผลผลิต: {previewData.filter(m => m.is_fg === '1' || m.is_fg === 1).length} รายการ, 
									วัตถุดิบ: {previewData.filter(m => !(m.is_fg === '1' || m.is_fg === 1)).length} รายการ)
									- {previewData.filter(m => !m.is_custom).length} รายการพบในฐานข้อมูล, 
									{previewData.filter(m => m.is_custom).length} รายการไม่พบในฐานข้อมูล
								</span>
							</div>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัส</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อวัตถุดิบ</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนวางแผน</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนจริง</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วย</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา/หน่วย</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{previewData.map((material, index) => (
										<tr key={index} className={
											(material.is_fg === '1' || material.is_fg === 1) ? 'bg-blue-50' : 
											material.is_custom ? 'bg-yellow-50' : ''
										}>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{material.Mat_Id}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{material.Mat_Name}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{material.is_fg === '1' || material.is_fg === 1 ? 'I' : 'O'}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{formatNumber(material.planned_qty, 3)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm">
												<span className={parseFloat(material.actual_qty) > 0 ? 'text-green-600 font-semibold' : 'text-gray-900'}>
													{formatNumberPreservePrecision(material.actual_qty)}
												</span>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{material.unit}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{formatCurrency(material.unit_price)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{(material.is_fg === '1' || material.is_fg === 1) ? (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
														FG
													</span>
												) : material.is_custom ? (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
														ไม่พบในฐานข้อมูล
													</span>
												) : (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
														พบในฐานข้อมูล
													</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="flex justify-end gap-3 mt-6">
							<button
								type="button"
								onClick={() => setShowPreviewModal(false)}
								className="btn btn-secondary"
							>
								ยกเลิก
							</button>
							<button
								type="button"
								onClick={confirmImport}
								className="btn btn-success"
							>
								Import ข้อมูล
							</button>
						</div>
					</div>
				</div>
			) : null}

			{/* Manual Input Modal */}
			{showManualInputModal ? (
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
									<li>ตรวจสอบข้อมูลใน Preview Modal</li>
								</ol>
							</div>

							<div className="bg-yellow-50 p-4 rounded-lg">
								<h3 className="font-semibold text-yellow-800 mb-2">⚠️ รูปแบบข้อมูลที่ต้องการ:</h3>
								<div className="text-sm">
									<p className="mb-2">ข้อมูลต้องมีคอลัมน์ดังนี้ (คั่นด้วย Tab):</p>
									<code className="bg-gray-100 p-2 rounded text-xs block">
										ลำดับ\tType\tเลือก\tลบ\tรหัสสินค้า\tชื่อสินค้า\tจำนวน\tจำนวนเบิก\tหน่วยใหญ่\t%\tค่าแปลง\tหน่วยย่อย\tจำนวนคุมสต็อก\tหน่วยคุมสต๊อก\tราคา/หน่วย\tราคาสินค้า
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
			) : null}

			{/* Help Modal */}
			{showHelpModal ? (
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
									<li>ตรวจสอบข้อมูลใน Preview Modal</li>
									<li>คลิก "Import ข้อมูล" เพื่อบันทึก</li>
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
									<li>ต้องมีคอลัมน์ชื่อสินค้า (ภาษาไทย)</li>
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
			) : null}
		</>
	);
};

export default InventoryData;
