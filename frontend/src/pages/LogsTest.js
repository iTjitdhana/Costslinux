import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { costAPI } from '../services/api';
import { Clock, RefreshCw, Database } from 'lucide-react';

const LogsTest = () => {
	const [loading, setLoading] = useState(false);
	const [logsData, setLogsData] = useState([]);
	const [batchTimeData, setBatchTimeData] = useState([]);
	const [summaryRows, setSummaryRows] = useState([]);
	const [fromDate, setFromDate] = useState(() => {
		const today = new Date();
		// ถ้ายังไม่ถึงเดือนกรกฎาคมของปีนี้ ให้ใช้ 1 ก.ค. ของปีที่แล้ว
		const baseYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
		const julyFirst = new Date(baseYear, 6, 1); // 6 = กรกฎาคม (0-based)
		return julyFirst.toISOString().split('T')[0];
	});
	const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
	const [jobCode, setJobCode] = useState('');
	const [jobName, setJobName] = useState('');
	const [jobSuggest, setJobSuggest] = useState([]);
	const [jobSuggestOpen, setJobSuggestOpen] = useState(false);
	const [typingTimer, setTypingTimer] = useState(null);

	// โหลดข้อมูล logs ทั้งหมด
	const loadLogsData = async () => {
		try {
			setLoading(true);
			const res = await costAPI.getLogsTest();
			setLogsData(res.data.data || []);
			toast.success('โหลดข้อมูล logs สำเร็จ');
		} catch (error) {
			console.error(error);
			toast.error('โหลดข้อมูล logs ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// คำนวณเวลาที่ใช้ของทุก batch
	const calculateAllBatchTimes = async () => {
		try {
			setLoading(true);
			
			// ดึง batch IDs ที่มีใน logs
			const batchIds = [...new Set(logsData
				.filter(log => log.batch_id)
				.map(log => log.batch_id)
			)];

			const timeResults = [];
			
			// คำนวณเวลาของแต่ละ batch
			for (const batchId of batchIds) {
				try {
					const res = await costAPI.getTimeUsed(batchId);
					const batchInfo = logsData.find(log => log.batch_id == batchId);
					timeResults.push({
						...res.data.data,
						batch_code: batchInfo?.batch_code || 'N/A',
						job_code: batchInfo?.job_code || 'N/A',
						job_name: batchInfo?.job_name || 'N/A'
					});
				} catch (error) {
					console.error(`Error calculating time for batch ${batchId}:`, error);
				}
			}

			setBatchTimeData(timeResults);
			toast.success(`คำนวณเวลาที่ใช้สำเร็จ ${timeResults.length} batch`);
		} catch (error) {
			console.error(error);
			toast.error('คำนวณเวลาที่ใช้ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// โหลดสรุป logs ตามช่วงวันที่/รหัสงาน
	const loadLogsSummary = async () => {
		try {
			setLoading(true);
			const params = { from: fromDate, to: toDate };
			if (jobCode.trim()) params.job_code = jobCode.trim();
			if (jobName.trim()) params.job_name = jobName.trim();
			const res = await costAPI.getLogsSummary(params);
			setSummaryRows(res.data.data || []);
			toast.success(`โหลดสรุป Logs สำเร็จ (${res.data.count || 0} รายการ)`);
		} catch (error) {
			console.error(error);
			toast.error('โหลดสรุป Logs ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadLogsData();
		// preload summary
		loadLogsSummary();
	}, []);

	const formatHM = (mins) => {
		const m = Number(mins || 0);
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	};

	const onChangeJobName = (value) => {
		setJobName(value);
		if (typingTimer) clearTimeout(typingTimer);
		if (!value || value.trim().length < 1) {
			setJobSuggest([]);
			setJobSuggestOpen(false);
			return;
		}
		const timer = setTimeout(async () => {
			try {
				const params = { q: value, from: fromDate, to: toDate };
				const res = await costAPI.suggestJobs(params);
				setJobSuggest(res.data.data || []);
				setJobSuggestOpen(true);
			} catch (e) {
				console.error(e);
			}
		}, 300);
		setTypingTimer(timer);
	};

	const pickSuggestion = (s) => {
		setJobName(s.job_name);
		setJobCode(s.job_code || '');
		setJobSuggestOpen(false);
	};

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h1 className="text-2xl font-bold text-gray-900">Logs การผลิต</h1>
					<p className="text-gray-600">
						ดูเวลารวมต่อวันแยกตามงาน (job code) และรายชื่อผู้ปฏิบัติงาน
					</p>
				</div>
				<div className="card-body space-y-6">
					{/* ตัวกรองสรุป */}
					<div className="bg-gray-50 p-4 rounded-lg">
						<div className="flex flex-wrap items-end gap-4 relative">
							<div>
								<label className="block text-sm font-medium text-gray-700">จากวันที่</label>
								<input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">ถึงวันที่</label>
								<input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">รหัสงาน (ไม่บังคับ)</label>
								<input type="text" className="input" placeholder="เช่น 235001" value={jobCode} onChange={(e) => setJobCode(e.target.value)} />
							</div>
							<div className="w-64">
								<label className="block text-sm font-medium text-gray-700">ชื่องาน (ไม่บังคับ)</label>
								<input type="text" className="input w-full" placeholder="เช่น หมูเด้ง" value={jobName} onChange={(e) => onChangeJobName(e.target.value)} onFocus={() => jobSuggest.length && setJobSuggestOpen(true)} />
								{jobSuggestOpen && jobSuggest.length > 0 && (
									<div className="absolute mt-1 w-64 bg-white border border-gray-200 rounded shadow z-10">
										{jobSuggest.map((s) => (
											<div key={`${s.job_code}-${s.job_name}`} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => pickSuggestion(s)}>
												<div className="text-sm text-gray-900">{s.job_name}</div>
												<div className="text-xs text-gray-500">{s.job_code} • ล่าสุด {new Date(s.last_date).toLocaleDateString('th-TH')}</div>
											</div>
										))}
									</div>
								)}
							</div>
							<button onClick={loadLogsSummary} disabled={loading} className="btn btn-primary">
								แสดงสรุปตามงาน/วัน
							</button>
						</div>
					</div>

					{/* ตารางสรุป: แสดงเป็นรายการ งาน-ต่อ-วัน */}
					{summaryRows.length > 0 && (
						<div className="bg-white p-4 rounded-lg border border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">สรุปเวลาตามงานและวัน</h3>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-100">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Code</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Name</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ผลิต</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลารวม (ชั่วโมง:นาที)</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวน Logs</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ปฏิบัติงาน</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{summaryRows.map((row) => (
											<tr key={row.work_plan_id} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.job_code}</td>
												<td className="px-4 py-3 text-sm text-gray-900">{row.job_name}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{new Date(row.production_date).toLocaleDateString('th-TH')}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{formatHM(row.time_used_minutes)}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.logs_count}</td>
												<td className="px-4 py-3 text-sm text-gray-900">{row.operators || '-'}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ปุ่มควบคุม */}
					<div className="flex items-center gap-4">
						<button
							onClick={loadLogsData}
							disabled={loading}
							className="btn btn-secondary flex items-center gap-2"
						>
							<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
							รีเฟรช Logs
						</button>
						<button
							onClick={calculateAllBatchTimes}
							disabled={loading || logsData.length === 0}
							className="btn btn-primary flex items-center gap-2"
						>
							<Clock size={16} />
							คำนวณเวลาทั้งหมด
						</button>
					</div>

					{/* แสดงผลการคำนวณเวลาของทุก Batch */}
					{batchTimeData.length > 0 && (
						<div className="bg-green-50 p-4 rounded-lg">
							<h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
								<Clock size={20} />
								ผลการคำนวณเวลาที่ใช้ของทุก Batch
							</h3>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-green-100">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Batch ID
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Batch Code
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Job Code
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Job Name
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												เวลารวม (นาที)
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												จำนวน Logs
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Process Times
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{batchTimeData.map((item) => (
											<tr key={item.batch_id} className="hover:bg-gray-50">
												<td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
													{item.batch_id}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.batch_code}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.job_code}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.job_name}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
													{item.total_time_minutes} นาที
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.logs_count}
												</td>
												<td className="px-4 py-4 text-sm text-gray-900">
													{Object.keys(item.process_times).length > 0 ? (
														<ul className="list-disc list-inside">
															{Object.entries(item.process_times).map(([process, time]) => (
																<li key={process}>
																	Process {process}: {time} นาที
																</li>
															))}
													</ul>
												) : (
													<span className="text-gray-400">ไม่มีข้อมูล</span>
												)}
											</td>
										</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ตารางแสดงข้อมูล Logs */}
					<div className="bg-gray-50 p-4 rounded-lg">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Database size={20} />
							ข้อมูล Logs ล่าสุด (20 รายการ)
						</h3>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											ID
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Work Plan ID
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Batch ID
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Process
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Timestamp
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Batch Code
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Job Code
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Job Name
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{loading ? (
										<tr>
											<td colSpan="9" className="px-4 py-8 text-center text-gray-500">
												กำลังโหลดข้อมูล...
											</td>
										</tr>
									) : logsData.length === 0 ? (
										<tr>
											<td colSpan="9" className="px-4 py-8 text-center text-gray-500">
												ไม่พบข้อมูล logs
											</td>
										</tr>
									) : (
										logsData.map((log) => (
											<tr key={log.id} className="hover:bg-gray-50">
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.id}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.work_plan_id || '-'}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.batch_id || '-'}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.process_number || '-'}
												</td>
												<td className="px-4 py-4 whitespace-nowrap">
													<span className={`px-2 py-1 text-xs font-medium rounded-full ${
														log.status === 'start'
															? 'bg-green-100 text-green-800'
															: 'bg-red-100 text-red-800'
													}` }>
														{log.status}
													</span>
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{new Date(log.timestamp).toLocaleString('th-TH')}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.batch_code || '-'}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.job_code || '-'}
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
													{log.job_name || '-'}
												</td>
											</tr>
										))
									)}
							</tbody>
						</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LogsTest;
