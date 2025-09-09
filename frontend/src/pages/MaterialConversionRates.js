import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { costAPI, materialAPI } from '../services/api';
import { RefreshCw, Plus, Edit, Trash2, Info, Search, X, HelpCircle, BookOpen } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';

const MaterialConversionRates = () => {
	const { register, handleSubmit, reset, setValue, watch } = useForm({
		defaultValues: {
			from_unit: '',
			to_unit: '',
			conversion_rate: '',
			description: '',
			material_name: '',
			material_pattern: '',
			Mat_Id: ''
		}
	});
	const [loading, setLoading] = useState(false);
	const [conversionRates, setConversionRates] = useState([]);
	const [materials, setMaterials] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [showForm, setShowForm] = useState(false);
	
	// Auto-complete states
	const [materialSearchQuery, setMaterialSearchQuery] = useState('');
	const [materialSearchResults, setMaterialSearchResults] = useState([]);
	const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
	const [selectedMaterial, setSelectedMaterial] = useState(null);
	const [searching, setSearching] = useState(false);
	const [showNewMaterialForm, setShowNewMaterialForm] = useState(false);
	const [newMaterial, setNewMaterial] = useState({
		Mat_Id: '',
		Mat_Name: '',
		Mat_Unit: 'กก.',
		price: 0
	});
	const [showHelpModal, setShowHelpModal] = useState(false);

	const fetchConversionRates = async () => {
		try {
			setLoading(true);
			const res = await costAPI.getMaterialConversionRates();
			setConversionRates(res.data.data || []);
		} catch (error) {
			console.error(error);
			toast.error('โหลดข้อมูลค่าแปลงหน่วยไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	const fetchMaterials = async () => {
		try {
			const res = await costAPI.getMaterials();
			setMaterials(res.data.data || []);
		} catch (error) {
			console.error(error);
		}
	};

	// ค้นหาวัตถุดิบแบบ auto-complete
	const searchMaterials = async (query) => {
		if (!query.trim()) {
			setMaterialSearchResults([]);
			setShowMaterialDropdown(false);
			return;
		}
		
		try {
			setSearching(true);
			const res = await materialAPI.search(query);
			const results = res.data.data || [];
			setMaterialSearchResults(results);
			setShowMaterialDropdown(true);
		} catch (error) {
			console.error('Error searching materials:', error);
			toast.error('ค้นหาวัตถุดิบไม่สำเร็จ');
		} finally {
			setSearching(false);
		}
	};

	// เลือกวัตถุดิบจาก dropdown
	const selectMaterial = (material) => {
		setSelectedMaterial(material);
		setMaterialSearchQuery(`${material.Mat_Id} - ${material.Mat_Name}`);
		setValue('Mat_Id', material.Mat_Id);
		setValue('material_name', material.Mat_Name);
		setShowMaterialDropdown(false);
	};

	// ล้างการเลือกวัตถุดิบ
	const clearMaterialSelection = () => {
		setSelectedMaterial(null);
		setMaterialSearchQuery('');
		setValue('Mat_Id', '');
		setValue('material_name', '');
		setShowMaterialDropdown(false);
	};

	// เพิ่มวัตถุดิบใหม่
	const addNewMaterial = async () => {
		try {
			if (!newMaterial.Mat_Id.trim() || !newMaterial.Mat_Name.trim()) {
				toast.error('กรุณากรอกรหัสและชื่อวัตถุดิบ');
				return;
			}

			setLoading(true);
			const materialData = {
				Mat_Id: newMaterial.Mat_Id.trim(),
				Mat_Name: newMaterial.Mat_Name.trim(),
				Mat_Unit: newMaterial.Mat_Unit,
				price: Number(newMaterial.price) || 0
			};

			await materialAPI.create(materialData);
			
			// เลือกวัตถุดิบที่เพิ่งสร้าง
			const createdMaterial = {
				id: null, // จะได้จาก API response
				Mat_Id: materialData.Mat_Id,
				Mat_Name: materialData.Mat_Name,
				Mat_Unit: materialData.Mat_Unit,
				price: materialData.price
			};
			
			selectMaterial(createdMaterial);
			
			// Reset form
			setNewMaterial({
				Mat_Id: '',
				Mat_Name: '',
				Mat_Unit: 'กก.',
				price: 0
			});
			setShowNewMaterialForm(false);
			
			toast.success(`เพิ่มวัตถุดิบ ${materialData.Mat_Name} สำเร็จ`);
			
			// Refresh materials list
			fetchMaterials();
			
		} catch (error) {
			console.error('Error creating material:', error);
			toast.error(error.response?.data?.error || 'เพิ่มวัตถุดิบไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConversionRates();
		fetchMaterials();
	}, []);

	// ปิด dropdown เมื่อคลิกข้างนอก
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (!event.target.closest('.relative')) {
				setShowMaterialDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const onRefresh = () => {
		fetchConversionRates();
	};

	const onSubmit = async (values) => {
		try {
			setLoading(true);
			const payload = {
				...values,
				conversion_rate: Number(values.conversion_rate)
			};

			if (editingId) {
				await costAPI.updateMaterialConversionRate(editingId, payload);
				toast.success('อัพเดทค่าแปลงหน่วยสำเร็จ');
			} else {
				await costAPI.createMaterialConversionRate(payload);
				toast.success('เพิ่มค่าแปลงหน่วยสำเร็จ');
			}

			reset();
			setEditingId(null);
			setShowForm(false);
			fetchConversionRates();
		} catch (error) {
			console.error(error);
			toast.error(error.response?.data?.error || 'บันทึกข้อมูลไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	const onEdit = (item) => {
		setEditingId(item.id);
		setValue('from_unit', item.from_unit);
		setValue('to_unit', item.to_unit);
		setValue('conversion_rate', item.conversion_rate);
		setValue('description', item.description || '');
		setValue('material_name', item.material_name || '');
		setValue('material_pattern', item.material_pattern || '');
		setValue('Mat_Id', item.Mat_Id || '');
		
		// ตั้งค่า material search
		if (item.Mat_Id && item.material_name) {
			setMaterialSearchQuery(`${item.Mat_Id} - ${item.material_name}`);
			setSelectedMaterial({
				Mat_Id: item.Mat_Id,
				Mat_Name: item.material_name
			});
		} else {
			clearMaterialSelection();
		}
		
		setShowForm(true);
	};

	const onDelete = async (id) => {
		if (!window.confirm('ยืนยันการลบค่าแปลงหน่วยนี้?')) return;

		try {
			setLoading(true);
			await costAPI.deleteMaterialConversionRate(id);
			toast.success('ลบค่าแปลงหน่วยสำเร็จ');
			fetchConversionRates();
		} catch (error) {
			console.error(error);
			toast.error('ลบค่าแปลงหน่วยไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	const onCancel = () => {
		reset();
		setEditingId(null);
		setShowForm(false);
		clearMaterialSelection();
		setShowNewMaterialForm(false);
	};



	return (
		<div className="container mx-auto px-4 py-8">
			<Helmet>
				<title>{getPageTitle('materialConversion')}</title>
			</Helmet>
			<div className="card">
				<div className="card-header flex justify-between items-center">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">จัดการค่าแปลงหน่วยวัตถุดิบ</h2>
						<p className="text-sm text-gray-600 mt-1">
							จัดการอัตราส่วนการแปลงหน่วยสำหรับวัตถุดิบ เช่น แพ็ค → กก.
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setShowHelpModal(true)}
							className="btn btn-info"
							title="คู่มือการใช้งาน"
						>
							<HelpCircle className="w-4 h-4" />
							คู่มือ
						</button>
						<button
							onClick={onRefresh}
							disabled={loading}
							className="btn btn-secondary"
						>
							<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
							รีเฟรช
						</button>
						<button
							onClick={() => setShowForm(true)}
							className="btn btn-primary"
						>
							<Plus className="w-4 h-4" />
							เพิ่มค่าแปลง
						</button>
					</div>
				</div>

				{showForm && (
					<div className="card-body border-b">
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										หน่วยต้นทาง *
									</label>
									<input
										type="text"
										className="input"
										placeholder="เช่น แพ็ค, ลิตร"
										{...register('from_unit', { required: true })}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										หน่วยปลายทาง *
									</label>
									<input
										type="text"
										className="input"
										placeholder="เช่น กก., กรัม"
										{...register('to_unit', { required: true })}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										อัตราส่วนการแปลง *
									</label>
									<input
										type="number"
										step="0.0001"
										className="input"
										placeholder="เช่น 0.150"
										{...register('conversion_rate', { required: true, min: 0 })}
									/>
								</div>
								<div className="relative">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										รหัสวัตถุดิบ
									</label>
									<div className="relative">
										<input
											type="text"
											className="input pr-20"
											placeholder="พิมพ์รหัสหรือชื่อวัตถุดิบ..."
											value={materialSearchQuery}
											onChange={(e) => {
												const query = e.target.value;
												setMaterialSearchQuery(query);
												searchMaterials(query);
											}}
											onFocus={() => {
												if (materialSearchQuery) {
													searchMaterials(materialSearchQuery);
												}
											}}
										/>
										<div className="absolute right-2 top-2 flex gap-1">
											{selectedMaterial && (
												<button
													type="button"
													onClick={clearMaterialSelection}
													className="text-gray-400 hover:text-gray-600"
													title="ล้างการเลือก"
												>
													<X className="w-4 h-4" />
												</button>
											)}
											{searching && (
												<div className="animate-spin">
													<Search className="w-4 h-4 text-gray-400" />
												</div>
											)}
										</div>
									</div>

									{/* Auto-complete Dropdown */}
									{showMaterialDropdown && (
										<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
											{materialSearchResults.length > 0 ? (
												<>
													{materialSearchResults.map((material) => (
														<button
															key={material.id}
															type="button"
															className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
															onClick={() => selectMaterial(material)}
														>
															<div className="font-medium text-gray-900">
																{material.Mat_Id} - {material.Mat_Name}
															</div>
															<div className="text-sm text-gray-500">
																หน่วย: {material.Mat_Unit} | ราคา: ฿{material.price}
															</div>
														</button>
													))}
													<div className="border-t border-gray-200">
														<button
															type="button"
															className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 font-medium"
															onClick={() => {
																setShowNewMaterialForm(true);
																setShowMaterialDropdown(false);
																// ใช้ search query เป็น Mat_Id เริ่มต้น
																setNewMaterial(prev => ({
																	...prev,
																	Mat_Id: materialSearchQuery
																}));
															}}
														>
															<Plus className="w-4 h-4 inline mr-2" />
															เพิ่มวัตถุดิบใหม่: "{materialSearchQuery}"
														</button>
													</div>
												</>
											) : materialSearchQuery ? (
												<div className="px-4 py-2">
													<div className="text-gray-500 mb-2">ไม่พบวัตถุดิบ</div>
													<button
														type="button"
														className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 font-medium rounded-md border border-blue-200"
														onClick={() => {
															setShowNewMaterialForm(true);
															setShowMaterialDropdown(false);
															setNewMaterial(prev => ({
																...prev,
																Mat_Id: materialSearchQuery
															}));
														}}
													>
														<Plus className="w-4 h-4 inline mr-2" />
														เพิ่มวัตถุดิบใหม่: "{materialSearchQuery}"
													</button>
												</div>
											) : null}
										</div>
									)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ชื่อวัตถุดิบ
									</label>
									<input
										type="text"
										className="input"
										placeholder="เช่น SanWu Mala Paste"
										{...register('material_name')}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										รูปแบบชื่อ (Pattern)
									</label>
									<input
										type="text"
										className="input"
										placeholder="เช่น %SanWu%"
										{...register('material_pattern')}
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									คำอธิบาย
								</label>
								<textarea
									className="input"
									rows="2"
									placeholder="เช่น 1 แพ็ค = 150 กรัม"
									{...register('description')}
								/>
							</div>
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={loading}
									className="btn btn-primary"
								>
									{loading ? 'กำลังบันทึก...' : (editingId ? 'อัพเดท' : 'เพิ่ม')}
								</button>
								<button
									type="button"
									onClick={onCancel}
									className="btn btn-secondary"
								>
									ยกเลิก
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Modal สำหรับเพิ่มวัตถุดิบใหม่ */}
				{showNewMaterialForm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
							<h3 className="text-lg font-semibold mb-4">เพิ่มวัตถุดิบใหม่</h3>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										รหัสวัตถุดิบ *
									</label>
									<input
										type="text"
										className="input"
										value={newMaterial.Mat_Id}
										onChange={(e) => setNewMaterial(prev => ({ ...prev, Mat_Id: e.target.value }))}
										placeholder="เช่น 411026"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ชื่อวัตถุดิบ *
									</label>
									<input
										type="text"
										className="input"
										value={newMaterial.Mat_Name}
										onChange={(e) => setNewMaterial(prev => ({ ...prev, Mat_Name: e.target.value }))}
										placeholder="เช่น น้ำมันพืชดิน 3 ลิตร"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										หน่วย
									</label>
									<select
										className="input"
										value={newMaterial.Mat_Unit}
										onChange={(e) => setNewMaterial(prev => ({ ...prev, Mat_Unit: e.target.value }))}
									>
										<option value="กก.">กก.</option>
										<option value="กรัม">กรัม</option>
										<option value="ลิตร">ลิตร</option>
										<option value="มล.">มล.</option>
										<option value="แพ็ค">แพ็ค</option>
										<option value="ชิ้น">ชิ้น</option>
										<option value="ถุง">ถุง</option>
									</select>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ราคาต่อหน่วย
									</label>
									<input
										type="number"
										step="0.01"
										className="input"
										value={newMaterial.price}
										onChange={(e) => setNewMaterial(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
										placeholder="0.00"
									/>
								</div>
							</div>
							
							<div className="flex gap-2 mt-6">
								<button
									type="button"
									onClick={addNewMaterial}
									disabled={loading}
									className="btn btn-primary flex-1"
								>
									{loading ? 'กำลังเพิ่ม...' : 'เพิ่มวัตถุดิบ'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowNewMaterialForm(false);
										setNewMaterial({
											Mat_Id: '',
											Mat_Name: '',
											Mat_Unit: 'กก.',
											price: 0
										});
									}}
									className="btn btn-secondary"
								>
									ยกเลิก
								</button>
							</div>
						</div>
					</div>
				)}

				<div className="card-body">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										หน่วยต้นทาง
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										หน่วยปลายทาง
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										อัตราส่วน
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										วัตถุดิบ
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										คำอธิบาย
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										การจัดการ
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{conversionRates.map((item) => (
									<tr key={item.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{item.from_unit}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{item.to_unit}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{item.conversion_rate}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											<div>
												<div className="font-medium">{item.material_name || '-'}</div>
												{item.Mat_Id && (
													<div className="text-xs text-gray-500">{item.Mat_Id}</div>
												)}
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-gray-900">
											{item.description || '-'}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex gap-2">
												<button
													onClick={() => onEdit(item)}
													className="text-indigo-600 hover:text-indigo-900"
												>
													<Edit className="w-4 h-4" />
												</button>
												<button
													onClick={() => onDelete(item.id)}
													className="text-red-600 hover:text-red-900"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{conversionRates.length === 0 && !loading && (
						<div className="text-center py-8">
							<Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500">ยังไม่มีข้อมูลค่าแปลงหน่วย</p>
						</div>
					)}
				</div>
			</div>

			{/* Help Modal - คู่มือการใช้งาน */}
			{showHelpModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-6">
							<div className="flex items-center gap-2">
								<BookOpen className="w-6 h-6 text-blue-600" />
								<h2 className="text-2xl font-bold text-gray-900">คู่มือการใช้งาน - จัดการค่าแปลงหน่วยวัตถุดิบ</h2>
							</div>
							<button
								onClick={() => setShowHelpModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="space-y-8">
							{/* ภาพรวม */}
							<div className="bg-blue-50 p-4 rounded-lg">
								<h3 className="text-lg font-semibold text-blue-800 mb-2">📋 ภาพรวม</h3>
								<p className="text-blue-700">
									ระบบนี้ใช้สำหรับกำหนดอัตราส่วนการแปลงหน่วยของวัตถุดิบ เช่น 1 แพ็ค = 0.150 กก. 
									ซึ่งจะช่วยในการคำนวณต้นทุนและจัดการสต็อกได้อย่างแม่นยำ
								</p>
							</div>

							{/* การกรอกข้อมูล */}
							<div>
								<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<Info className="w-5 h-5 text-green-600" />
									การกรอกข้อมูลค่าแปลงหน่วย
								</h3>
								
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">1. หน่วยต้นทาง *</h4>
											<p className="text-sm text-gray-600 mb-2">หน่วยที่ต้องการแปลงจาก</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> แพ็ค, ลิตร, ถุง, กล่อง, ขวด
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">2. หน่วยปลายทาง *</h4>
											<p className="text-sm text-gray-600 mb-2">หน่วยที่ต้องการแปลงไป (มักเป็นหน่วยพื้นฐาน)</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> กก., กรัม, มล., ลิตร
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">3. อัตราส่วนการแปลง *</h4>
											<p className="text-sm text-gray-600 mb-2">จำนวนหน่วยปลายทางที่ได้จาก 1 หน่วยต้นทาง</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong><br/>
												• 1 แพ็ค = 0.150 กก. → ใส่ 0.150<br/>
												• 1 ลิตร = 1000 มล. → ใส่ 1000<br/>
												• 1 กก. = 1000 กรัม → ใส่ 1000
											</div>
										</div>
									</div>

									<div className="space-y-4">
										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">4. รหัสวัตถุดิบ</h4>
											<p className="text-sm text-gray-600 mb-2">ระบุวัตถุดิบที่ใช้ค่าแปลงนี้ (ไม่บังคับ)</p>
											<div className="bg-blue-50 p-3 rounded">
												<p className="text-sm text-blue-700 font-medium mb-2">💡 วิธีใช้:</p>
												<ul className="text-sm text-blue-600 space-y-1">
													<li>• พิมพ์รหัสหรือชื่อวัตถุดิบ</li>
													<li>• เลือกจากรายการที่แสดง</li>
													<li>• หรือเพิ่มวัตถุดิบใหม่ได้ทันที</li>
												</ul>
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">5. ชื่อวัตถุดิบ</h4>
											<p className="text-sm text-gray-600 mb-2">จะถูกกรอกอัตโนมัติเมื่อเลือกรหัส</p>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">6. รูปแบบชื่อ (Pattern)</h4>
											<p className="text-sm text-gray-600 mb-2">สำหรับจับคู่วัตถุดิบที่มีชื่อคล้าย ๆ กัน</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> %SanWu%, %น้ำมัน%, %แป้ง%
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* ตัวอย่างการใช้งาน */}
							<div>
								<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<Search className="w-5 h-5 text-orange-600" />
									ตัวอย่างการใช้งานจริง
								</h3>
								
								<div className="bg-orange-50 p-4 rounded-lg">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🥫 น้ำมันพืชดิน 3 ลิตร</h4>
											<div className="space-y-2 text-sm">
												<div><strong>หน่วยต้นทาง:</strong> แพ็ค</div>
												<div><strong>หน่วยปลายทาง:</strong> กก.</div>
												<div><strong>อัตราส่วน:</strong> 0.150</div>
												<div><strong>คำอธิบาย:</strong> 1 แพ็ค = 150 กรัม</div>
											</div>
										</div>

										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🧂 เกลือแกง</h4>
											<div className="space-y-2 text-sm">
												<div><strong>หน่วยต้นทาง:</strong> ถุง</div>
												<div><strong>หน่วยปลายทาง:</strong> กรัม</div>
												<div><strong>อัตราส่วน:</strong> 500</div>
												<div><strong>คำอธิบาย:</strong> 1 ถุง = 500 กรัม</div>
											</div>
										</div>

										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🥤 น้ำซุป</h4>
											<div className="space-y-2 text-sm">
												<div><strong>หน่วยต้นทาง:</strong> ลิตร</div>
												<div><strong>หน่วยปลายทาง:</strong> มล.</div>
												<div><strong>อัตราส่วน:</strong> 1000</div>
												<div><strong>คำอธิบาย:</strong> 1 ลิตร = 1000 มล.</div>
											</div>
										</div>

										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🍜 บะหมี่แห้ง</h4>
											<div className="space-y-2 text-sm">
												<div><strong>หน่วยต้นทาง:</strong> กล่อง</div>
												<div><strong>หน่วยปลายทาง:</strong> กก.</div>
												<div><strong>อัตราส่วน:</strong> 2.5</div>
												<div><strong>คำอธิบาย:</strong> 1 กล่อง = 2.5 กก.</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* เคล็ดลับ */}
							<div>
								<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<HelpCircle className="w-5 h-5 text-purple-600" />
									เคล็ดลับและข้อควรระวัง
								</h3>
								
								<div className="bg-purple-50 p-4 rounded-lg">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h4 className="font-semibold text-purple-800 mb-2">✅ ควรทำ</h4>
											<ul className="text-sm text-purple-700 space-y-1">
												<li>• ตรวจสอบความถูกต้องของอัตราส่วน</li>
												<li>• ใช้หน่วยที่สอดคล้องกับระบบ</li>
												<li>• เพิ่มคำอธิบายที่ชัดเจน</li>
												<li>• ทดสอบการคำนวณก่อนใช้งาน</li>
												<li>• อัพเดทเมื่อมีการเปลี่ยนแปลง</li>
											</ul>
										</div>
										
										<div>
											<h4 className="font-semibold text-red-800 mb-2">❌ ไม่ควรทำ</h4>
											<ul className="text-sm text-red-700 space-y-1">
												<li>• ใส่อัตราส่วนผิด (เช่น ใส่ 150 แทน 0.150)</li>
												<li>• ใช้หน่วยที่ไม่ตรงกัน</li>
												<li>• ลืมระบุหน่วยพื้นฐาน</li>
												<li>• ซ้ำซ้อนกับค่าแปลงที่มีอยู่</li>
												<li>• ไม่ทดสอบก่อนใช้งานจริง</li>
											</ul>
										</div>
									</div>
								</div>
							</div>

							{/* ปุ่มปิด */}
							<div className="flex justify-end pt-4 border-t border-gray-200">
								<button
									onClick={() => setShowHelpModal(false)}
									className="btn btn-primary"
								>
									เข้าใจแล้ว
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default MaterialConversionRates;
