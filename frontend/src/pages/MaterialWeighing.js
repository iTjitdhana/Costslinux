import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { batchAPI, materialAPI, formatCurrency, formatNumber } from '../services/api';
import { Plus, Search, X } from 'lucide-react';

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
						</div>
					</div>

					{/* แสดงสถานะข้อมูล */}
					{dataSource && (
						<div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
							<div className={`w-3 h-3 rounded-full ${dataSource === 'existing' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
							<span className="text-sm text-gray-700">
								{dataSource === 'existing' 
									? 'โหลดข้อมูลการตวงที่มีอยู่แล้ว (สามารถแก้ไขได้)' 
									: 'โหลดข้อมูลจาก BOM (ข้อมูลใหม่)'
								}
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
