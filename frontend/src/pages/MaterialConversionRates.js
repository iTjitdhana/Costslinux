import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { costAPI } from '../services/api';
import { RefreshCw, Plus, Edit, Trash2, Info } from 'lucide-react';

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

	useEffect(() => {
		fetchConversionRates();
		fetchMaterials();
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
	};

	const materialOptions = materials.map(m => ({
		value: m.Mat_Id,
		label: `${m.Mat_Name} (${m.Mat_Id})`
	}));

	return (
		<div className="container mx-auto px-4 py-8">
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
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										รหัสวัตถุดิบ
									</label>
									<select className="input" {...register('Mat_Id')}>
										<option value="">-- เลือกวัตถุดิบ --</option>
										{materialOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
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
		</div>
	);
};

export default MaterialConversionRates;
