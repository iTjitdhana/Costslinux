import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { costAPI } from '../services/api';
import { getPageTitle } from '../config/pageTitles';

// Toggle toast notifications on/off
const TOAST_ENABLED = false;

// Date helpers
const getTodayISO = () => {
	const d = new Date();
	return d.toISOString().split('T')[0];
};
const getMonthStartISO = () => {
	const d = new Date();
	const start = new Date(d.getFullYear(), d.getMonth(), 1);
	return start.toISOString().split('T')[0];
};

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

// Helper: download file
const downloadBlob = (content, filename, mime) => {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

const LogsTest = () => {
	const location = useLocation();
	const [loading, setLoading] = useState(false);
	const [summaryRows, setSummaryRows] = useState([]);
	const [currentRole, setCurrentRole] = useState(null);
	const [isLoadingRole, setIsLoadingRole] = useState(true);
	const [fromDate, setFromDate] = useState(() => getMonthStartISO());
	const [toDate, setToDate] = useState(() => getTodayISO());
	// Applied dates (change only after pressing Search) for production tab
	const [appliedFromDate, setAppliedFromDate] = useState(() => getMonthStartISO());
	const [appliedToDate, setAppliedToDate] = useState(() => getTodayISO());
	const [q, setQ] = useState('');
	const [jobSuggest, setJobSuggest] = useState([]);
	const [jobSuggestOpen, setJobSuggestOpen] = useState(false);
	const [typingTimer, setTypingTimer] = useState(null);

	// Tabs
	const [activeTab, setActiveTab] = useState('production'); // 'production' | 'attendance'

	// Attendance tab filters and dataset
	const [attFromDate, setAttFromDate] = useState(() => getMonthStartISO());
	const [attToDate, setAttToDate] = useState(() => getTodayISO());
	const [attAppliedFromDate, setAttAppliedFromDate] = useState(() => getMonthStartISO());
	const [attAppliedToDate, setAttAppliedToDate] = useState(() => getTodayISO());
	const [attendanceSourceRows, setAttendanceSourceRows] = useState([]);

	// Pagination state
	const [pageSize, setPageSize] = useState(50);
	const [currentPage, setCurrentPage] = useState(1);
	
	// Attendance tab pagination
	const [attendancePageSize, setAttendancePageSize] = useState(50);
	const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);

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
				// Access denied: Role does not have Logs permission
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

	// โหลดสรุป logs ตามช่วงวันที่/คำค้นหา (production)
	const loadLogsSummary = async () => {
		try {
			setLoading(true);
			const params = { from: fromDate, to: toDate };
			if (q.trim()) params.q = q.trim();
			const res = await costAPI.getLogsSummary(params);
			let rows = res.data.data || [];
			// Logs API Response received
			
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
			setCurrentPage(1); // reset to first page on new load
			if (TOAST_ENABLED) toast.success(`โหลดสรุป Logs สำเร็จ (${res.data.count || 0} รายการ)`);
		} catch (error) {
			console.error(error);
			if (TOAST_ENABLED) toast.error('โหลดสรุป Logs ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// โหลดข้อมูลสำหรับ Attendance tab โดยไม่ยุ่งกับ production tab
	const loadAttendanceLogsSummary = async () => {
		try {
			setLoading(true);
			const params = { from: attFromDate, to: attToDate };
			const res = await costAPI.getLogsSummary(params);
			let rows = res.data.data || [];
			// legacy shape
			if (rows && rows.length > 0 && typeof rows[0] === 'object') {
				const firstRow = rows[0];
				const hasNumericKeys = Object.keys(firstRow).some(key => !isNaN(parseInt(key)));
				if (hasNumericKeys) {
					rows = Object.values(firstRow).filter(item => item && typeof item === 'object' && item.work_plan_id);
				}
			}
			// enrich operators like production flow
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

			setAttendanceSourceRows(rows || []);
			setAttAppliedFromDate(attFromDate);
			setAttAppliedToDate(attToDate);
			if (TOAST_ENABLED) toast.success('โหลดข้อมูลลงคนลงเวลา สำเร็จ');
		} catch (error) {
			console.error(error);
			if (TOAST_ENABLED) toast.error('โหลดข้อมูลลงคนลงเวลา ไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Set default dates for both tabs
		const today = new Date().toISOString().split('T')[0];
		const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
		
		// Set production tab dates (today -> today)
		setFromDate(today);
		setToDate(today);
		
		// Set attendance tab dates (first day of month -> today)
		setAttFromDate(firstDayOfMonth);
		setAttToDate(today);
		
		// preload both tabs with default month start -> today
		loadLogsSummary();
		loadAttendanceLogsSummary();
	}, []);

	const formatHM = (mins) => {
		const m = Number(mins || 0);
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	};

	// Helper: format minutes to "X ชั่วโมง Y นาที"
	const formatHMThai = (mins) => {
		const m = Number(mins || 0);
		const h = Math.floor(m / 60);
		const mm = Math.round(m % 60);
		return `${h} ชั่วโมง ${mm} นาที`;
	};


	// Calculate average time for searched jobs
	const averageTimes = useMemo(() => {
		if (!q || q.trim() === '' || summaryRows.length === 0) {
			return { avgPlanned: 0, avgActual: 0 };
		}
		
		const validJobs = summaryRows.filter(row => {
			const plannedMinutes = Number(row.planned_total_minutes) || 0;
			const actualMinutes = Number(row.time_used_minutes) || 0;
			return plannedMinutes > 0 || actualMinutes > 0;
		});
		
		if (validJobs.length === 0) {
			return { avgPlanned: 0, avgActual: 0 };
		}
		
		const totalPlanned = validJobs.reduce((sum, row) => sum + (Number(row.planned_total_minutes) || 0), 0);
		const totalActual = validJobs.reduce((sum, row) => sum + (Number(row.time_used_minutes) || 0), 0);
		
		return {
			avgPlanned: totalPlanned / validJobs.length,
			avgActual: totalActual / validJobs.length
		};
	}, [q, summaryRows]);

	const isSunday = (isoDate) => {
		if (!isoDate) return false;
		try {
			const d = new Date(isoDate);
			if (isNaN(d.getTime())) return false;
			return d.getDay() === 0; // Sunday
		} catch (_) {
			return false;
		}
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
	const isExcludedOperator = (rawName) => {
		if (!rawName || typeof rawName !== 'string') return false;
		const name = rawName.trim();
		if (!name) return false;
		// Normalize and check tokens for RD/R&D labels
		const upper = name.toUpperCase();
		const tokens = upper.replace(/[().]/g, ' ').split(/\s+/).filter(Boolean);
		if (tokens.includes('RD') || tokens.includes('R&D')) return true;
		// Common patterns like "RD-Team", "RD-1"
		if (/^RD\b/i.test(name)) return true;
		return false;
	};
	const summaryAgg = useMemo(() => {
		const count = summaryRows.length;
		// Planned time now multiplies per-row planned minutes by number of operators (excluding RD)
		const plannedTotal = summaryRows.reduce((acc, r) => {
			const base = Number(r.planned_total_minutes) || 0;
			let names = [];
			if (typeof r.operators === 'string' && r.operators.trim()) {
				names = r.operators.split(',').map(s => s.trim()).filter(s => s.length > 0);
			} else if (r.operators_json) {
				try {
					const parsed = Array.isArray(r.operators_json) ? r.operators_json : JSON.parse(r.operators_json);
					if (Array.isArray(parsed)) {
						names = parsed.map(p => (p && (p.name || p.full_name || p.fullname || p.display_name || p.th_name || p.thai_name || p.id_code)) || '');
					}
				} catch (_) {}
			} else if (typeof r.operators_fallback === 'string' && r.operators_fallback.trim()) {
				names = r.operators_fallback.split(',').map(s => s.trim());
			}
			const peopleForJob = names.filter(n => n && !isExcludedOperator(n)).length || 1;
			return acc + base * peopleForJob;
		}, 0);
		// Actual time also multiplies by number of operators (excluding RD)
		const actualTotal = summaryRows.reduce((acc, r) => {
			const base = Number(r.time_used_minutes) || 0;
			let names = [];
			if (typeof r.operators === 'string' && r.operators.trim()) {
				names = r.operators.split(',').map(s => s.trim()).filter(s => s.length > 0);
			} else if (r.operators_json) {
				try {
					const parsed = Array.isArray(r.operators_json) ? r.operators_json : JSON.parse(r.operators_json);
					if (Array.isArray(parsed)) {
						names = parsed.map(p => (p && (p.name || p.full_name || p.fullname || p.display_name || p.th_name || p.thai_name || p.id_code)) || '');
					}
				} catch (_) {}
			} else if (typeof r.operators_fallback === 'string' && r.operators_fallback.trim()) {
				names = r.operators_fallback.split(',').map(s => s.trim());
			}
			const peopleForJob = names.filter(n => n && !isExcludedOperator(n)).length || 1;
			return acc + base * peopleForJob;
		}, 0);

		// Count unique operators across all jobs (excluding RD)
		const uniqueOperators = new Set();
		for (const r of summaryRows) {
			let names = [];
			if (typeof r.operators === 'string' && r.operators.trim()) {
				names = r.operators.split(',').map(s => s.trim()).filter(s => s.length > 0);
			} else if (r.operators_json) {
				try {
					const parsed = Array.isArray(r.operators_json) ? r.operators_json : JSON.parse(r.operators_json);
					if (Array.isArray(parsed)) {
						names = parsed.map(p => (p && (p.name || p.full_name || p.fullname || p.display_name || p.th_name || p.thai_name || p.id_code)) || '');
					}
				} catch (_) {}
			} else if (typeof r.operators_fallback === 'string' && r.operators_fallback.trim()) {
				names = r.operators_fallback.split(',').map(s => s.trim());
			}
			names.filter(n => n && !isExcludedOperator(n)).forEach(name => uniqueOperators.add(name));
		}
		const peopleCount = uniqueOperators.size;

		return { count, plannedTotal, actualTotal, peopleCount };
	}, [summaryRows]);

	// Attendance daily aggregates from summaryRows
	const attendanceRows = useMemo(() => {
		const map = new Map();
		const minutesPerPersonPerDay = 8 * 60;
		const getOperatorNames = (row) => {
			let names = [];
			if (typeof row.operators === 'string' && row.operators.trim()) {
				names = row.operators.split(',').map(s => s.trim());
			} else if (row.operators_json) {
				try {
					const parsed = Array.isArray(row.operators_json) ? row.operators_json : JSON.parse(row.operators_json);
					if (Array.isArray(parsed)) {
						names = parsed.map(p => (p && (p.name || p.full_name || p.fullname || p.display_name || p.th_name || p.thai_name || p.id_code)) || '');
					}
				} catch (_) {}
			} else if (typeof row.operators_fallback === 'string' && row.operators_fallback.trim()) {
				names = row.operators_fallback.split(',').map(s => s.trim());
			}
			return names.filter(n => n && !isExcludedOperator(n)).map(n => n.trim());
		};
		for (const r of (attendanceSourceRows || [])) {
			const key = r.production_date ? new Date(r.production_date).toISOString().split('T')[0] : '';
			if (!key) continue;
			const plannedBase = Number(r.planned_total_minutes) || 0;
			const actualBase = Number(r.time_used_minutes) || 0;
			const opNames = getOperatorNames(r);
			const peopleForJob = opNames.length || 1;
			const agg = map.get(key) || { date: key, planned: 0, actual: 0, sumPeople: 0, peopleSet: new Set() };
			agg.planned += plannedBase * peopleForJob;
			agg.actual += actualBase * peopleForJob;
			agg.sumPeople += peopleForJob; // still keep for reference (not used in total)
			for (const n of opNames) agg.peopleSet.add(n);
			map.set(key, agg);
		}

		// Ensure all days in applied range exist, fill empty days
		try {
			const start = attAppliedFromDate ? new Date(attAppliedFromDate) : null;
			const end = attAppliedToDate ? new Date(attAppliedToDate) : null;
			if (start && end && !isNaN(start) && !isNaN(end)) {
				for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
					const key = d.toISOString().split('T')[0];
					if (!map.has(key)) {
						map.set(key, { date: key, planned: 0, actual: 0, sumPeople: 0, peopleSet: new Set() });
					}
				}
			}
		} catch (_) {}

		const rows = Array.from(map.values()).sort((a,b) => new Date(b.date) - new Date(a.date)).map((x) => {
			const uniquePeople = (x.peopleSet && typeof x.peopleSet.size === 'number') ? x.peopleSet.size : 0;
			const totalCapacity = uniquePeople * minutesPerPersonPerDay;
			const plannedPct = totalCapacity > 0 ? (x.planned / totalCapacity) * 100 : 0;
			const actualPct = totalCapacity > 0 ? (x.actual / totalCapacity) * 100 : 0;
			const remaining = Math.max(0, totalCapacity - x.planned);
			const remainingPct = totalCapacity > 0 ? (remaining / totalCapacity) * 100 : 0;
			return { date: x.date, planned: x.planned, actual: x.actual, total: totalCapacity, uniquePeople, plannedPct, actualPct, remaining, remainingPct };
		});
		return rows;
	}, [attendanceSourceRows, attAppliedFromDate, attAppliedToDate]);

	// Attendance summary totals for cards
	const attendanceSummary = useMemo(() => {
		const totals = attendanceRows.reduce((acc, r) => {
			acc.capacity += Number(r.total || 0);
			acc.planned += Number(r.planned || 0);
			acc.actual += Number(r.actual || 0);
			return acc;
		}, { capacity: 0, planned: 0, actual: 0 });
		
		// Calculate min-max operators (excluding 0)
		const operatorCounts = attendanceRows
			.map(r => Number(r.uniquePeople || 0))
			.filter(count => count > 0);
		const minOperators = operatorCounts.length > 0 ? Math.min(...operatorCounts) : 0;
		const maxOperators = operatorCounts.length > 0 ? Math.max(...operatorCounts) : 0;
		
		const capacity = totals.capacity;
		const remaining = Math.max(0, capacity - totals.planned);
		const plannedPct = capacity > 0 ? (totals.planned / capacity) * 100 : 0;
		const actualPct = capacity > 0 ? (totals.actual / capacity) * 100 : 0;
		const remainingPct = capacity > 0 ? (remaining / capacity) * 100 : 0;
		return { 
			capacity, 
			planned: totals.planned, 
			actual: totals.actual, 
			remaining, 
			plannedPct, 
			actualPct, 
			remainingPct,
			minOperators,
			maxOperators
		};
	}, [attendanceRows]);

	// Derived pagination values
	const totalRows = summaryRows.length;
	const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
	const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);
	const pageStartIndex = (currentPageSafe - 1) * pageSize;
	const pageRows = useMemo(() => summaryRows.slice(pageStartIndex, pageStartIndex + pageSize), [summaryRows, pageStartIndex, pageSize]);

	// Attendance pagination values
	const attendanceTotalRows = attendanceRows.length;
	const attendanceTotalPages = Math.max(1, Math.ceil(attendanceTotalRows / attendancePageSize));
	const attendanceCurrentPageSafe = Math.min(Math.max(1, attendanceCurrentPage), attendanceTotalPages);
	const attendancePageStartIndex = (attendanceCurrentPageSafe - 1) * attendancePageSize;
	const attendancePageRows = useMemo(() => attendanceRows.slice(attendancePageStartIndex, attendancePageStartIndex + attendancePageSize), [attendanceRows, attendancePageStartIndex, attendancePageSize]);

	// Export: build simple HTML table for Excel (.xls) from all rows (not only current page)
	const buildExcelHtml = () => {
		const title = `ตารางแสดงประวัติการผลิต วันที่ ${new Date(appliedFromDate).toLocaleDateString('en-GB')} - ${new Date(appliedToDate).toLocaleDateString('en-GB')}`;
		const head = ['ลำดับ','รหัส','ชื่องาน/ชื่อสินค้า','วันที่ผลิต','เวลาตามแผนผลิตเริ่มต้น-สิ้นสุด (ชั่วโมง:นาที)','เวลารวมตามแผนผลิต (ชั่วโมง:นาที)','เวลาผลิตจริงเริ่มต้น-สิ้นสุด (ชั่วโมง:นาที)','เวลารวมผลิตจริง (ชั่วโมง:นาที)','ผู้ปฏิบัติงาน','Batch การผลิต','Yield %'];
		const rowsHtml = summaryRows.map((row, idx) => {
			const cells = [
				idx + 1,
				row.job_code || '',
				row.job_name || '',
				row.production_date ? new Date(row.production_date).toLocaleDateString('en-GB') : '-',
				formatTimeRange(row.planned_start_time, row.planned_end_time),
				row.planned_total_minutes && row.planned_total_minutes > 0 ? formatHM(row.planned_total_minutes) : '-',
				formatTimeRange(row.actual_start_time, row.actual_end_time),
				row.time_used_minutes && row.time_used_minutes > 0 ? formatHM(row.time_used_minutes) : '-',
				row.operators || '-',
				'-',
				'-'
			];
			return '<tr>' + cells.map((c) => `<td style=\"mso-number-format:\\@; border:1px solid #ccc; padding:4px;\">${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('') + '</tr>';
		}).join('');
		const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>${title}</title></head><body><h3>${title}</h3><table border=\"1\" cellspacing=\"0\" cellpadding=\"4\"><thead><tr>${head.map(h=>`<th style=\"background:#eee; border:1px solid #ccc; padding:4px;\">${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
		return html;
	};

	const onExportExcel = () => {
		try {
			const html = buildExcelHtml();
			const filename = `logs_${appliedFromDate}_to_${appliedToDate}.xls`;
			downloadBlob(html, filename, 'application/vnd.ms-excel;charset=utf-8;');
			if (TOAST_ENABLED) toast.success('ส่งออก Excel สำเร็จ');
		} catch (e) {
			console.error(e);
			if (TOAST_ENABLED) toast.error('ส่งออก Excel ไม่สำเร็จ');
		}
	};

	// Export: build HTML table for Attendance data
	const buildAttendanceExcelHtml = () => {
		const title = `ตารางแสดงประวัติ Capacity การผลิต วันที่ ${new Date(attAppliedFromDate).toLocaleDateString('en-GB')} - ${new Date(attAppliedToDate).toLocaleDateString('en-GB')}`;
		const head = ['ลำดับ','วันที่','เวลารวมทั้งหมด (ชั่วโมง:นาที)','จำนวนผู้ปฏิบัติงาน','เวลารวมตามแผนผลิต (ชั่วโมง:นาที)','เวลารวมผลิตจริง (ชั่วโมง:นาที)','เวลาที่ใช้ลงแผน %','เวลาที่ใช้ผลิตจริง %','เวลาเหลือ (ชั่วโมง:นาที)','เวลาเหลือ %'];
		const rowsHtml = attendanceRows.map((row, idx) => {
			const cells = [
				idx + 1,
				new Date(row.date).toLocaleDateString('en-GB'),
				formatHM(row.total),
				row.uniquePeople,
				row.planned > 0 ? formatHM(row.planned) : '-',
				row.actual > 0 ? formatHM(row.actual) : '-',
				row.total > 0 ? `${row.plannedPct.toFixed(2)}%` : '-',
				row.total > 0 ? `${row.actualPct.toFixed(2)}%` : '-',
				formatHM(row.remaining),
				row.total > 0 ? `${row.remainingPct.toFixed(2)}%` : '-'
			];
			return '<tr>' + cells.map((c) => `<td style=\"mso-number-format:\\@; border:1px solid #ccc; padding:4px;\">${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('') + '</tr>';
		}).join('');
		const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>${title}</title></head><body><h3>${title}</h3><table border=\"1\" cellspacing=\"0\" cellpadding=\"4\"><thead><tr>${head.map(h=>`<th style=\"background:#eee; border:1px solid #ccc; padding:4px;\">${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
		return html;
	};

	const onExportAttendanceExcel = () => {
		try {
			const html = buildAttendanceExcelHtml();
			const filename = `attendance_${attAppliedFromDate}_to_${attAppliedToDate}.xls`;
			downloadBlob(html, filename, 'application/vnd.ms-excel;charset=utf-8;');
			if (TOAST_ENABLED) toast.success('ส่งออก Excel สำเร็จ');
		} catch (e) {
			console.error(e);
			if (TOAST_ENABLED) toast.error('ส่งออก Excel ไม่สำเร็จ');
		}
	};

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
					<h1 className="text-2xl font-bold text-gray-900">ระบบแสดงข้อมูลการผลิตสินค้าครัวกลาง</h1>
					<p className="text-gray-600">ประวัติข้อมูลการผลิตสินค้าย้อนหลัง–ปัจจุบัน</p>
				</div>
				<div className="card-body space-y-6">
					{/* Tabs */}
					<div className="relative">
						<nav className="flex">
							<button 
								onClick={() => setActiveTab('production')} 
								className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 ${
									activeTab === 'production' 
										? 'bg-white text-blue-700 border-t-2 border-l-2 border-r-2 border-gray-200 rounded-t-lg' 
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-t-2 border-l-2 border-r-2 border-transparent rounded-t-lg'
								}`}
								style={{
									clipPath: activeTab === 'production' 
										? 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
										: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
								}}
							>
								การผลิตย้อนหลัง
							</button>
							<button 
								onClick={() => setActiveTab('attendance')} 
								className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 ${
									activeTab === 'attendance' 
										? 'bg-white text-blue-700 border-t-2 border-l-2 border-r-2 border-gray-200 rounded-t-lg' 
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-t-2 border-l-2 border-r-2 border-transparent rounded-t-lg'
								}`}
								style={{
									clipPath: activeTab === 'attendance' 
										? 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
										: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
								}}
							>
								Capacity การผลิตย้อนหลัง
							</button>
						</nav>
						{/* Tab content area with seamless connection */}
						<div className="bg-white border-t-0 border-l-2 border-r-2 border-b-2 border-gray-200 rounded-b-lg -mt-px">
							<div className="p-6">

								{/* Production Logs Tab */}
								{activeTab === 'production' && (
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-2">ระบบแสดงข้อมูลการผลิตสินค้าย้อนหลัง</h3>
							{/* ตัวกรองสรุป */}
							<div className="bg-gray-50 p-4 rounded-lg">
								<div className="flex flex-wrap items-end gap-4 relative w-full">
									<div>
										<label className="block text-sm font-medium text-gray-700">จากวันที่</label>
										<DatePicker
											selected={fromDate ? new Date(fromDate) : null}
											onChange={(date) => setFromDate(date ? date.toISOString().split('T')[0] : '')}
											dateFormat="dd/MM/yyyy"
											className="input w-full"
											placeholderText="เลือกวันที่"
											isClearable
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">ถึงวันที่</label>
										<DatePicker
											selected={toDate ? new Date(toDate) : null}
											onChange={(date) => setToDate(date ? date.toISOString().split('T')[0] : '')}
											dateFormat="dd/MM/yyyy"
											className="input w-full"
											placeholderText="เลือกวันที่"
											isClearable
										/>
									</div>
									<div className="w-80">
										<label className="block text-sm font-medium text-gray-700">ค้นหา (รหัส/ชื่องาน/ผู้ปฏิบัติงาน)</label>
										<input type="text" className="input w-full" placeholder="เช่น 235001, น้ำแกงส้ม, เอ" value={q} onChange={(e) => onChangeQuery(e.target.value)} onKeyDown={onSearchKeyDown} />
									</div>
									<button onClick={loadLogsSummary} disabled={loading} className="btn btn-primary">ค้นหา</button>
									<button onClick={async () => { 
										const today = new Date().toISOString().split('T')[0];
										setQ(''); 
										setFromDate(today); 
										setToDate(today); 
										setCurrentPage(1);
										// รอให้ state update แล้วค่อยเรียก API
										setTimeout(() => loadLogsSummary(), 0);
									}} className="btn btn-secondary">ล้างค่า</button>
									{summaryRows.length > 0 && (
										<div className="ml-auto flex gap-2">
											<button onClick={onExportExcel} className="btn btn-success">ส่งออก Excel</button>
										</div>
									)}
								</div>
							</div>

							{/* Summary Card */}
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm text-gray-500">จำนวนงาน</div>
									<div className="text-2xl font-bold text-gray-900 mt-1">{summaryAgg.count}</div>
								</div>
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm text-gray-500">จำนวนผู้ปฏิบัติงาน (ไม่รวม RD)</div>
									<div className="text-2xl font-bold text-purple-700 mt-1">{summaryAgg.peopleCount}</div>
								</div>
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm text-gray-500">เวลารวมตามแผน</div>
									<div className="text-2xl font-bold text-blue-700 mt-1">{formatHMThai(summaryAgg.plannedTotal)}</div>
								</div>
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm text-gray-500">เวลารวมผลิตจริง</div>
									<div className="text-2xl font-bold text-green-700 mt-1">{formatHMThai(summaryAgg.actualTotal)}</div>
								</div>
							</div>

							{/* Average Time Cards - Only show when searching */}
							{q && q.trim() !== '' && summaryRows.length > 0 && (
								<div className="mt-4">
									<div className="text-sm text-gray-600 mb-3">เวลาเฉลี่ยของงานที่ค้นหา</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
											<div className="text-sm text-blue-600">เวลาเฉลี่ยตามแผน</div>
											<div className="text-2xl font-bold text-blue-700 mt-1">{formatHMThai(averageTimes.avgPlanned)}</div>
										</div>
										<div className="bg-green-50 border border-green-200 rounded-lg p-4">
											<div className="text-sm text-green-600">เวลาเฉลี่ยผลิตจริง</div>
											<div className="text-2xl font-bold text-green-700 mt-1">{formatHMThai(averageTimes.avgActual)}</div>
										</div>
									</div>
								</div>
							)}

							{/* ตารางสรุป */}
							{summaryRows.length > 0 && (
								<div className="bg-white p-4 rounded-lg border border-gray-200">
									<h3 className="text-lg font-semibold text-gray-900 mb-1">{`ตารางแสดงข้อมูลการผลิตสินค้า วันที่ ${new Date(appliedFromDate).toLocaleDateString('en-GB')} - ${new Date(appliedToDate).toLocaleDateString('en-GB')}`}</h3>
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
												{pageRows.map((row, idx) => (
													<tr key={`${row.job_code}-${row.production_date}-${pageStartIndex + idx}`} className="hover:bg-gray-50">
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{pageStartIndex + idx + 1}</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200">{row.job_code}</td>
														<td className="px-4 py-3 text-sm text-gray-900 border-x border-gray-200">{row.job_name}</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{row.production_date ? new Date(row.production_date).toLocaleDateString('en-GB') : '-'}</td>
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

									{/* Pagination controls with page size selector */}
									<div className="flex items-center justify-between mt-4 gap-3 md:flex-nowrap">
										<div className="text-sm text-gray-600">แสดง {Math.min(totalRows, pageStartIndex + 1)} - {Math.min(totalRows, pageStartIndex + pageRows.length)} จาก {totalRows} รายการ</div>
										<div className="flex items-center gap-3 whitespace-nowrap">
											<div className="flex items-center gap-2 whitespace-nowrap">
												<label className="text-sm text-gray-700">ต่อหน้า</label>
												<select className="input w-auto" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
													<option value={25}>25</option>
													<option value={50}>50</option>
													<option value={100}>100</option>
												</select>
											</div>
											<button
												onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
												disabled={currentPageSafe === 1}
												className="btn btn-secondary whitespace-nowrap"
											>
												ก่อนหน้า
											</button>
											<div className="text-sm text-gray-700">หน้า {currentPageSafe} / {totalPages}</div>
											<button
												onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
												disabled={currentPageSafe === totalPages}
												className="btn btn-primary whitespace-nowrap"
											>
												ถัดไป
											</button>
										</div>
									</div>
									
									{/* Disclaimer */}
									<div className="mt-4">
										<p className="text-sm text-gray-600">
											<strong className="text-red-600">หมายเหตุ:</strong> เวลาผลิตจริง คือเวลาที่เกิดขึ้นจากการกดบันทึกข้อมูลของผู้ปฏิบัติงาน อาจมีความคลาดเคลื่อนได้ กรุณาตรวจสอบข้อมูลอีกครั้งก่อนนำไปใช้งาน
										</p>
									</div>
								</div>
							)}
						</div>
					)}

								{/* Attendance Tab (table) */}
								{activeTab === 'attendance' && (
									<div>
 							<h3 className="text-lg font-semibold text-gray-900 mb-2">ระบบแสดงข้อมูล Capacity การผลิต</h3>
 							{/* attendance filters */}
							<div className="bg-gray-50 p-4 rounded-lg mb-4">
								<div className="flex flex-wrap items-end gap-4 relative w-full">
									<div>
										<label className="block text-sm font-medium text-gray-700">จากวันที่</label>
										<DatePicker
											selected={attFromDate ? new Date(attFromDate) : null}
											onChange={(date) => setAttFromDate(date ? date.toISOString().split('T')[0] : '')}
											dateFormat="dd/MM/yyyy"
											className="input w-full"
											placeholderText="เลือกวันที่"
											isClearable
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">ถึงวันที่</label>
										<DatePicker
											selected={attToDate ? new Date(attToDate) : null}
											onChange={(date) => setAttToDate(date ? date.toISOString().split('T')[0] : '')}
											dateFormat="dd/MM/yyyy"
											className="input w-full"
											placeholderText="เลือกวันที่"
											isClearable
										/>
									</div>
									<button onClick={async () => { await loadAttendanceLogsSummary(); }} disabled={loading} className="btn btn-primary">ค้นหา</button>
									<button onClick={async () => { const today = new Date().toISOString().split('T')[0]; setAttFromDate(today); setAttToDate(today); setAttendanceSourceRows([]); setAttAppliedFromDate(today); setAttAppliedToDate(today); }} className="btn btn-secondary">ล้างค่า</button>
									{attendanceRows.length > 0 && (
										<div className="ml-auto flex gap-2">
											<button onClick={onExportAttendanceExcel} className="btn btn-success">ส่งออก Excel</button>
										</div>
									)}
								</div>
							</div>
 							{/* Attendance summary cards */}
							<div className="mb-2 text-sm text-gray-600">สรุปช่วงวันที่ {new Date(attAppliedFromDate).toLocaleDateString('en-GB')} - {new Date(attAppliedToDate).toLocaleDateString('en-GB')}</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-4">
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm font-bold text-gray-900">Capacity เวลารวม</div>
									<div className="text-sm text-gray-700">คิดจากจำนวนผู้ปฏิบัติงานเฉลี่ย {attendanceSummary.minOperators} - {attendanceSummary.maxOperators} คน ต่อวัน</div>
									<div className="text-3xl font-bold text-gray-900 mt-1">{formatHMThai(attendanceSummary.capacity)}</div>
								</div>
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm font-bold text-gray-900">เวลารวมที่ใช้ลงแผนผลิต</div>
									<div className="text-3xl font-bold text-blue-700 mt-1">{formatHMThai(attendanceSummary.planned)}</div>
									<div className="text-2xl font-bold text-blue-700">{attendanceSummary.plannedPct.toFixed(2)}%</div>
								</div>
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm font-bold text-gray-900">เวลารวมผลิตจริง</div>
									<div className="text-3xl font-bold text-green-700 mt-1">{formatHMThai(attendanceSummary.actual)}</div>
									<div className="text-2xl font-bold text-green-700">{attendanceSummary.actualPct.toFixed(2)}%</div>
								</div>
								<div className="bg-white border border-gray-200 rounded-lg p-4">
									<div className="text-sm font-bold text-gray-900">เวลาเหลือ</div>
									<div className="text-3xl font-bold text-gray-900 mt-1">{formatHMThai(attendanceSummary.remaining)}</div>
									<div className="text-2xl font-bold text-gray-900">{attendanceSummary.remainingPct.toFixed(2)}%</div>
								</div>
							</div>
 							<div className="overflow-x-auto">
 								<table className="min-w-full divide-y divide-gray-200 border border-gray-200 border-t-2">
 									<thead className="bg-gray-100">
 										<tr className="border-t-2 border-gray-200">
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">ลำดับ</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">วันที่</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลารวมทั้งหมด (ชั่วโมง:นาที)</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">จำนวนผู้ปฏิบัติงาน</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลารวมตามแผนผลิต (ชั่วโมง:นาที)</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลารวมผลิตจริง (ชั่วโมง:นาที)</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลาที่ใช้ลงแผน %</th>
 											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลาที่ใช้ผลิตจริง %</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลาเหลือ (ชั่วโมง:นาที)</th>
											<th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-x border-gray-200">เวลาเหลือ %</th>
 										</tr>
 									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{attendancePageRows.map((row, idx) => (
											<tr key={`${row.date}-${idx}`} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{attendancePageStartIndex + idx + 1}</td>
 												<td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center ${isSunday(row.date) ? 'bg-red-50' : ''}`}>
													{row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-'}
												</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border-x border-gray-200 text-center">{formatHM(row.total)}</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{row.uniquePeople}</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm text-blue-700 font-semibold border-x border-gray-200 text-center">{row.planned > 0 ? formatHM(row.planned) : '-'}</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 font-semibold border-x border-gray-200 text-center">{row.actual > 0 ? formatHM(row.actual) : '-'}</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{row.total > 0 ? `${row.plannedPct.toFixed(2)}%` : '-'}</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{row.total > 0 ? `${row.actualPct.toFixed(2)}%` : '-'}</td>
 												<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border-x border-gray-200 text-center">{formatHM(row.remaining)}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-x border-gray-200 text-center">{row.total > 0 ? `${row.remainingPct.toFixed(2)}%` : '-'}</td>
 											</tr>
 										))}
 									</tbody>
								</table>
							</div>

							{/* Attendance Pagination controls */}
							<div className="flex items-center justify-between mt-4 gap-3 md:flex-nowrap">
								<div className="text-sm text-gray-600">แสดง {Math.min(attendanceTotalRows, attendancePageStartIndex + 1)} - {Math.min(attendanceTotalRows, attendancePageStartIndex + attendancePageRows.length)} จาก {attendanceTotalRows} รายการ</div>
								<div className="flex items-center gap-3 whitespace-nowrap">
									<div className="flex items-center gap-2 whitespace-nowrap">
										<label className="text-sm text-gray-700">ต่อหน้า</label>
										<select className="input w-auto" value={attendancePageSize} onChange={(e) => { setAttendancePageSize(Number(e.target.value)); setAttendanceCurrentPage(1); }}>
											<option value={25}>25</option>
											<option value={50}>50</option>
											<option value={100}>100</option>
										</select>
									</div>
									<button
										onClick={() => setAttendanceCurrentPage((p) => Math.max(1, p - 1))}
										disabled={attendanceCurrentPageSafe === 1}
										className="btn btn-secondary whitespace-nowrap"
									>
										ก่อนหน้า
									</button>
									<div className="text-sm text-gray-700">หน้า {attendanceCurrentPageSafe} / {attendanceTotalPages}</div>
									<button
										onClick={() => setAttendanceCurrentPage((p) => Math.min(attendanceTotalPages, p + 1))}
										disabled={attendanceCurrentPageSafe === attendanceTotalPages}
										className="btn btn-primary whitespace-nowrap"
									>
										ถัดไป
									</button>
								</div>
							</div>
							
							{/* Disclaimer */}
							<div className="mt-4">
								<p className="text-sm text-gray-600">
									<strong className="text-red-600">หมายเหตุ:</strong> เวลาผลิตจริง คือเวลาที่เกิดขึ้นจากการกดบันทึกข้อมูลของผู้ปฏิบัติงาน เเละตัวเลขเปอร์เซ็นต์อาจจะมีความคลาดเคลื่อนได้ กรุณาตรวจสอบข้อมูลอีกครั้งก่อนนำไปใช้งาน
								</p>
							</div>
								</div>
							)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LogsTest;
