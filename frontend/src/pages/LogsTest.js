import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { costAPI } from '../services/api';
import { getPageTitle } from '../config/pageTitles';

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
	const location = useLocation();
	const [loading, setLoading] = useState(false);
	const [summaryRows, setSummaryRows] = useState([]);
	const [currentRole, setCurrentRole] = useState(null);
	const [isLoadingRole, setIsLoadingRole] = useState(true);
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
	const [q, setQ] = useState('');
	const [jobSuggest, setJobSuggest] = useState([]);
	const [jobSuggestOpen, setJobSuggestOpen] = useState(false);
	const [typingTimer, setTypingTimer] = useState(null);

	// ตรวจสอบสิทธิ์การเข้าถึง
	const checkAccess = async () => {
		try {
			setIsLoadingRole(true);
			const path = location.pathname;
			let urlPrefix = '/';
			
			// หา URL prefix จาก path
			if (path.startsWith('/admin/')) {
				urlPrefix = '/admin/';
			} else if (path.startsWith('/planner/')) {
				urlPrefix = '/planner/';
			} else if (path.startsWith('/operator/')) {
				urlPrefix = '/operator/';
			} else if (path.startsWith('/viewer/')) {
				urlPrefix = '/viewer/';
			} else if (path.startsWith('/Operation/')) {
				urlPrefix = '/Operation/';
			} else if (path.startsWith('/Worker/')) {
				urlPrefix = '/Worker/';
			}
			
			// โหลด role configuration
			const response = await costAPI.getRoleByUrl(urlPrefix);
			setCurrentRole(response.data);
			
			// ตรวจสอบว่ามีสิทธิ์เข้าถึง Logs หรือไม่
			const hasLogsAccess = response.data.menu_items.includes('Logs การผลิต');
			if (!hasLogsAccess) {
				console.log('Access denied: Role does not have Logs permission');
				return false;
			}
			
			return true;
		} catch (error) {
			console.error('Error checking access:', error);
			return false;
		} finally {
			setIsLoadingRole(false);
		}
	};

	// ตรวจสอบสิทธิ์เมื่อโหลดหน้า
	useEffect(() => {
		checkAccess();
	}, [location.pathname]);

	// โหลดสรุป logs ตามช่วงวันที่/คำค้นหา
	const loadLogsSummary = async () => {
		try {
			setLoading(true);
			const params = { from: fromDate, to: toDate };
			if (q.trim()) params.q = q.trim();
			const res = await costAPI.getLogsSummary(params);
			let rows = res.data.data || [];
			console.log('Logs API Response:', res.data);
			console.log('Logs Rows:', rows);
			
			// transform shape (legacy handling)
			if (rows && rows.length > 0 && typeof rows[0] === 'object') {
				const firstRow = rows[0];
				const hasNumericKeys = Object.keys(firstRow).some(key => !isNaN(parseInt(key)));
				if (hasNumericKeys) {
					rows = Object.values(firstRow).filter(item => item && typeof item === 'object' && item.work_plan_id);
				}
			}
			const isSameDay = fromDate === toDate;
			const usedSearch = Boolean(q.trim());
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
					if (!sa && sb) return 1;
					if (sa && !sb) return -1;
					return sa - sb;
				});
			}

			// Ensure operators shown even if backend couldn't parse
			const parseOps = (raw) => {
				if (!raw) return [];
				if (Array.isArray(raw)) return raw;
				if (typeof raw === 'object') return Object.values(raw);
				try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
			};
			const pickName = (o) => {
				if (!o || typeof o !== 'object') return '';
				for (const k of ['name','Name','full_name','fullname','display_name','th_name','thai_name']) {
					if (typeof o[k] === 'string' && o[k].trim()) return o[k].trim();
				}
				if (typeof o?.id_code === 'string' && o.id_code.trim()) return o.id_code.trim();
				return '';
			};
			rows = rows.map(r => {
				let ops = r.operators;
				if (!ops || !ops.trim()) {
					const names = parseOps(r.operators_json).map(pickName).filter(Boolean);
					if (names.length) ops = names.join(', ');
					else if (r.operators_fallback) ops = r.operators_fallback;
					else if (r.operator_first_json_name) ops = r.operator_first_json_name;
				}
				return { ...r, operators: ops };
			});

			setSummaryRows(rows);
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

	const onChangeQuery = (value) => {
		setQ(value);
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
			} catch (e) { console.error(e); }
		}, 300);
		setTypingTimer(timer);
	};

	const onSearchKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			loadLogsSummary();
		}
	};

	const pickSuggestion = (s) => {
		setQ(`${s.job_code} ${s.job_name}`.trim());
		setJobSuggestOpen(false);
	};

	// Summary aggregates for card
	const summaryAgg = useMemo(() => {
		const count = summaryRows.length;
		const plannedTotal = summaryRows.reduce((acc, r) => acc + (Number(r.planned_total_minutes) || 0), 0);
		const actualTotal = summaryRows.reduce((acc, r) => acc + (Number(r.time_used_minutes) || 0), 0);
		return { count, plannedTotal, actualTotal };
	}, [summaryRows]);

	// ตรวจสอบสิทธิ์การเข้าถึง
	if (isLoadingRole) {
		return (
			<div className="min-h-screen bg-gray-50 flex justify-center items-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	// ถ้าไม่มีสิทธิ์เข้าถึง
	if (currentRole && !currentRole.menu_items.includes('Logs การผลิต')) {
		return (
			<div className="min-h-screen bg-gray-50 flex justify-center items-center">
				<div className="text-center">
					<div className="text-6xl mb-4">🚫</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
					<p className="text-gray-600">Role "{currentRole.display_name}" ไม่มีสิทธิ์เข้าถึงหน้า Logs การผลิต</p>
					<button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">กลับไปหน้าหลัก</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Helmet>
				<title>{getPageTitle('logsTest')}</title>
			</Helmet>
			<div className="card">
				<div className="card-header">
					<h1 className="text-2xl font-bold text-gray-900">ระบบแสดงประวัติการผลิตสินค้าครัวกลาง</h1>
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
							<div className="w-80">
								<label className="block text-sm font-medium text-gray-700">ค้นหา (รหัส/ชื่องาน/ผู้ปฏิบัติงาน)</label>
								<input type="text" className="input w-full" placeholder="เช่น 235001, น้ำแกงส้ม, อาร์ม" value={q} onChange={(e) => onChangeQuery(e.target.value)} onKeyDown={onSearchKeyDown} />
							</div>
							<button onClick={loadLogsSummary} disabled={loading} className="btn btn-primary">ค้นหา</button>
							<button onClick={async () => { 
								const today = new Date().toISOString().split('T')[0];
								setQ(''); 
								setFromDate(today); 
								setToDate(today); 
								// รอให้ state update แล้วค่อยเรียก API
								setTimeout(() => loadLogsSummary(), 0);
							}} className="btn btn-secondary">ล้างค่า</button>
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

					{/* ตารางสรุป */}
					{summaryRows.length > 0 && (
						<div className="bg-white p-4 rounded-lg border border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900 mb-1">{`ตารางแสดงประวัติการผลิต วันที่ ${formatDateTH(appliedFromDate)} - ${formatDateTH(appliedToDate)}`}</h3>
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
											<tr key={`${row.job_code}-${row.production_date}-${idx}`} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{idx + 1}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200">{row.job_code}</td>
												<td className="px-4 py-3 text-sm text-gray-900 border-x border-gray-200">{row.job_name}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{row.production_date ? new Date(row.production_date).toLocaleDateString('th-TH') : '-'}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{formatTimeRange(row.planned_start_time, row.planned_end_time)}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-blue-700 font-semibold border-x border-gray-200 text-center">{row.planned_total_minutes && row.planned_total_minutes > 0 ? formatHM(row.planned_total_minutes) : '-'}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{formatTimeRange(row.actual_start_time, row.actual_end_time)}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-700 border-x border-gray-200 text-center">{row.time_used_minutes && row.time_used_minutes > 0 ? formatHM(row.time_used_minutes) : '-'}</td>
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
