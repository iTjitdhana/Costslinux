import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { costAPI } from '../services/api';

// Toggle toast notifications on/off
const TOAST_ENABLED = false;

// Helper: format yyyy-mm-dd to Thai long date (e.g., 28 สิงหาคม 2568)
const formatDateTH = (d) => {
	if (!d) return '';
	try {
		return new Date(d).toLocaleDateString('th-TH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	} catch (e) {
		return d;
	}
};

const LogsTest = () => {
	const [loading, setLoading] = useState(false);
	const [summaryRows, setSummaryRows] = useState([]);
	const [fromDate, setFromDate] = useState(() => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	});
	const [toDate, setToDate] = useState(() => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	});
	// Applied dates (change only after pressing Search)
	const [appliedFromDate, setAppliedFromDate] = useState(() => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	});
	const [appliedToDate, setAppliedToDate] = useState(() => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	});
	const [jobCode, setJobCode] = useState('');
	const [jobName, setJobName] = useState('');
	const [jobSuggest, setJobSuggest] = useState([]);
	const [jobSuggestOpen, setJobSuggestOpen] = useState(false);
	const [typingTimer, setTypingTimer] = useState(null);




	// โหลดสรุป logs ตามช่วงวันที่/รหัสงาน
	const loadLogsSummary = async () => {
		try {
			setLoading(true);
			const params = { from: fromDate, to: toDate };
			if (jobCode.trim()) params.job_code = jobCode.trim();
			if (jobName.trim()) params.job_name = jobName.trim();
			const res = await costAPI.getLogsSummary(params);
			let rows = res.data.data || [];
			const isSameDay = fromDate === toDate;
			const usedSearch = Boolean(jobCode.trim() || jobName.trim());
			if (!isSameDay || usedSearch) {
				const toTs = (d) => {
					if (!d) return 0;
					const t = new Date(d).getTime();
					return Number.isNaN(t) ? 0 : t;
				};
				rows = [...rows].sort((a, b) => {
					const pa = toTs(a.production_date);
					const pb = toTs(b.production_date);
					if (pa !== pb) return pa - pb;
					const sa = toTs(a.planned_start_time);
					const sb = toTs(b.planned_start_time);
					// null/0 ไปท้าย
					if (!sa && sb) return 1;
					if (sa && !sb) return -1;
					return sa - sb;
				});
			}
			setSummaryRows(rows);
			// Apply selected dates to header only after successful search
			setAppliedFromDate(fromDate);
			setAppliedToDate(toDate);
			if (TOAST_ENABLED) toast.success(`โหลดสรุป Logs สำเร็จ (${res.data.count || 0} รายการ)`);
		} catch (error) {
			console.error(error);
			if (TOAST_ENABLED) toast.error('โหลดสรุป Logs ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// preload summary
		loadLogsSummary();
	}, []);

	const formatHM = (mins) => {
		const m = Number(mins || 0);
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	};

	const formatTime = (timeStr) => {
		if (!timeStr) return '-';
		try {
			const time = new Date(timeStr);
			return time.toLocaleTimeString('th-TH', { 
				hour: '2-digit', 
				minute: '2-digit'
			});
		} catch (error) {
			return timeStr;
		}
	};

	const formatTimeRange = (startTime, endTime) => {
		if (!startTime || !endTime || startTime === 'null' || endTime === 'null') return '-';
		return `${formatTime(startTime)} - ${formatTime(endTime)}`;
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

	// Summary aggregates for card
	const summaryAgg = useMemo(() => {
		const count = summaryRows.length;
		const plannedTotal = summaryRows.reduce((acc, r) => acc + (Number(r.planned_total_minutes) || 0), 0);
		const actualTotal = summaryRows.reduce((acc, r) => acc + (Number(r.time_used_minutes) || 0), 0);
		return { count, plannedTotal, actualTotal };
	}, [summaryRows]);

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h1 className="text-2xl font-bold text-gray-900">ประวัติการผลิต</h1>
					<p className="text-gray-600">ข้อมูลเวลาการผลิตย้อนหลัง–ปัจจุบัน</p>
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
								<label className="block text-sm font-medium text-gray-700">ค้นหาด้วยรหัส (ไม่บังคับ)</label>
								<input type="text" className="input" placeholder="เช่น 235001" value={jobCode} onChange={(e) => setJobCode(e.target.value)} />
							</div>
							<div className="w-64">
								<label className="block text-sm font-medium text-gray-700">ค้นหาด้วย ชื่องาน/ชื่อสินค้า (ไม่บังคับ)</label>
								<input type="text" className="input w-full" placeholder="เช่น หมูเด้ง" value={jobName} onChange={(e) => setJobName(e.target.value)} onFocus={() => jobSuggest.length && setJobSuggestOpen(true)} />
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
								ค้นหา
							</button>
						</div>
					</div>

					{/* Summary Card */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="bg-white border border-gray-200 rounded-lg p-4">
							<div className="text-sm text-gray-500">จำนวนงาน</div>
							<div className="text-2xl font-bold text-gray-900 mt-1">{summaryAgg.count}</div>
						</div>
						<div className="bg-white border border-gray-200 rounded-lg p-4">
							<div className="text-sm text-gray-500">เวลารวมตามแผน (ชั่วโมง:นาที)</div>
							<div className="text-2xl font-bold text-blue-700 mt-1">{formatHM(summaryAgg.plannedTotal)}</div>
						</div>
						<div className="bg-white border border-gray-200 rounded-lg p-4">
							<div className="text-sm text-gray-500">เวลารวมผลิตจริง (ชั่วโมง:นาที)</div>
							<div className="text-2xl font-bold text-green-700 mt-1">{formatHM(summaryAgg.actualTotal)}</div>
						</div>
					</div>

					{/* ตารางสรุป: แสดงเป็นรายการ งาน-ต่อ-วัน */}
					{summaryRows.length > 0 && (
						<div className="bg-white p-4 rounded-lg border border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900 mb-1">
								{`ตารางแสดงประวัติการผลิต วันที่ ${formatDateTH(appliedFromDate)} - ${formatDateTH(appliedToDate)}`}
							</h3>
							<p className="text-sm text-gray-600 mb-4">เวลารวมผลิตจริงยังไม่หักเวลาพักเที่ยง 45 นาที</p>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200 border border-gray-200">
									<thead className="bg-gray-100">
										<tr>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">ลำดับ</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">รหัส</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">ชื่องาน/ชื่อสินค้า</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">วันที่ผลิต</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลาตามแผนผลิตเริ่มต้น-สิ้นสุด (ชั่วโมง:นาที)</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลารวมตามแผนผลิต (ชั่วโมง:นาที)</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลาผลิตจริงเริ่มต้น-สิ้นสุด (ชั่วโมง:นาที)</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลารวมผลิตจริง (ชั่วโมง:นาที)</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">ผู้ปฏิบัติงาน</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">Batch การผลิต</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">Yield %</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{summaryRows.map((row, idx) => (
											<tr key={row.work_plan_id} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{idx + 1}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200">{row.job_code}</td>
												<td className="px-4 py-3 text-sm text-gray-900 border-x border-gray-200">{row.job_name}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{new Date(row.production_date).toLocaleDateString('th-TH')}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">
													{formatTimeRange(row.planned_start_time, row.planned_end_time)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-blue-700 font-semibold border-x border-gray-200 text-center">
													{row.planned_total_minutes && row.planned_total_minutes > 0 ? formatHM(row.planned_total_minutes) : '-'}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">
													{formatTimeRange(row.actual_start_time, row.actual_end_time)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-700 border-x border-gray-200 text-center">
													{row.time_used_minutes && row.time_used_minutes > 0 ? formatHM(row.time_used_minutes) : '-'}
												</td>
												<td className="px-4 py-3 text-sm text-gray-900 border-x border-gray-200">{row.operators || '-'}</td>
												<td className="px-4 py-3 text-sm text-gray-900 border-x border-gray-200 text-center">-</td>
												<td className="px-4 py-3 text-sm text-gray-900 border-x border-gray-200 text-center">-</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}



									</div>
			</div>
		</div>
	);
};

export default LogsTest;
