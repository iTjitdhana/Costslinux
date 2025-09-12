import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { costAPI } from '../services/api';
import { getPageTitle } from '../config/pageTitles';
import AntDateRangePicker from '../components/AntDateRangePicker';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';
import CustomDateRangePicker from '../components/CustomDateRangePicker';

// Toggle toast notifications on/off
const TOAST_ENABLED = false;

// Date helpers
const formatYYYYMMDD = (date) => {
	if (!(date instanceof Date) || isNaN(date.getTime())) return '';
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
};
// Parse ISO (YYYY-MM-DD) to local Date without timezone shift
const parseYYYYMMDDLocal = (iso) => {
    if (!iso || typeof iso !== 'string') return null;
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return isNaN(dt.getTime()) ? null : dt;
};
// Format for UI display DD/MM/YYYY (locale independent)
const formatDisplayDDMMYYYY = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
};
const getTodayISO = () => {
	const d = new Date();
	return formatYYYYMMDD(d);
};
const getMonthStartISO = () => {
	const d = new Date();
	const start = new Date(d.getFullYear(), d.getMonth(), 1);
	return formatYYYYMMDD(start);
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
	// Strict search mode controls
	const [strictMode, setStrictMode] = useState(false); // "ค้นหาแบบเจาะจง"
	const [strictSelected, setStrictSelected] = useState(false); // confirmed exact target chosen
	const [strictTarget, setStrictTarget] = useState({ code: '', name: '' });
	const [jobSuggest, setJobSuggest] = useState([]);
	const [jobSuggestOpen, setJobSuggestOpen] = useState(false);
	const [typingTimer, setTypingTimer] = useState(null);
	// Local suggestion index (loaded once per session)
	const [jobIndex, setJobIndex] = useState([]); // [{job_code, job_name}]
	const [jobIndexLoaded, setJobIndexLoaded] = useState(false);
	const [jobIndexLoading, setJobIndexLoading] = useState(false);
	// Show average-time cards only after user-initiated search when strict mode is on
	const [strictSearchTriggered, setStrictSearchTriggered] = useState(false);

	// Transient hint after clearing filters
	const [clearHint, setClearHint] = useState(null);
	const [clearHintTimer, setClearHintTimer] = useState(null);
	const showClearHint = (text) => {
		if (clearHintTimer) clearTimeout(clearHintTimer);
		setClearHint(text);
		const t = setTimeout(() => setClearHint(null), 3000);
		setClearHintTimer(t);
	};

	const loadJobIndexOnce = async () => {
		if (jobIndexLoaded || jobIndexLoading) return;
		try {
			setJobIndexLoading(true);
			const today = new Date();
			const todayStr = formatYYYYMMDD(today);
			// Load a very broad range once
			const res = await costAPI.getLogsSummary({ from: '2000-01-01', to: todayStr });
			let rows = Array.isArray(res?.data?.data) ? res.data.data : [];
			// normalize unique pairs
			const seen = new Set();
			const index = [];
			for (const r of rows) {
				const jc = (r?.job_code || r?.code || r?.id || '').toString();
				const jn = (r?.job_name || r?.work_name || r?.name || '').toString();
				if (!jn && !jc) continue;
				const key = `${jc}|${jn}`;
				if (seen.has(key)) continue;
				seen.add(key);
				index.push({ job_code: jc, job_name: jn });
			}
			setJobIndex(index);
			setJobIndexLoaded(true);
		} catch (e) {
			console.warn('loadJobIndexOnce error', e);
		} finally {
			setJobIndexLoading(false);
		}
	};

	const filterFromIndex = (query) => {
		const q = (query || '').trim().toLowerCase();
		if (!q) return [];
		const tokens = q.split(/\s+/).filter(Boolean);
		const norm = (s) => (s || '').toString().toLowerCase();
		const results = [];
		for (const it of jobIndex) {
			const name = norm(it.job_name);
			const code = norm(it.job_code);
			let ok = true;
			for (const t of tokens) {
				if (!(name.includes(t) || code.includes(t))) { ok = false; break; }
			}
			if (ok) results.push(it);
			if (results.length >= 50) break;
		}
		return results;
	};

	// Tabs
	const [activeTab, setActiveTab] = useState('production'); // 'production' | 'attendance'

	// Attendance tab filters and dataset
	const [attFromDate, setAttFromDate] = useState(() => getMonthStartISO());
	const [attToDate, setAttToDate] = useState(() => getTodayISO());
	const [attAppliedFromDate, setAttAppliedFromDate] = useState(() => getMonthStartISO());
	const [attAppliedToDate, setAttAppliedToDate] = useState(() => getTodayISO());
	const [attendanceSourceRows, setAttendanceSourceRows] = useState([]);

	// Date range picker states
	const [dateRange, setDateRange] = useState({
		startDate: null,
		endDate: null
	});
	const [dateRangeError, setDateRangeError] = useState(null);
	const [attDateRange, setAttDateRange] = useState({
		startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
		endDate: new Date()
	});

	// Pagination state
	const [pageSize, setPageSize] = useState(50);
	const [currentPage, setCurrentPage] = useState(1);
	
	// Attendance tab pagination
	const [attendancePageSize, setAttendancePageSize] = useState(50);
	const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);

	// Handle date range changes for production tab
	const handleDateRangeChange = (startDate, endDate) => {
		console.log('📅 Date range changed:', { startDate, endDate });
		
		// More comprehensive date validation
		if (!startDate || !endDate || 
			typeof startDate !== 'object' || !(startDate instanceof Date) || isNaN(startDate.getTime()) ||
			typeof endDate !== 'object' || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
			setDateRangeError('กรุณาเลือกวันที่ให้ครบถ้วน');
			return;
		}
		
		// Validate date range - reset time to compare only dates
		const startDateOnly = new Date(startDate);
		const endDateOnly = new Date(endDate);
		startDateOnly.setHours(0, 0, 0, 0);
		endDateOnly.setHours(0, 0, 0, 0);
		
		if (startDateOnly > endDateOnly) {
			setDateRangeError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
			return;
		}
		
		setDateRangeError(null);
		setDateRange({ startDate, endDate });
		setFromDate(formatYYYYMMDD(startDate));
		setToDate(formatYYYYMMDD(endDate));
		
		console.log('✅ Date range updated successfully:', {
			startDate: formatYYYYMMDD(startDate),
			endDate: formatYYYYMMDD(endDate)
		});
	};

	// Handle individual date changes for production tab
	const handleStartDateChange = (date) => {
		if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
			// Always update startDate, preserve endDate if it exists
			if (dateRange.endDate) {
				handleDateRangeChange(date, dateRange.endDate);
			} else {
				// If no endDate, set both to the same date
				handleDateRangeChange(date, date);
			}
		}
	};

	const handleEndDateChange = (date) => {
		if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
			// Always update endDate, preserve startDate if it exists
			if (dateRange.startDate) {
				handleDateRangeChange(dateRange.startDate, date);
			} else {
				// If no startDate, set both to the same date
				handleDateRangeChange(date, date);
			}
		}
	};

	// Handle date range changes for attendance tab
	const handleAttDateRangeChange = (startDate, endDate) => {
		// More comprehensive date validation
		if (!startDate || !endDate || 
			typeof startDate !== 'object' || !(startDate instanceof Date) || isNaN(startDate.getTime()) ||
			typeof endDate !== 'object' || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
			return;
		}
		
		setAttDateRange({ startDate, endDate });
		setAttFromDate(formatYYYYMMDD(startDate));
		setAttToDate(formatYYYYMMDD(endDate));
	};

	// Handle individual date changes for attendance tab
	const handleAttStartDateChange = (date) => {
		if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
			// Only update if we have both dates, or if endDate is null
			if (attDateRange.endDate) {
				handleAttDateRangeChange(date, attDateRange.endDate);
			} else {
				// If no endDate, set both to the same date
				handleAttDateRangeChange(date, date);
			}
		}
	};

	const handleAttEndDateChange = (date) => {
		if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
			// Only update if we have both dates, or if startDate is null
			if (attDateRange.startDate) {
				handleAttDateRangeChange(attDateRange.startDate, date);
			} else {
				// If no startDate, set both to the same date
				handleAttDateRangeChange(date, date);
			}
		}
	};

	// Load data with date range for production tab


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

	// Shared helpers for operator parsing/coalescing
	const parseOperatorsArray = (raw) => {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		if (typeof raw === 'object') return Object.values(raw);
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch (_) {
			return [];
		}
	};

	const extractOperatorName = (o) => {
		if (!o || typeof o !== 'object') return '';
		for (const k of ['name','Name','full_name','fullname','display_name','th_name','thai_name']) {
			if (typeof o[k] === 'string' && o[k].trim()) return o[k].trim();
		}
		if (typeof o?.id_code === 'string' && o.id_code.trim()) return o.id_code.trim();
		return '';
	};

	const coalesceOperators = (row) => {
		let ops = row.operators;
		if (!ops || !ops.trim()) {
			const names = parseOperatorsArray(row.operators_json).map(extractOperatorName).filter(Boolean);
			if (names.length) ops = names.join(', ');
			else if (row.operators_fallback) ops = row.operators_fallback;
			else if (row.operator_first_json_name) ops = row.operator_first_json_name;
		}
		return ops;
	};

	// โหลดสรุป logs ตามช่วงวันที่/คำค้นหา (production)
	const loadLogsSummary = async (fromOverride, toOverride, qOverride) => {
		try {
			setLoading(true);
			
			// ใช้วันที่จาก dateRange ถ้ามี ถ้าไม่มีใช้ fromDate/toDate
			let from = fromOverride;
			let to = toOverride;
			
			// ถ้าไม่มี override และมี dateRange ให้ใช้ dateRange
			if (!fromOverride && !toOverride && dateRange.startDate && dateRange.endDate) {
				// ใช้ getFullYear, getMonth, getDate เพื่อหลีกเลี่ยงปัญหา timezone
				const startYear = dateRange.startDate.getFullYear();
				const startMonth = String(dateRange.startDate.getMonth() + 1).padStart(2, '0');
				const startDay = String(dateRange.startDate.getDate()).padStart(2, '0');
				from = `${startYear}-${startMonth}-${startDay}`;
				
				const endYear = dateRange.endDate.getFullYear();
				const endMonth = String(dateRange.endDate.getMonth() + 1).padStart(2, '0');
				const endDay = String(dateRange.endDate.getDate()).padStart(2, '0');
				to = `${endYear}-${endMonth}-${endDay}`;
			} else if (!fromOverride && !toOverride) {
				from = fromDate;
				to = toDate;
			}
			
			const qVal = qOverride ?? q;
			const params = { from, to };
			if (qVal && qVal.trim()) params.q = qVal.trim();
			
			// Debug log
			console.log('🔍 Search parameters:', {
				from,
				to,
				query: qVal,
				dateRange: dateRange,
				dateRangeRaw: {
					startDate: dateRange.startDate ? dateRange.startDate.toISOString() : null,
					endDate: dateRange.endDate ? dateRange.endDate.toISOString() : null
				},
				fromOverride,
				toOverride,
				params
			});
			
			const res = await costAPI.getLogsSummary(params);
			let rows = res.data.data || [];
			
			// Debug: ตรวจสอบข้อมูลที่ได้จาก API
			console.log('📊 API Response:', {
				totalRows: rows.length,
				params: params,
				sampleRows: rows.slice(0, 3).map(row => ({
					job_code: row.job_code,
					production_date: row.production_date,
					work_name: row.work_name
				}))
			});
			
			// Logs API Response received
			
			// transform shape (legacy handling)
			if (rows && rows.length > 0 && typeof rows[0] === 'object') {
				const firstRow = rows[0];
				const hasNumericKeys = Object.keys(firstRow).some(key => !isNaN(parseInt(key)));
				if (hasNumericKeys) {
					rows = Object.values(firstRow).filter(item => item && typeof item === 'object' && item.work_plan_id);
				}
			}
			const isSameDay = from === to;
			const usedSearch = Boolean(qVal && qVal.trim());
			if (!isSameDay || usedSearch) {
				const toTs = (d) => {
					if (!d) return 0;
					const t = new Date(d).getTime();
					return Number.isNaN(t) ? 0 : t;
				};
				// เรียงจากวันล่าสุดลงมา (Desc)
				rows = [...rows].sort((a, b) => {
					const pa = toTs(a.production_date);
					const pb = toTs(b.production_date);
					if (pa !== pb) return pb - pa; // ล่าสุดก่อน
					const sa = toTs(a.planned_start_time);
					const sb = toTs(b.planned_start_time);
					if (!sa && sb) return 1;
					if (sa && !sb) return -1;
					return sb - sa; // เวลาใหม่ก่อน
				});
			}

			// Normalize operators for display
			rows = rows.map(r => ({ ...r, operators: coalesceOperators(r) }));

			// If strict mode is confirmed, filter to exact matches only
			if (strictMode) {
				const normalize = (s) => (typeof s === 'string' ? s.replace(/[\s\-_.]/g, '').toLowerCase() : '');
				const extractCode = (val) => {
					if (val === null || val === undefined) return '';
					const m = String(val).match(/\b\d{3,}\b/);
					return m ? m[0] : '';
				};
				const inputCode = extractCode(qVal || '');
				const targetNameRaw = ((strictTarget.name || '').trim() || String(qVal || '').trim());
				const targetName = normalize(targetNameRaw);
				const targetCode = String((strictTarget.code || '').trim() || inputCode);
				if (!targetCode && !targetName) {
					// nothing to filter yet
				} else {
					const before = rows.length;
					rows = rows.filter((r) => {
						const rowCode = extractCode(r.job_code || r.job_code_display || '');
						if (targetCode) {
							return rowCode === targetCode; // code wins
						}
						const nameEq = targetName && normalize(r.job_name) === targetName;
						return nameEq;
					});
					console.log('✅ strict filter active:', { targetCode, targetName: targetNameRaw, before, after: rows.length });
				}
			}

			// Client-side date filtering เพื่อแน่ใจว่าข้อมูลอยู่ในช่วงที่เลือก
			if (from && to) {
				const fromDate = new Date(from);
				const toDate = new Date(to);
				
				const filteredRows = rows.filter(row => {
					if (!row.production_date) return false;
					
					const productionDate = new Date(row.production_date);
					return productionDate >= fromDate && productionDate <= toDate;
				});
				
				console.log('🔍 Date filtering:', {
					originalCount: rows.length,
					filteredCount: filteredRows.length,
					dateRange: { from, to },
					removedRows: rows.length - filteredRows.length
				});
				
				rows = filteredRows;
			}

			setSummaryRows(rows);
			setAppliedFromDate(from);
			setAppliedToDate(to);
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
	const loadAttendanceLogsSummary = async (fromOverride, toOverride) => {
		try {
			setLoading(true);
			
			// ใช้วันที่จาก attDateRange ถ้ามี ถ้าไม่มีใช้ attFromDate/attToDate
			let from = fromOverride;
			let to = toOverride;
			
			// ถ้าไม่มี override และมี attDateRange ให้ใช้ attDateRange
			if (!fromOverride && !toOverride && attDateRange.startDate && attDateRange.endDate) {
				// ใช้ getFullYear, getMonth, getDate เพื่อหลีกเลี่ยงปัญหา timezone
				const startYear = attDateRange.startDate.getFullYear();
				const startMonth = String(attDateRange.startDate.getMonth() + 1).padStart(2, '0');
				const startDay = String(attDateRange.startDate.getDate()).padStart(2, '0');
				from = `${startYear}-${startMonth}-${startDay}`;
				
				const endYear = attDateRange.endDate.getFullYear();
				const endMonth = String(attDateRange.endDate.getMonth() + 1).padStart(2, '0');
				const endDay = String(attDateRange.endDate.getDate()).padStart(2, '0');
				to = `${endYear}-${endMonth}-${endDay}`;
			} else if (!fromOverride && !toOverride) {
				from = attFromDate;
				to = attToDate;
			}
			const params = { from, to };
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
			// Normalize operators for display
			rows = rows.map(r => ({ ...r, operators: coalesceOperators(r) }));

			setAttendanceSourceRows(rows || []);
			setAttAppliedFromDate(from);
			setAttAppliedToDate(to);
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
		const today = new Date();
		const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
		
		// More comprehensive date validation
		if (today && typeof today === 'object' && today instanceof Date && !isNaN(today.getTime()) &&
			firstDayOfMonth && typeof firstDayOfMonth === 'object' && firstDayOfMonth instanceof Date && !isNaN(firstDayOfMonth.getTime())) {
			const todayStr = formatYYYYMMDD(today);
			const firstDayStr = formatYYYYMMDD(firstDayOfMonth);
			
			// Set production tab dates (today -> today) - but don't set dateRange to avoid default selection
			setFromDate(todayStr);
			setToDate(todayStr);
			// Don't set dateRange here - let user select manually
			
			// Set attendance tab dates (first day of month -> today)
			setAttFromDate(firstDayStr);
			setAttToDate(todayStr);
			setAttDateRange({ startDate: firstDayOfMonth, endDate: today });
			
			// preload with explicit dates to avoid state update race
			loadLogsSummary(todayStr, todayStr);
			loadAttendanceLogsSummary(firstDayStr, todayStr);
		}
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
		if ((!q || q.trim() === '') || summaryRows.length === 0) {
			return { avgPlanned: 0, avgActual: 0 };
		}
		// In strict mode, only compute on exact-matched rows
		let working = summaryRows;
		if (strictMode) {
			const normalize = (s) => (typeof s === 'string' ? s.replace(/[\s\-_.]/g, '').toLowerCase() : '');
			const extractCode = (val) => {
				if (val === null || val === undefined) return '';
				const m = String(val).match(/\b\d{3,}\b/);
				return m ? m[0] : '';
			};
			const inputCode = extractCode(q || '');
			const targetNameRaw = ((strictTarget.name || '').trim() || String(q || '').trim());
			const targetName = normalize(targetNameRaw);
			const targetCode = String((strictTarget.code || '').trim() || inputCode);
			if (targetCode || targetName) {
				working = summaryRows.filter((r) => {
					const rowCode = extractCode(r.job_code || r.job_code_display || '');
					if (targetCode) {
						return rowCode === targetCode; // code wins
					}
					const nameEq = targetName && normalize(r.job_name) === targetName;
					return nameEq;
				});
			}
		}
		const validJobs = working.filter(row => {
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
	}, [q, summaryRows, strictMode, strictTarget]);

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

	// Ensure strict target from current input/suggestions when user presses Enter or clicks Search
	const ensureStrictTargetFromInput = () => {
		if (!strictMode) return;
		const normalize = (s) => (typeof s === 'string' ? s.replace(/[\s\-_.]/g, '').toLowerCase().trim() : '');
		const extractCode = (val) => {
			if (val === null || val === undefined) return '';
			const m = String(val).match(/\b\d{3,}\b/);
			return m ? m[0] : '';
		};
		const input = q || '';
		const inputCode = extractCode(input);
		const inputName = input.replace(/^\s*\d+\s*/,'').trim();
		// 1) Try exact suggestion match
		const exact = (jobSuggest || []).find((s) => {
			return (String(s.job_code||'').trim() === inputCode && inputCode) || (normalize(s.job_name) === normalize(input));
		});
		if (exact) {
			setStrictTarget({ code: exact.job_code || inputCode || '', name: exact.job_name || inputName || '' });
			setStrictSelected(true);
			return;
		}
		// 2) If a numeric code exists in input, use code as target
		if (inputCode) {
			setStrictTarget({ code: inputCode, name: inputName });
			setStrictSelected(true);
			return;
		}
		// 3) Fallback to exact name (will be normalized in filter)
		if (inputName) {
			setStrictTarget({ code: '', name: inputName });
			setStrictSelected(true);
		}
	};

	const onChangeQuery = (value) => {
		setQ(value);
		// Clear any suggestion state (we no longer show suggestions)
		setJobSuggest([]);
		setJobSuggestOpen(false);
		if (strictMode) {
			setStrictSelected(false);
			setStrictTarget({ code: '', name: '' });
		}
		if (typingTimer) clearTimeout(typingTimer);
	};

	const onSearchKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (strictMode) {
				ensureStrictTargetFromInput();
				setStrictSearchTriggered(true);
			}
			loadLogsSummary();
		}
	};

	const pickSuggestion = (s) => {
		const nameOnly = `${s.job_name ?? ''}`.trim();
		setQ(nameOnly);
		if (strictMode) {
			setStrictTarget({ code: s.job_code || '', name: s.job_name || '' });
			setStrictSelected(true);
		}
		setJobSuggestOpen(false);
		// Trigger search immediately with the chosen text to avoid double-search
		loadLogsSummary(undefined, undefined, nameOnly);
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
			const key = r.production_date ? formatYYYYMMDD(new Date(r.production_date)) : '';
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
					const key = formatYYYYMMDD(d);
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
		// ใช้ช่วงวันที่ที่ใช้ค้นหาจริง (applied range) และแสดงแบบ DD/MM/YYYY
		const s = parseYYYYMMDDLocal(appliedFromDate);
		const e = parseYYYYMMDDLocal(appliedToDate);
		const sLabel = s ? formatDisplayDDMMYYYY(s) : appliedFromDate;
		const eLabel = e ? formatDisplayDDMMYYYY(e) : appliedToDate;
		const title = `ตารางแสดงประวัติการผลิต วันที่ ${sLabel} - ${eLabel}`;
		const head = ['ลำดับ','รหัส','ชื่องาน/ชื่อสินค้า','วันที่ผลิต','เวลาตามแผนผลิตเริ่มต้น-สิ้นสุด (ชั่วโมง:นาที)','เวลารวมตามแผนผลิต (ชั่วโมง:นาที)','เวลาผลิตจริงเริ่มต้น-สิ้นสุด (ชั่วโมง:นาที)','เวลารวมผลิตจริง (ชั่วโมง:นาที)','ผู้ปฏิบัติงาน','Batch การผลิต','Yield %'];
		const rowsHtml = summaryRows.map((row, idx) => {
			const cells = [
				idx + 1,
				row.job_code || '',
				row.job_name || '',
				row.production_date ? formatDisplayDDMMYYYY(new Date(row.production_date)) : '-',
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
			const filename = `logs_${dateRange.startDate ? formatYYYYMMDD(dateRange.startDate) : appliedFromDate}_to_${dateRange.endDate ? formatYYYYMMDD(dateRange.endDate) : appliedToDate}.xls`;
			downloadBlob(html, filename, 'application/vnd.ms-excel;charset=utf-8;');
			if (TOAST_ENABLED) toast.success('ส่งออก Excel สำเร็จ');
		} catch (e) {
			console.error(e);
			if (TOAST_ENABLED) toast.error('ส่งออก Excel ไม่สำเร็จ');
		}
	};

	// Export: build HTML table for Attendance data
	const buildAttendanceExcelHtml = () => {
		// ใช้ช่วงวันที่ที่ใช้ค้นหาจริง (applied range) และแสดงแบบ DD/MM/YYYY
		const s = parseYYYYMMDDLocal(attAppliedFromDate);
		const e = parseYYYYMMDDLocal(attAppliedToDate);
		const sLabel = s ? formatDisplayDDMMYYYY(s) : attAppliedFromDate;
		const eLabel = e ? formatDisplayDDMMYYYY(e) : attAppliedToDate;
		const title = `ตารางแสดงประวัติ Capacity การผลิต วันที่ ${sLabel} - ${eLabel}`;
		const head = ['ลำดับ','วันที่','เวลารวมทั้งหมด (ชั่วโมง:นาที)','จำนวนผู้ปฏิบัติงาน','เวลารวมตามแผนผลิต (ชั่วโมง:นาที)','เวลารวมผลิตจริง (ชั่วโมง:นาที)','เวลาที่ใช้ลงแผน %','เวลาที่ใช้ผลิตจริง %','เวลาเหลือ (ชั่วโมง:นาที)','เวลาเหลือ %'];
		const rowsHtml = attendanceRows.map((row, idx) => {
			const cells = [
				idx + 1,
				row.date ? formatDisplayDDMMYYYY(new Date(row.date)) : '-',
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
									{/* Ant Design Date Range Picker */}
									<div>
										<label className="block text-sm font-medium text-gray-700">เลิอกวันที่</label>
										<SimpleAntDateRangePicker
											startDate={dateRange.startDate}
											endDate={dateRange.endDate}
											onRangeChange={handleDateRangeChange}
											placeholder="เลือกช่วงวันที่"
											className="w-80"
										/>
										{dateRangeError && (
											<div className="mt-1 text-sm text-red-600 flex items-center gap-1">
												<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
												</svg>
												{dateRangeError}
											</div>
										)}
									</div>
									<div className="w-80 relative">
										<label className="block text-sm font-medium text-gray-700">ค้นหา (รหัส/ชื่องาน/ผู้ปฏิบัติงาน)</label>
										<input type="text" className="input w-full" placeholder="เช่น 235001, น้ำแกงส้ม, เอ" value={q} onChange={(e) => onChangeQuery(e.target.value)} onKeyDown={onSearchKeyDown} />
										{/* Suggestions */}
										{jobSuggestOpen && jobSuggest.length > 0 && (
											<div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow">
												<ul className="max-h-60 overflow-auto">
													{jobSuggest.map((s, i) => (
														<li key={`${s.job_code}-${i}`} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => pickSuggestion(s)}>
															<span className="font-mono text-gray-700 mr-2">{s.job_code}</span>
															<span className="text-gray-900">{s.job_name}</span>
														</li>
													))}
												</ul>
											</div>
										)}
									</div>
									{/* Strict mode toggle */}
									<div className="flex items-center gap-2">
										<input id="strictModeToggle" type="checkbox" className="h-4 w-4" checked={strictMode} onChange={(e) => { setStrictMode(e.target.checked); setStrictSearchTriggered(false); if (!e.target.checked) { setStrictSelected(false); setStrictTarget({ code: '', name: '' }); } }} />
										<label htmlFor="strictModeToggle" className="text-sm text-gray-800 select-none">ค้นหาแบบเจาะจง</label>
									</div>
									<button onClick={async () => {
										try {
											console.log('🔍 ปุ่มค้นหาถูกกด - dateRange:', dateRange);
											if (strictMode) { ensureStrictTargetFromInput(); setStrictSearchTriggered(true); }
											await loadLogsSummary();
										} catch (error) {
											console.error('❌ Error in search button:', error);
										}
									}} disabled={loading || dateRangeError} className="btn btn-primary">
										ค้นหา
									</button>
									<button onClick={async () => { 
										const today = new Date();
										if (today && !isNaN(today.getTime())) {
											const todayStr = formatYYYYMMDD(today);
											setQ('');
											setFromDate(todayStr);
											setToDate(todayStr);
											setDateRange({ startDate: null, endDate: null });
											setDateRangeError(null);
											setCurrentPage(1);
											setStrictSearchTriggered(false);
											// โหลดข้อมูลทันทีด้วยวันที่ใหม่ โดยไม่ต้องกดค้นหาอีก
											await loadLogsSummary(todayStr, todayStr, '');
											showClearHint('ล้างค่า: วันที่ + ช่องค้นหา');
										}
									}} className="btn btn-secondary">ล้างค่า</button>
									{summaryRows.length > 0 && (
										<div className="ml-auto flex gap-2">
											<button onClick={onExportExcel} className="btn btn-success">ส่งออก Excel</button>
										</div>
									)}
									{activeTab === 'production' && clearHint && (
										<div className="w-full mt-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2">
											{clearHint}
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

							{/* Average Time Cards - Only show when strict selected */}
							{strictMode && strictSelected && strictSearchTriggered && summaryRows.length > 0 && (
								<div className="mt-4">
									<div className="text-sm text-gray-600 mb-1">เวลาเฉลี่ยของงานที่ค้นหา (แสดงเมื่อเลือกแบบเจาะจง)</div>
									<div className="text-xs text-gray-500 mb-3">รายการที่คำนวณ: {strictTarget.code || ''} {strictTarget.name || ''}</div>
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
									{(() => {
										// แสดงจาก applied range เสมอ เพื่อสะท้อนผลลัพธ์ที่ค้นหาจริง
										const startD = parseYYYYMMDDLocal(appliedFromDate);
										const endD = parseYYYYMMDDLocal(appliedToDate);
										const startLabel = startD ? formatDisplayDDMMYYYY(startD) : appliedFromDate;
										const endLabel = endD ? formatDisplayDDMMYYYY(endD) : appliedToDate;
										return (
											<h3 className="text-lg font-semibold text-gray-900 mb-1">{`ตารางแสดงข้อมูลการผลิตสินค้า วันที่ ${startLabel} - ${endLabel}`}</h3>
										);
									})()}
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
									{/* Ant Design Date Range Picker */}
									<div>
										<label className="block text-sm font-medium text-gray-700">ช่วงวันที่</label>
										<SimpleAntDateRangePicker
											startDate={attDateRange.startDate}
											endDate={attDateRange.endDate}
											onRangeChange={handleAttDateRangeChange}
											placeholder="เลือกช่วงวันที่"
											className="w-80"
										/>
									</div>
									<button onClick={async () => { await loadAttendanceLogsSummary(); }} disabled={loading} className="btn btn-primary">ค้นหา</button>
									<button onClick={async () => { 
										const today = new Date();
										const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
										
										if (today && !isNaN(today.getTime()) && firstDayOfMonth && !isNaN(firstDayOfMonth.getTime())) {
											const todayStr = formatYYYYMMDD(today);
											const firstDayStr = formatYYYYMMDD(firstDayOfMonth);
											
											setAttFromDate(firstDayStr); 
											setAttToDate(todayStr); 
											setAttDateRange({ 
												startDate: firstDayOfMonth, 
												endDate: today 
											});
											setAttAppliedFromDate(firstDayStr); 
											setAttAppliedToDate(todayStr); 
											// Reload data for the default range so values are not all zeros
											await loadAttendanceLogsSummary(firstDayStr, todayStr);
											showClearHint('ล้างค่า: วันที่');
										}
									}} className="btn btn-secondary">ล้างค่า</button>
									{attendanceRows.length > 0 && (
										<div className="ml-auto flex gap-2">
											<button onClick={onExportAttendanceExcel} className="btn btn-success">ส่งออก Excel</button>
										</div>
									)}
									{activeTab === 'attendance' && clearHint && (
										<div className="w-full mt-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2">
											{clearHint}
										</div>
									)}
								</div>
							</div>
 							{/* Attendance summary cards */}
							{(() => {
								const s = parseYYYYMMDDLocal(attAppliedFromDate);
								const e = parseYYYYMMDDLocal(attAppliedToDate);
								const sLabel = s ? formatDisplayDDMMYYYY(s) : attAppliedFromDate;
								const eLabel = e ? formatDisplayDDMMYYYY(e) : attAppliedToDate;
								return (
									<div className="mb-2 text-sm text-gray-600">สรุปช่วงวันที่ {sLabel} - {eLabel}</div>
								);
							})()}
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
