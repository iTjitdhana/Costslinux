import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { batchAPI, formatDate, formatNumber } from '../services/api';

const BatchManagement = () => {
	const { register, handleSubmit, setValue, reset, watch } = useForm({
		defaultValues: { work_plan_id: '', fg_code: '', planned_qty: '', production_date: '' }
	});
	const [batches, setBatches] = useState([]);
	const [workPlans, setWorkPlans] = useState([]);
	const [loading, setLoading] = useState(false);
	const [plannedQtyByWp, setPlannedQtyByWp] = useState({});
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [datePickerValue, setDatePickerValue] = useState(new Date().toISOString().split('T')[0]);

	const loadBatches = async () => {
		try {
			const res = await batchAPI.getAll();
			setBatches(res.data.data || []);
		} catch {
			toast.error('โหลดล็อตไม่สำเร็จ');
		}
	};

	const loadTodayWorkPlans = async (date = selectedDate) => {
		try {
			// ใช้วันที่ที่ผู้ใช้เลือกตรง ๆ โดยไม่ขยับ +1 วัน
			const apiDateStr = date; // ควรอยู่ในรูปแบบ YYYY-MM-DD แล้วจาก date picker
			console.log(`Frontend เลือกวันที่: ${date}, เรียก API ด้วยวันที่เดียวกัน: ${apiDateStr}`);
			
			const res = await batchAPI.getWorkPlansByDate(apiDateStr);
			
			// ถ้าไม่มีข้อมูล ให้ลองหาวันล่าสุดที่มีข้อมูล
			if (!res.data.data || res.data.data.length === 0) {
				console.log(`ไม่มี Work Plan สำหรับวันที่ ${apiDateStr} ลองหาวันล่าสุดที่มีข้อมูล...`);
				
				// ลองหาวันล่าสุดที่มีข้อมูล (ลองย้อนหลัง 7 วัน)
				for (let i = 1; i <= 7; i++) {
					const testDate = new Date(apiDateStr);
					testDate.setDate(testDate.getDate() - i);
					const testDateStr = testDate.toISOString().split('T')[0];
					
					try {
						const testRes = await batchAPI.getWorkPlansByDate(testDateStr);
						if (testRes.data.data && testRes.data.data.length > 0) {
							console.log(`พบข้อมูลในวันที่ ${testDateStr}`);
							setWorkPlans(testRes.data.data || []);
							// แสดงวันที่ที่ Frontend เลือก (ไม่ใช่วันที่ API)
							setSelectedDate(date);
							setDatePickerValue(date);
							toast.success(`แสดงข้อมูลวันที่ ${date} (มี ${testRes.data.data.length} รายการ)`);
							return;
						}
					} catch (error) {
						console.error(`Error testing date ${testDateStr}:`, error);
					}
				}
				
				// ถ้าไม่พบข้อมูลเลย
				setWorkPlans([]);
				toast.warning(`ไม่พบ Work Plan ใน 7 วันที่ผ่านมา`);
			} else {
				setWorkPlans(res.data.data || []);
				toast.success(`แสดงข้อมูลวันที่ ${date} (มี ${res.data.data.length} รายการ)`);
			}
		} catch (error) {
			console.error('Error loading work plans:', error);
			toast.error('โหลด Work Plan ไม่สำเร็จ');
		}
	};

	const changeDate = async (newDate) => {
		setSelectedDate(newDate);
		setDatePickerValue(newDate);
		await loadTodayWorkPlans(newDate);
	};

	useEffect(() => {
		loadBatches();
		loadTodayWorkPlans(selectedDate);
	}, [selectedDate]);

	const generateBatchCode = (jobCode, fgName) => {
		const now = new Date();
		const year = String(now.getFullYear() + 543).slice(-2); // พ.ศ. 2 หลัก
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const dateStr = `${year}${month}${day}`;
		return `${jobCode}+${dateStr}(${fgName || 'Unknown'})`;
	};

	const onChangePlannedQty = (workPlanId, value) => {
		setPlannedQtyByWp(prev => ({ ...prev, [workPlanId]: value }));
	};

	const createBatchForWorkPlan = async (workPlan) => {
		try {
			const qty = Number(plannedQtyByWp[workPlan.id]);
			if (!qty || qty <= 0) {
				toast.error('กรุณาใส่จำนวนวางแผนให้ถูกต้อง');
				return;
			}
			setLoading(true);
			const payload = {
				batch_code: generateBatchCode(workPlan.job_code, workPlan.fg_name),
				work_plan_id: Number(workPlan.id),
				fg_code: workPlan.fg_code || workPlan.job_code,
				planned_qty: qty,
				production_date: workPlan.production_date,
				fg_name: workPlan.fg_name,
				status: 'pending'
			};
			await batchAPI.create(payload);
			toast.success(`สร้างล็อตสำหรับ ${workPlan.job_code} - ${workPlan.job_name} สำเร็จ`);
			setPlannedQtyByWp(prev => ({ ...prev, [workPlan.id]: '' }));
			loadBatches();
		} catch (error) {
			console.error(error);
			toast.error(error.response?.data?.error || 'สร้างล็อตไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = () => {
		loadBatches();
		loadTodayWorkPlans();
	};

	const getStatusBadge = (status) => {
		const statusConfig = {
			pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-800' },
			in_progress: { label: 'กำลังผลิต', color: 'bg-blue-100 text-blue-800' },
			completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-800' },
			cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800' }
		};
		const config = statusConfig[status] || statusConfig.pending;
		return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
	};

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<div className="flex justify-between items-center">
						<h2 className="text-lg font-semibold text-gray-900">สร้างล็อตการผลิตใหม่</h2>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-gray-700">เลือกวันที่:</label>
								<input 
									type="date" 
									className="input w-40"
									value={datePickerValue}
									onChange={(e) => {
										setDatePickerValue(e.target.value);
										changeDate(e.target.value);
									}}
								/>
							</div>
							<button 
								className="btn btn-secondary text-sm"
								onClick={() => {
									const today = new Date().toISOString().split('T')[0];
									changeDate(today);
								}}
							>
								วันนี้
							</button>
							<button 
								className="btn btn-secondary text-sm"
								onClick={() => {
									const yesterday = new Date();
									yesterday.setDate(yesterday.getDate() - 1);
									const yesterdayStr = yesterday.toISOString().split('T')[0];
									changeDate(yesterdayStr);
								}}
							>
								เมื่อวาน
							</button>
						</div>
					</div>
				</div>
				<div className="card-body">
					{/* แสดงข้อมูลวันที่และจำนวน Work Plan */}
					<div className="mb-4 p-3 bg-blue-50 rounded-lg">
						<div className="flex items-center justify-between">
							<div>
								<span className="text-sm font-medium text-blue-800">
									วันที่: {formatDate(selectedDate)}
								</span>
								<span className="ml-4 text-sm text-blue-600">
									พบ Work Plan: {workPlans.length} รายการ
								</span>
							</div>
							{workPlans.length === 0 && (
								<span className="text-sm text-orange-600">
									💡 ลองกดปุ่ม "เมื่อวาน" เพื่อดูข้อมูลที่มีอยู่
								</span>
							)}
						</div>
					</div>
					
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Plan ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Code</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FG Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ผลิต</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนวางแผน</th>
									<th className="px-6 py-3"></th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{(workPlans || []).length === 0 && (
									<tr>
										<td colSpan={7} className="px-6 py-8 text-center">
											<div className="text-gray-500">
												<div className="text-lg font-medium mb-2">
													ไม่มี Work Plan สำหรับวันที่ {formatDate(selectedDate)}
												</div>
												<div className="text-sm">
													ลองเลือกวันที่อื่นหรือกดปุ่ม "เมื่อวาน" เพื่อดูข้อมูลที่มีอยู่
												</div>
											</div>
										</td>
									</tr>)}
								{(workPlans || []).map((wp) => (
									<tr key={wp.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{wp.id}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{wp.job_code}</td>
										<td className="px-6 py-4 text-sm text-gray-900">{wp.job_name}</td>
										<td className="px-6 py-4 text-sm text-gray-900">{wp.fg_name || '-'}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(wp.production_date)}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<input 
												type="number" 
												step="0.01" 
												className="input w-32" 
												value={plannedQtyByWp[wp.id] ?? ''}
												onChange={(e) => onChangePlannedQty(wp.id, e.target.value)}
												placeholder="เช่น 100.00"
											/>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<button 
												className="btn btn-primary"
												onClick={() => createBatchForWorkPlan(wp)}
												disabled={loading}
											>
												สร้างล็อต
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div className="card">
				<div className="card-header flex justify-between items-center">
					<h3 className="text-lg font-semibold text-gray-900">รายการล็อตการผลิต</h3>
					<button className="btn btn-secondary" onClick={onRefresh}>
						รีเฟรช
					</button>
				</div>
				<div className="card-body">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสล็อต</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FG</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนวางแผน</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ผลิต</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เริ่ม</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{batches.map((batch) => (
									<tr key={batch.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{batch.batch_code}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{batch.fg_code} - {batch.fg_name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{formatNumber(batch.planned_qty)} กก.
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{getStatusBadge(batch.status)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{formatDate(batch.production_date)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{formatDate(batch.created_at)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BatchManagement;
