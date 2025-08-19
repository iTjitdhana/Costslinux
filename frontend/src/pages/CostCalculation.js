import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { batchAPI, costAPI, productionAPI, materialAPI, formatCurrency, formatDate, formatNumber } from '../services/api';

const CostCalculation = () => {
	const { register, handleSubmit, setValue, watch } = useForm({
		defaultValues: { batch_id: '', work_plan_id: '', job_code: '', job_name: '', production_date: '' }
	});
	const [batches, setBatches] = useState([]);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);

	const loadBatches = async () => {
		try {
			const res = await batchAPI.getAll();
			setBatches(res.data.data || []);
		} catch {
			toast.error('โหลดล็อตไม่สำเร็จ');
		}
	};

	useEffect(() => { loadBatches(); }, []);

	const onBatchChange = (batchId) => {
		const batch = batches.find(b => String(b.id) === String(batchId));
		if (batch) {
			setValue('work_plan_id', batch.work_plan_id);
			setValue('job_code', batch.job_code || '');
			setValue('job_name', batch.job_name || '');
			setValue('production_date', batch.production_date || '');
		}
	};

	const onCalculate = async (values) => {
		try {
			if (!values.batch_id || !values.work_plan_id || !values.job_code || !values.job_name || !values.production_date) {
				toast.error('ข้อมูลไม่ครบ');
				return;
			}
			setLoading(true);
			const payload = {
				batch_id: Number(values.batch_id),
				work_plan_id: Number(values.work_plan_id),
				job_code: values.job_code,
				job_name: values.job_name,
				production_date: values.production_date
			};
			const res = await costAPI.calculate(payload);
			const data = res.data.data || {};
			const yieldPercent = data.total_weight_kg > 0 ? (Number(data.output_qty || 0) / Number(data.total_weight_kg)) * 100 : 0;
			setResult({ ...data, yield_percent: yieldPercent });
			toast.success('คำนวณต้นทุนสำเร็จ');
		} catch (error) {
			console.error(error);
			toast.error(error.response?.data?.error || 'คำนวณต้นทุนไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	const batchOptions = useMemo(() => (batches || []).map(b => ({
		value: b.id,
		label: `${b.batch_code} (${b.fg_code})`,
		batch: b
	})), [batches]);

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h2 className="text-lg font-semibold text-gray-900">คำนวณต้นทุนการผลิต</h2>
				</div>
				<div className="card-body space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						<div>
							<label className="block text-sm text-gray-700 mb-1">ล็อต</label>
							<select className="input" {...register('batch_id')} onChange={(e) => onBatchChange(e.target.value)}>
								<option value="">-- เลือกล็อต --</option>
								{batchOptions.map((o) => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">Work Plan ID</label>
							<input type="number" className="input" {...register('work_plan_id')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">Job Code</label>
							<input type="text" className="input" {...register('job_code')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">Job Name</label>
							<input type="text" className="input" {...register('job_name')} />
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">Production Date</label>
							<input type="date" className="input" {...register('production_date')} />
						</div>
					</div>

					<div className="flex justify-end">
						<button className="btn btn-primary" onClick={handleSubmit(onCalculate)} disabled={loading}>
							{loading ? 'กำลังคำนวณ...' : 'คำนวณต้นทุน'}
						</button>
					</div>
				</div>
			</div>

			{result && (
				<div className="card">
					<div className="card-header">
						<h3 className="text-lg font-semibold text-gray-900">ผลการคำนวณ</h3>
					</div>
					<div className="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<div className="text-sm text-gray-700">ปริมาณวัตถุดิบรวม (กก.)</div>
							<div className="text-xl font-semibold">{formatNumber(result.total_weight_kg || 0, 3)}</div>
						</div>
						<div className="space-y-2">
							<div className="text-sm text-gray-700">FG ที่ได้</div>
							<div className="text-xl font-semibold">{formatNumber(result.output_qty || 0)}</div>
						</div>
						<div className="space-y-2">
							<div className="text-sm text-gray-700">Yield (%)</div>
							<div className="text-xl font-semibold">{formatNumber(result.yield_percent || 0, 2)}%</div>
						</div>
						<div className="space-y-2">
							<div className="text-sm text-gray-700">ต้นทุนวัตถุดิบรวม</div>
							<div className="text-xl font-semibold">{formatCurrency(result.material_cost || 0)}</div>
							<div className="text-sm text-gray-700">ต้นทุนต่อหน่วย</div>
							<div className="text-xl font-semibold">{formatCurrency(result.output_unit_cost || 0)}</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CostCalculation;
