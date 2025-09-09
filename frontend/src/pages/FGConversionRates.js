import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { costAPI, formatNumber } from '../services/api';
import { RefreshCw, Plus, Edit, Trash2, Info, Search, X, HelpCircle, BookOpen, Package } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';

const FGConversionRates = () => {
	const { register, handleSubmit, reset, setValue, watch } = useForm({
		defaultValues: {
			FG_Code: '',
			FG_Name: '',
			FG_Unit: '',
			base_unit: 'กก.',
			conversion_rate: '1.0000',
			conversion_description: ''
		}
	});
	
	const [loading, setLoading] = useState(false);
	const [conversionRates, setConversionRates] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [showForm, setShowForm] = useState(false);
	const [showHelpModal, setShowHelpModal] = useState(false);
	
	// Auto-complete states สำหรับ FG
	const [fgSearchQuery, setFgSearchQuery] = useState('');
	const [fgSearchResults, setFgSearchResults] = useState([]);
	const [showFgDropdown, setShowFgDropdown] = useState(false);
	const [selectedFG, setSelectedFG] = useState(null);
	const [searching, setSearching] = useState(false);
	const [showNewFGForm, setShowNewFGForm] = useState(false);
	const [newFG, setNewFG] = useState({
		FG_Code: '',
		FG_Name: '',
		FG_Unit: 'กก.',
		FG_Size: ''
	});

	const fetchConversionRates = async () => {
		try {
			setLoading(true);
			const res = await costAPI.getFGConversionRates();
			setConversionRates(res.data.data || []);
		} catch (error) {
			console.error(error);
			toast.error('โหลดข้อมูลค่าแปลงหน่วยไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// ค้นหา FG แบบ auto-complete
	const searchFG = async (query) => {
		if (!query.trim()) {
			setFgSearchResults([]);
			setShowFgDropdown(false);
			return;
		}
		
		try {
			setSearching(true);
			// ใช้ API ที่มีอยู่แล้วหรือสร้างใหม่
			const res = await costAPI.searchFG(query);
			const results = res.data.data || [];
			setFgSearchResults(results);
			setShowFgDropdown(true);
		} catch (error) {
			console.error('Error searching FG:', error);
			toast.error('ค้นหาสินค้าสำเร็จรูปไม่สำเร็จ');
		} finally {
			setSearching(false);
		}
	};

	// เลือก FG จาก dropdown
	const selectFG = (fg) => {
		setSelectedFG(fg);
		setFgSearchQuery(`${fg.FG_Code} - ${fg.FG_Name}`);
		setValue('FG_Code', fg.FG_Code);
		setValue('FG_Name', fg.FG_Name);
		setValue('FG_Unit', fg.FG_Unit || 'กก.');
		setShowFgDropdown(false);
	};

	// ล้างการเลือก FG
	const clearFGSelection = () => {
		setSelectedFG(null);
		setFgSearchQuery('');
		setValue('FG_Code', '');
		setValue('FG_Name', '');
		setValue('FG_Unit', 'กก.');
		setShowFgDropdown(false);
	};

	// เพิ่ม FG ใหม่
	const addNewFG = async () => {
		try {
			if (!newFG.FG_Code.trim() || !newFG.FG_Name.trim()) {
				toast.error('กรุณากรอกรหัสและชื่อสินค้าสำเร็จรูป');
				return;
			}

			setLoading(true);
			const fgData = {
				FG_Code: newFG.FG_Code.trim(),
				FG_Name: newFG.FG_Name.trim(),
				FG_Unit: newFG.FG_Unit,
				FG_Size: newFG.FG_Size.trim(),
				base_unit: 'กก.',
				conversion_rate: 1.0000,
				conversion_description: `1 ${newFG.FG_Unit} = 1 กก.`
			};

			await costAPI.createFG(fgData);
			
			// เลือก FG ที่เพิ่งสร้าง
			const createdFG = {
				FG_Code: fgData.FG_Code,
				FG_Name: fgData.FG_Name,
				FG_Unit: fgData.FG_Unit,
				FG_Size: fgData.FG_Size
			};
			
			selectFG(createdFG);
			
			// Reset form
			setNewFG({
				FG_Code: '',
				FG_Name: '',
				FG_Unit: 'กก.',
				FG_Size: ''
			});
			setShowNewFGForm(false);
			
			toast.success(`เพิ่มสินค้าสำเร็จรูป ${fgData.FG_Name} สำเร็จ`);
			
			// Refresh conversion rates list
			fetchConversionRates();
			
		} catch (error) {
			console.error('Error creating FG:', error);
			toast.error(error.response?.data?.error || 'เพิ่มสินค้าสำเร็จรูปไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConversionRates();
	}, []);

	// ปิด dropdown เมื่อคลิกข้างนอก
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (!event.target.closest('.relative')) {
				setShowFgDropdown(false);
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
				await costAPI.updateFGConversionRate(editingId, payload);
				toast.success('อัพเดทค่าแปลงหน่วยสำเร็จ');
			} else {
				await costAPI.createFGConversionRate(payload);
				toast.success('เพิ่มค่าแปลงหน่วยสำเร็จ');
			}

			reset();
			setEditingId(null);
			setShowForm(false);
			clearFGSelection();
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
		setValue('FG_Code', item.FG_Code);
		setValue('FG_Name', item.FG_Name);
		setValue('FG_Unit', item.FG_Unit);
		setValue('base_unit', item.base_unit || 'กก.');
		setValue('conversion_rate', item.conversion_rate);
		setValue('conversion_description', item.conversion_description || '');
		
		// ตั้งค่า FG search
		setFgSearchQuery(`${item.FG_Code} - ${item.FG_Name}`);
		setSelectedFG({
			FG_Code: item.FG_Code,
			FG_Name: item.FG_Name,
			FG_Unit: item.FG_Unit
		});
		
		setShowForm(true);
	};

	const onDelete = async (id) => {
		if (!window.confirm('ยืนยันการลบค่าแปลงหน่วยนี้?')) return;

		try {
			setLoading(true);
			await costAPI.deleteFGConversionRate(id);
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
		clearFGSelection();
		setShowNewFGForm(false);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<Helmet>
				<title>{getPageTitle('fgConversion')}</title>
			</Helmet>
			<div className="card">
				<div className="card-header flex justify-between items-center">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">จัดการค่าแปลงหน่วยสินค้าสำเร็จรูป (FG)</h2>
						<p className="text-sm text-gray-600 mt-1">
							จัดการอัตราส่วนการแปลงหน่วยสำหรับสินค้าสำเร็จรูป เช่น แพ็ค → กก.
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
								<div className="relative">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										รหัสสินค้าสำเร็จรูป *
									</label>
									<div className="relative">
										<input
											type="text"
											className="input pr-20"
											placeholder="พิมพ์รหัสหรือชื่อสินค้า..."
											value={fgSearchQuery}
											onChange={(e) => {
												const query = e.target.value;
												setFgSearchQuery(query);
												searchFG(query);
											}}
											onFocus={() => {
												if (fgSearchQuery) {
													searchFG(fgSearchQuery);
												}
											}}
										/>
										<div className="absolute right-2 top-2 flex gap-1">
											{selectedFG && (
												<button
													type="button"
													onClick={clearFGSelection}
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
									{showFgDropdown && (
										<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
											{fgSearchResults.length > 0 ? (
												<>
													{fgSearchResults.map((fg) => (
														<button
															key={fg.FG_Code}
															type="button"
															className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
															onClick={() => selectFG(fg)}
														>
															<div className="font-medium text-gray-900">
																{fg.FG_Code} - {fg.FG_Name}
															</div>
															<div className="text-sm text-gray-500">
																หน่วย: {fg.FG_Unit} | ขนาด: {fg.FG_Size}
															</div>
														</button>
													))}
													<div className="border-t border-gray-200">
														<button
															type="button"
															className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 font-medium"
															onClick={() => {
																setShowNewFGForm(true);
																setShowFgDropdown(false);
																setNewFG(prev => ({
																	...prev,
																	FG_Code: fgSearchQuery
																}));
															}}
														>
															<Plus className="w-4 h-4 inline mr-2" />
															เพิ่มสินค้าสำเร็จรูปใหม่: "{fgSearchQuery}"
														</button>
													</div>
												</>
											) : fgSearchQuery ? (
												<div className="px-4 py-2">
													<div className="text-gray-500 mb-2">ไม่พบสินค้าสำเร็จรูป</div>
													<button
														type="button"
														className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 font-medium rounded-md border border-blue-200"
														onClick={() => {
															setShowNewFGForm(true);
															setShowFgDropdown(false);
															setNewFG(prev => ({
																...prev,
																FG_Code: fgSearchQuery
															}));
														}}
													>
														<Plus className="w-4 h-4 inline mr-2" />
														เพิ่มสินค้าสำเร็จรูปใหม่: "{fgSearchQuery}"
													</button>
												</div>
											) : null}
										</div>
									)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ชื่อสินค้าสำเร็จรูป
									</label>
									<input
										type="text"
										className="input"
										placeholder="เช่น บะหมี่แห้ง"
										{...register('FG_Name')}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										หน่วยแสดงผล *
									</label>
									<select
										className="input"
										{...register('FG_Unit', { required: true })}
									>
										<option value="กก.">กก.</option>
										<option value="กรัม">กรัม</option>
										<option value="แพ็ค">แพ็ค</option>
										<option value="กล่อง">กล่อง</option>
										<option value="ชิ้น">ชิ้น</option>
										<option value="ถุง">ถุง</option>
										<option value="ขวด">ขวด</option>
										<option value="กระปุก">กระปุก</option>
										<option value="ซอง">ซอง</option>
										<option value="ลิตร">ลิตร</option>
										<option value="มล.">มล.</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										หน่วยฐาน *
									</label>
									<select
										className="input"
										{...register('base_unit', { required: true })}
									>
										<option value="กก.">กก.</option>
										<option value="กรัม">กรัม</option>
										<option value="ลิตร">ลิตร</option>
										<option value="มล.">มล.</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										อัตราส่วนการแปลง *
									</label>
									<input
										type="number"
										step="0.0001"
										className="input"
										placeholder="เช่น 2.0000"
										{...register('conversion_rate', { required: true, min: 0 })}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										คำอธิบาย
									</label>
									<input
										type="text"
										className="input"
										placeholder="เช่น 1 แพ็ค = 2 กก."
										{...register('conversion_description')}
									/>
								</div>
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

				{/* Modal สำหรับเพิ่มสินค้าสำเร็จรูปใหม่ */}
				{showNewFGForm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
							<h3 className="text-lg font-semibold mb-4">เพิ่มสินค้าสำเร็จรูปใหม่</h3>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										รหัสสินค้าสำเร็จรูป *
									</label>
									<input
										type="text"
										className="input"
										value={newFG.FG_Code}
										onChange={(e) => setNewFG(prev => ({ ...prev, FG_Code: e.target.value }))}
										placeholder="เช่น 230060"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ชื่อสินค้าสำเร็จรูป *
									</label>
									<input
										type="text"
										className="input"
										value={newFG.FG_Name}
										onChange={(e) => setNewFG(prev => ({ ...prev, FG_Name: e.target.value }))}
										placeholder="เช่น บะหมี่แห้ง"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										หน่วย
									</label>
									<select
										className="input"
										value={newFG.FG_Unit}
										onChange={(e) => setNewFG(prev => ({ ...prev, FG_Unit: e.target.value }))}
									>
										<option value="กก.">กก.</option>
										<option value="กรัม">กรัม</option>
										<option value="แพ็ค">แพ็ค</option>
										<option value="กล่อง">กล่อง</option>
										<option value="ชิ้น">ชิ้น</option>
										<option value="ถุง">ถุง</option>
										<option value="ขวด">ขวด</option>
										<option value="กระปุก">กระปุก</option>
										<option value="ซอง">ซอง</option>
										<option value="ลิตร">ลิตร</option>
										<option value="มล.">มล.</option>
									</select>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ขนาด
									</label>
									<input
										type="text"
										className="input"
										value={newFG.FG_Size}
										onChange={(e) => setNewFG(prev => ({ ...prev, FG_Size: e.target.value }))}
										placeholder="เช่น 100g, 500ml"
									/>
								</div>
							</div>
							
							<div className="flex gap-2 mt-6">
								<button
									type="button"
									onClick={addNewFG}
									disabled={loading}
									className="btn btn-primary flex-1"
								>
									{loading ? 'กำลังเพิ่ม...' : 'เพิ่มสินค้าสำเร็จรูป'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowNewFGForm(false);
										setNewFG({
											FG_Code: '',
											FG_Name: '',
											FG_Unit: 'กก.',
											FG_Size: ''
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
										รหัสสินค้า
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										ชื่อสินค้า
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										หน่วยแสดงผล
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										หน่วยฐาน
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										อัตราส่วน
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
									<tr key={item.FG_Code} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{item.FG_Code}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{item.FG_Name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">
											{item.FG_Unit}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50">
											{item.base_unit}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
											{formatNumber(item.conversion_rate, 4)}
										</td>
										<td className="px-6 py-4 text-sm text-gray-900">
											{item.conversion_description || '-'}
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
							<Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500">ยังไม่มีข้อมูลค่าแปลงหน่วยสินค้าสำเร็จรูป</p>
						</div>
					)}

					{/* สรุปข้อมูล */}
					{conversionRates.length > 0 && (
						<div className="mt-6 p-4 bg-blue-50 rounded-lg">
							<h3 className="text-lg font-semibold text-blue-900 mb-2">สรุปข้อมูล</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="text-center">
									<div className="text-2xl font-bold text-blue-600">
										{conversionRates.length}
									</div>
									<div className="text-sm text-blue-700">จำนวนสินค้าทั้งหมด</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600">
										{conversionRates.filter(item => item.conversion_rate !== 1).length}
									</div>
									<div className="text-sm text-green-700">สินค้าที่มีการแปลงหน่วย</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-purple-600">
										{conversionRates.filter(item => item.conversion_rate === 1).length}
									</div>
									<div className="text-sm text-purple-700">สินค้าที่ไม่มีการแปลงหน่วย</div>
								</div>
							</div>
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
								<h2 className="text-2xl font-bold text-gray-900">คู่มือการใช้งาน - จัดการค่าแปลงหน่วยสินค้าสำเร็จรูป</h2>
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
									ระบบนี้ใช้สำหรับกำหนดอัตราส่วนการแปลงหน่วยของสินค้าสำเร็จรูป (FG) เช่น 1 แพ็ค = 2 กก. 
									ซึ่งจะช่วยในการคำนวณต้นทุนและแสดงผลรายงานได้อย่างแม่นยำ
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
											<h4 className="font-semibold text-gray-700 mb-2">1. รหัสสินค้าสำเร็จรูป *</h4>
											<p className="text-sm text-gray-600 mb-2">รหัสของสินค้าสำเร็จรูป</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> 230060, 230061, 230062
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">2. ชื่อสินค้าสำเร็จรูป</h4>
											<p className="text-sm text-gray-600 mb-2">ชื่อของสินค้าสำเร็จรูป</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> บะหมี่แห้ง, น้ำซุป, เครื่องปรุง
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">3. หน่วยแสดงผล *</h4>
											<p className="text-sm text-gray-600 mb-2">หน่วยที่ใช้แสดงผลในรายงาน</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> แพ็ค, กล่อง, ชิ้น, ถุง, ขวด
											</div>
										</div>
									</div>

									<div className="space-y-4">
										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">4. หน่วยฐาน *</h4>
											<p className="text-sm text-gray-600 mb-2">หน่วยพื้นฐานที่ใช้ในการคำนวณ</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> กก., กรัม, ลิตร, มล.
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">5. อัตราส่วนการแปลง *</h4>
											<p className="text-sm text-gray-600 mb-2">จำนวนหน่วยฐานที่ได้จาก 1 หน่วยแสดงผล</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong><br/>
												• 1 แพ็ค = 2 กก. → ใส่ 2.0000<br/>
												• 1 กล่อง = 0.5 กก. → ใส่ 0.5000<br/>
												• 1 ชิ้น = 0.1 กก. → ใส่ 0.1000
											</div>
										</div>

										<div className="border border-gray-200 rounded-lg p-4">
											<h4 className="font-semibold text-gray-700 mb-2">6. คำอธิบาย</h4>
											<p className="text-sm text-gray-600 mb-2">คำอธิบายการแปลงหน่วย</p>
											<div className="bg-gray-50 p-2 rounded text-sm">
												<strong>ตัวอย่าง:</strong> 1 แพ็ค = 2 กก., 1 กล่อง = 500 กรัม
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
											<h4 className="font-semibold text-orange-800 mb-3">🍜 บะหมี่แห้ง</h4>
											<div className="space-y-2 text-sm">
												<div><strong>รหัส:</strong> 230060</div>
												<div><strong>หน่วยแสดงผล:</strong> แพ็ค</div>
												<div><strong>หน่วยฐาน:</strong> กก.</div>
												<div><strong>อัตราส่วน:</strong> 2.0000</div>
												<div><strong>คำอธิบาย:</strong> 1 แพ็ค = 2 กก.</div>
											</div>
										</div>

										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🥤 น้ำซุป</h4>
											<div className="space-y-2 text-sm">
												<div><strong>รหัส:</strong> 230061</div>
												<div><strong>หน่วยแสดงผล:</strong> ขวด</div>
												<div><strong>หน่วยฐาน:</strong> ลิตร</div>
												<div><strong>อัตราส่วน:</strong> 0.5000</div>
												<div><strong>คำอธิบาย:</strong> 1 ขวด = 0.5 ลิตร</div>
											</div>
										</div>

										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🧂 เครื่องปรุง</h4>
											<div className="space-y-2 text-sm">
												<div><strong>รหัส:</strong> 230062</div>
												<div><strong>หน่วยแสดงผล:</strong> กล่อง</div>
												<div><strong>หน่วยฐาน:</strong> กก.</div>
												<div><strong>อัตราส่วน:</strong> 0.2500</div>
												<div><strong>คำอธิบาย:</strong> 1 กล่อง = 0.25 กก.</div>
											</div>
										</div>

										<div className="bg-white p-4 rounded border">
											<h4 className="font-semibold text-orange-800 mb-3">🍪 ขนม</h4>
											<div className="space-y-2 text-sm">
												<div><strong>รหัส:</strong> 230063</div>
												<div><strong>หน่วยแสดงผล:</strong> ชิ้น</div>
												<div><strong>หน่วยฐาน:</strong> กก.</div>
												<div><strong>อัตราส่วน:</strong> 0.0500</div>
												<div><strong>คำอธิบาย:</strong> 1 ชิ้น = 0.05 กก.</div>
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
												<li>• ใส่อัตราส่วนผิด (เช่น ใส่ 0.5 แทน 2)</li>
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

export default FGConversionRates;
