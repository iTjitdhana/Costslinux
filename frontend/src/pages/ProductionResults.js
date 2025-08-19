import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { batchAPI, productionAPI, formatNumber } from '../services/api';

const ProductionResults = () => {
	const { register, handleSubmit, watch, reset, setValue } = useForm({
		defaultValues: { batch_id: '', fg_code: '', good_qty: '', good_secondary_qty: '', good_secondary_unit: '', defect_qty: '', recorded_by: '' }
	});
	const [batches, setBatches] = useState([]);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(false);
	const [dataSource, setDataSource] = useState(''); // 'existing' หรือ 'new'
	const batchId = watch('batch_id');

	const loadBatches = async () => {
		try {
			const res = await batchAPI.getAll();
			setBatches(res.data.data || []);
		} catch {
			toast.error('โหลดล็อตไม่สำเร็จ');
		}
	};

	// โหลดข้อมูลผลผลิตที่มีอยู่
	const loadExistingResults = async (batchId) => {
		try {
			if (!batchId) return;
			
			setLoading(true);
			const res = await productionAPI.getResults(batchId);
			const existingData = res.data.data || [];
			
			if (existingData.length > 0) {
				// ใช้ข้อมูลล่าสุด
				const latestResult = existingData[0];
				setValue('fg_code', latestResult.fg_code || '');
				setValue('good_qty', String(latestResult.good_qty || ''));
				setValue('good_secondary_qty', latestResult.good_secondary_qty !== undefined && latestResult.good_secondary_qty !== null ? String(latestResult.good_secondary_qty) : '');
				setValue('good_secondary_unit', latestResult.good_secondary_unit || '');
				setValue('defect_qty', String(latestResult.defect_qty || ''));
				setValue('recorded_by', String(latestResult.recorded_by || ''));
				setDataSource('existing');
				toast.success('โหลดข้อมูลผลผลิตที่มีอยู่แล้ว');
			} else {
				// ถ้าไม่มีข้อมูล ให้เซ็ตค่าเริ่มต้น
				const batch = batches.find(b => b.id == batchId);
				if (batch) {
					setValue('fg_code', batch.fg_code || '');
					setValue('good_secondary_unit', batch.unit || '');
				}
				setValue('good_qty', '');
				setValue('good_secondary_qty', '');
				setValue('defect_qty', '');
				setValue('recorded_by', '');
				setDataSource('new');
			}
		} catch (error) {
			console.error(error);
			toast.error('โหลดข้อมูลผลผลิตไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// เมื่อเลือกล็อตใหม่
	useEffect(() => {
		if (batchId) {
			loadExistingResults(batchId);
		}
	}, [batchId]);

	useEffect(() => { loadBatches(); }, []);

	const onSave = async (values) => {
		try {
			if (!values.batch_id || values.good_qty === '' || values.defect_qty === '') {
				toast.error('กรอกข้อมูลให้ครบ: ล็อต, ผลผลิตดี, ของเสีย');
				return;
			}
			setSaving(true);
			
			// ตรวจสอบว่ามีข้อมูลผลผลิตอยู่แล้วหรือไม่
			const existingData = await productionAPI.getResults(values.batch_id);
			const hasExistingData = existingData.data.data && existingData.data.data.length > 0;
			
			const batch = batches.find(b => String(b.id) === String(values.batch_id));
			const payload = {
				batch_id: Number(values.batch_id),
				fg_code: batch?.fg_code || values.fg_code,
				good_qty: Number(values.good_qty),
				good_secondary_qty: values.good_secondary_qty === '' ? null : Number(values.good_secondary_qty),
				good_secondary_unit: values.good_secondary_unit || null,
				defect_qty: Number(values.defect_qty),
				recorded_by: values.recorded_by ? Number(values.recorded_by) : null,
				is_update: hasExistingData
			};
			
			await productionAPI.recordResults(payload);
			toast.success(hasExistingData ? 'อัพเดทผลผลิตสำเร็จ' : 'บันทึกผลผลิตสำเร็จ');
			
			// ไม่ reset form เพื่อให้สามารถแก้ไขต่อได้
			setDataSource('existing');
		} catch (error) {
			console.error(error);
			toast.error(error.response?.data?.error || 'บันทึกผลผลิตไม่สำเร็จ');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h2 className="text-lg font-semibold text-gray-900">บันทึกผลผลิต</h2>
				</div>
				<div className="card-body space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-7 gap-4">
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
							<label className="block text-sm text-gray-700 mb-1">ผลผลิตดี (กก.)</label>
							<input type="number" step="0.01" className="input" {...register('good_qty')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">ผลผลิตดี (หน่วยที่สอง)</label>
							<input type="number" step="0.01" className="input" placeholder="ไม่บังคับ" {...register('good_secondary_qty')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">หน่วยที่สอง</label>
							<input type="text" className="input" placeholder="เช่น แพ็ค, ชิ้น" {...register('good_secondary_unit')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">ของเสีย</label>
							<input type="number" step="0.01" className="input" {...register('defect_qty')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">ผู้บันทึก (user id)</label>
							<input type="number" className="input" {...register('recorded_by')} />
						</div>
						<div className="flex items-end">
							<button className="btn btn-primary" onClick={handleSubmit(onSave)} disabled={saving || !batchId}>
								{saving ? 'กำลังบันทึก...' : (dataSource === 'existing' ? 'อัพเดทผลผลิต' : 'บันทึกผลผลิต')}
							</button>
						</div>
					</div>

					{/* แสดงสถานะข้อมูล */}
					{dataSource && (
						<div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
							<div className={`w-3 h-3 rounded-full ${dataSource === 'existing' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
							<span className="text-sm text-gray-700">
								{dataSource === 'existing' 
									? 'โหลดข้อมูลผลผลิตที่มีอยู่แล้ว (สามารถแก้ไขได้)' 
									: 'ข้อมูลใหม่ (ยังไม่เคยบันทึกผลผลิต)'
								}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProductionResults;
