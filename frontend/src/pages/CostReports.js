import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { costAPI, formatCurrency, formatNumber, formatDate } from '../services/api';
import { Calendar, Download, RefreshCw } from 'lucide-react';

const CostReports = () => {
	const { register, handleSubmit, watch, setValue } = useForm({
		defaultValues: {
			report_date: new Date().toISOString().split('T')[0]
		}
	});
	
	const [loading, setLoading] = useState(false);
	const [reportData, setReportData] = useState([]);
	const [summary, setSummary] = useState({
		total_batches: 0,
		total_material_cost: 0,
		total_production: 0,
		average_yield: 0
	});
	
	// State สำหรับ popup
	const [showModal, setShowModal] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [laborData, setLaborData] = useState({
		daily_wage: 480,
		worker_count: 1
	});
	const [calculatedLaborCost, setCalculatedLaborCost] = useState({});
	const [saving, setSaving] = useState({});
	const [savingAll, setSavingAll] = useState(false);
	const [lastSaved, setLastSaved] = useState(null);
	
	// State สำหรับค่าโสหุ้ย
	const [overheadPercentage, setOverheadPercentage] = useState(10); // Default 10%
	
	// State สำหรับค่าน้ำไฟแก๊ส
	const [utilityPercentage, setUtilityPercentage] = useState(5); // Default 5%

	// State สำหรับ modal ใหม่
	const [showOverheadModal, setShowOverheadModal] = useState(false);
	const [showUtilityModal, setShowUtilityModal] = useState(false);

	// State สำหรับการค้นหา
	const [searchTerm, setSearchTerm] = useState('');
	const [isSearchMode, setIsSearchMode] = useState(false);
	const [searchResults, setSearchResults] = useState([]);

	const reportDate = watch('report_date');

	// Helper: ราคาฐานต่อหน่วย (คำนวณจาก modal ถ้ามี ไม่งั้นใช้ที่บันทึกไว้)
	const getBaseLaborPerUnit = (item) => {
		const calc = calculatedLaborCost[item.batch_id]?.total_cost_per_unit;
		const saved = Number(item.saved_output_unit_cost);
		return (typeof calc === 'number' && !isNaN(calc)) ? calc : (!isNaN(saved) && saved > 0 ? saved : null);
	};
	const renderLaborPerUnit = (item) => {
		if (!item.batch_id) return <span className="text-gray-400">-</span>;
		const base = getBaseLaborPerUnit(item);
		return base != null ? formatCurrency(base) : <span className="text-blue-600 hover:text-blue-800">คลิกเพื่อคำนวณ</span>;
	};
	const renderLaborWithOverhead = (item) => {
		if (!item.batch_id) return <span className="text-gray-400">-</span>;
		const base = getBaseLaborPerUnit(item);
		return base != null ? (
			<div className="flex items-center justify-between">
				<span>{formatCurrency(base * (1 + overheadPercentage / 100))}</span>
				<button 
					onClick={() => setShowOverheadModal(true)}
					className="ml-2 text-xs text-purple-600 hover:text-purple-800 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded"
				>
					{overheadPercentage}%
				</button>
			</div>
		) : <span className="text-gray-400">-</span>;
	};
	const renderTotalWithOHAndUtility = (item) => {
		if (!item.batch_id) return <span className="text-gray-400">-</span>;
		const base = getBaseLaborPerUnit(item);
		return base != null ? (
			<div className="flex items-center justify-between">
				<span>{formatCurrency(base * (1 + overheadPercentage / 100 + utilityPercentage / 100))}</span>
				<button 
					onClick={() => setShowUtilityModal(true)}
					className="ml-2 text-xs text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-2 py-1 rounded"
				>
					{utilityPercentage}%
				</button>
			</div>
		) : <span className="text-gray-400">-</span>;
	};

	// ฟังก์ชันแปลงนาทีเป็นรูปแบบ ชั่วโมง:นาที (ปัดเศษเป็นนาทีเพื่อไม่ให้มีทศนิยม)
	const formatTime = (minutes) => {
		const numeric = Number(minutes);
		if (!numeric || numeric <= 0) return '0:00';
		const totalMinutes = Math.round(numeric); // ปัดเศษเป็นนาทีที่ใกล้สุด
		const hours = Math.floor(totalMinutes / 60);
		const mins = totalMinutes % 60;
		return `${hours}:${mins.toString().padStart(2, '0')}`;
	};

	// ฟังก์ชันคำนวณ Manhour
	const calculateManhour = (timeUsedMinutes, dailyWage, workerCount) => {
		if (!timeUsedMinutes || timeUsedMinutes === 0 || !dailyWage || !workerCount) return 0;
		const adjustedTime = timeUsedMinutes; // หน่วยเป็นนาที
		// ค่าแรงต่อวันต่อคน → ค่าแรงต่อนาทีต่อคน = dailyWage / 480
		// รวมคนทั้งหมด และคูณด้วยจำนวนนาทีที่ใช้
		const manhour = (dailyWage * workerCount / 480) * adjustedTime;
		return isNaN(manhour) ? 0 : manhour;
	};

	// ฟังก์ชันคำนวณมูลค่าต่อหน่วยรวมต้นทุนแรงงาน
	const calculateTotalLaborCostPerUnit = (item, dailyWage, workerCount) => {
		const totalMaterialCost = Number(item.total_material_cost) || 0;
		const productionQty = Number(item.good_qty) || 0;
		const manhour = calculateManhour(item.time_used_minutes, dailyWage, workerCount);
		if (productionQty === 0) return 0;
		const productionCostPerUnit = totalMaterialCost / productionQty;
		const laborCostPerUnit = manhour / productionQty;
		return isNaN(productionCostPerUnit + laborCostPerUnit) ? productionCostPerUnit : (productionCostPerUnit + laborCostPerUnit);
	};

	const openLaborModal = (item) => {
		setSelectedItem(item);
		// ตั้งค่าเริ่มต้นตามจำนวนผู้ปฏิบัติงานจากข้อมูล
		setLaborData({
			daily_wage: 480,
			worker_count: item.operators_count || 1
		});
		setShowModal(true);
	};

	const saveLaborData = () => {
		if (!selectedItem) return;
		const totalCost = calculateTotalLaborCostPerUnit(selectedItem, laborData.daily_wage, laborData.worker_count);
		setCalculatedLaborCost(prev => ({
			...prev,
			[selectedItem.batch_id]: {
				daily_wage: laborData.daily_wage,
				worker_count: laborData.worker_count,
				total_cost_per_unit: totalCost
			}
		}));
		setShowModal(false);
		toast.success('บันทึกข้อมูนแรงงานสำเร็จ');
	};

	const loadReport = async (date) => {
		try {
			setLoading(true);
			const res = await costAPI.getSummary({ date });
			const data = res.data.data || [];
			const processedData = data.map(item => ({
				...item,
				yield_percent: item.total_material_qty > 0 ? ((item.good_qty || 0) / item.total_material_qty) * 100 : 0
			}));
			setReportData(processedData);
			const totalBatches = processedData.length;
			const totalMaterialCost = processedData.reduce((sum, item) => sum + (item.total_material_cost || 0), 0);
			const totalProduction = processedData.reduce((sum, item) => sum + (item.good_qty || 0), 0);
			const averageYield = totalBatches > 0 ? (processedData.reduce((sum, item) => sum + (item.yield_percent || 0), 0) / totalBatches) : 0;
			setSummary({ total_batches: totalBatches, total_material_cost: totalMaterialCost, total_production: totalProduction, average_yield: averageYield });
			
			if (processedData.length === 0) {
				toast.info('ไม่พบข้อมูลสำหรับวันที่เลือก');
			} else {
				toast.success(`โหลดข้อมูลสำเร็จ ${processedData.length} รายการ`);
			}
		} catch (error) {
			console.error('Error loading report:', error);
			toast.error(error.response?.data?.error || 'โหลดรายงานไม่สำเร็จ');
			setReportData([]);
			setSummary({ total_batches: 0, total_material_cost: 0, total_production: 0, average_yield: 0 });
		} finally {
			setLoading(false);
		}
	};

	// ฟังก์ชันค้นหาข้อมูล
	const searchData = async (searchTerm) => {
		if (!searchTerm.trim()) {
			setIsSearchMode(false);
			setSearchResults([]);
			loadReport(reportDate);
			return;
		}

		try {
			setLoading(true);
			setIsSearchMode(true);
			
			// ค้นหาจากข้อมูล 30 วันย้อนหลัง
			const searchPromises = [];
			const today = new Date();
			
			for (let i = 0; i < 30; i++) {
				const searchDate = new Date(today);
				searchDate.setDate(today.getDate() - i);
				const dateStr = searchDate.toISOString().split('T')[0];
				
				searchPromises.push(
					costAPI.getSummary({ date: dateStr })
						.then(res => res.data.data || [])
						.catch(() => [])
				);
			}
			
			const allResults = await Promise.all(searchPromises);
			const flattenedResults = allResults.flat();
			
			// กรองผลลัพธ์ตามคำค้นหา
			const filteredResults = flattenedResults.filter(item => 
				item.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.job_code?.toLowerCase().includes(searchTerm.toLowerCase())
			);
			
			// เพิ่มข้อมูลวันที่และ yield_percent
			const processedResults = filteredResults.map(item => ({
				...item,
				yield_percent: item.total_material_qty > 0 ? ((item.good_qty || 0) / item.total_material_qty) * 100 : 0
			}));
			
			setSearchResults(processedResults);
			
			if (processedResults.length === 0) {
				toast.info(`ไม่พบข้อมูลสำหรับ "${searchTerm}"`);
			} else {
				toast.success(`พบ ${processedResults.length} รายการสำหรับ "${searchTerm}"`);
			}
		} catch (error) {
			console.error('Error searching data:', error);
			toast.error('ค้นหาข้อมูลไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	// ฟังก์ชันรีเซ็ตการค้นหา
	const resetSearch = () => {
		setSearchTerm('');
		setIsSearchMode(false);
		setSearchResults([]);
		loadReport(reportDate);
	};

	const loadLastSaved = async (date) => {
		try {
			const res = await costAPI.getLastSaved({ date });
			setLastSaved(res.data?.data?.last_saved_at || null);
		} catch (e) {
			setLastSaved(null);
		}
	};

	useEffect(() => {
		if (reportDate) {
			loadReport(reportDate);
			loadLastSaved(reportDate);
		}
	}, [reportDate]);

	const onExport = () => {
		toast.success('ส่งออกรายงานสำเร็จ');
	};

	const onRefresh = () => {
		loadReport(reportDate);
		loadLastSaved(reportDate);
	};

	const onSaveRow = async (item) => {
		try {
			setSaving(prev => ({ ...prev, [item.batch_id]: true }));
			const payload = {
				batch_id: item.batch_id,
				work_plan_id: item.work_plan_id,
				job_code: item.job_code,
				job_name: item.job_name,
				production_date: item.production_date,
				operators_count: item.operators_count, // จาก work plan
				labor_rate_per_hour: laborData.daily_wage, // ใช้จาก modal เป็นฐาน
				labor_workers_count: laborData.worker_count,
				labor_daily_wage: laborData.daily_wage,
				saved_by: 'webapp',
				saved_reason: 'manual save from report'
			};
			const res = await costAPI.saveCost(payload);
			if (res.data?.success) {
				toast.success('บันทึกต้นทุนสำเร็จ');
				loadLastSaved(reportDate); // อัปเดตเวลาบันทึกล่าสุด
				loadReport(reportDate); // โหลดข้อมูลใหม่
			} else {
				toast.error(res.data?.error || 'บันทึกไม่สำเร็จ');
			}
		} catch (error) {
			console.error(error);
			toast.error(error.response?.data?.error || 'บันทึกไม่สำเร็จ');
		} finally {
			setSaving(prev => ({ ...prev, [item.batch_id]: false }));
		}
	};

	const onSaveAll = async () => {
		try {
			if (!reportData || reportData.length === 0) {
				toast.error('ไม่มีรายการให้บันทึก');
				return;
			}
			
			// ตรวจสอบข้อมูลก่อนบันทึก
			const invalidItems = reportData.filter(item => !item.batch_id || !item.work_plan_id);
			if (invalidItems.length > 0) {
				toast.error(`พบ ${invalidItems.length} รายการที่มีข้อมูลไม่ครบถ้วน`);
				return;
			}
			
			setSavingAll(true);
			let successCount = 0;
			let errorCount = 0;
			
			for (const item of reportData) {
				try {
					const payload = {
						batch_id: item.batch_id,
						work_plan_id: item.work_plan_id,
						job_code: item.job_code,
						job_name: item.job_name,
						production_date: item.production_date,
						operators_count: item.operators_count,
						labor_rate_per_hour: laborData.daily_wage,
						labor_workers_count: laborData.worker_count,
						labor_daily_wage: laborData.daily_wage,
						saved_by: 'webapp',
						saved_reason: 'save all from report'
					};
					await costAPI.saveCost(payload);
					successCount++;
				} catch (itemError) {
					console.error(`Error saving item ${item.batch_id}:`, itemError);
					errorCount++;
				}
			}
			
			if (errorCount === 0) {
				toast.success(`บันทึกการคำนวณสำเร็จ ${successCount} รายการ`);
			} else {
				toast.error(`บันทึกสำเร็จ ${successCount} รายการ, ล้มเหลว ${errorCount} รายการ`);
			}
			
			loadLastSaved(reportDate);
			loadReport(reportDate); // โหลดข้อมูลใหม่หลังบันทึก
		} catch (error) {
			console.error('Error in onSaveAll:', error);
			toast.error(error.response?.data?.error || 'บันทึกไม่สำเร็จ');
		} finally {
			setSavingAll(false);
		}
	};

	return (
		<div className="space-y-6 w-full max-w-none">
			<div className="card w-full">
				<div className="card-header flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							{isSearchMode ? `ผลการค้นหา: "${searchTerm}"` : 'ตารางต้นทุนการผลิต'}
						</h1>
						<p className="text-gray-600">
							{isSearchMode 
								? `พบ ${searchResults.length} รายการจาก 30 วันย้อนหลัง` 
								: `บันทึกและวิเคราะห์ต้นทุนการผลิตรายวัน - ${formatDate(reportDate)}`
							}
						</p>
						{lastSaved && !isSearchMode && (
							<p className="text-xs text-green-700 mt-1">บันทึกล่าสุด: {new Date(lastSaved).toLocaleString('th-TH')}</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button onClick={onSaveAll} disabled={savingAll || loading} className="btn btn-primary text-sm">
							{savingAll ? 'กำลังบันทึก...' : 'บันทึกการคำนวณ'}
						</button>
						<button onClick={onExport} className="btn btn-secondary flex items-center gap-2">
							<Download size={16} />
							ส่งออก
						</button>
					</div>
				</div>
				<div className="card-body space-y-4 w-full">
										{/* ตัวกรองและปุ่มควบคุม */}
					<div className="flex items-center justify-between w-full">
						{/* วันที่ */}
						<div className="flex items-center gap-2 whitespace-nowrap">
							<Calendar size={16} className="text-gray-500 flex-shrink-0" />
							<label className="text-sm font-medium text-gray-700 flex-shrink-0">วันที่:</label>
							<input type="date" className="input flex-shrink-0" {...register('report_date')} />
						</div>
						
						{/* ช่องค้นหา */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-gray-700 whitespace-nowrap">ค้นหา:</label>
							<input 
								type="text" 
								placeholder="ชื่องานหรือรหัสงาน..." 
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onKeyPress={(e) => e.key === 'Enter' && searchData(searchTerm)}
								className="input w-48"
							/>
							<button 
								onClick={() => searchData(searchTerm)}
								className="btn btn-primary text-sm px-4"
								disabled={!searchTerm.trim()}
							>
								ค้นหา
							</button>
							{isSearchMode && (
								<button 
									onClick={resetSearch}
									className="btn btn-secondary text-sm px-3"
								>
									รีเซ็ต
								</button>
							)}
						</div>
						
						{/* ตัวปรับค่า % โสหุ้ยและค่าน้ำไฟแก๊ส - ย้ายไปอยู่ในคอลัมน์แล้ว */}
					</div>

					{/* ตารางรายงาน */}
					<div className="overflow-x-auto w-full">
						<table className="w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								{/* แถวหัวข้อกลุ่มใหญ่ */}
								<tr>
									<th colSpan="4" className="px-4 py-2 text-center text-xs font-semibold text-gray-700">ข้อมูลทั่วไป</th>
									<th colSpan="3" className="px-4 py-2 text-center text-xs font-semibold text-red-700 bg-red-50">ต้นทุนวัตถุดิบตั้งต้น</th>
									<th colSpan="6" className="px-4 py-2 text-center text-xs font-semibold text-yellow-700 bg-yellow-50">ผลการผลิต</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-green-700 bg-green-50">ต้นทุนที่ผลิตได้</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-blue-700 bg-blue-50">ต้นทุนแรงงาน</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-purple-700 bg-purple-50">ต้นทุนแรงงาน+โสหุ้ย</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-orange-700 bg-orange-50">ต้นทุนรวม+ค่าน้ำไฟ</th>
								</tr>
								<tr>
									{/* ข้อมูนทั่วไป */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">งานที่</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสงาน</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่องาน</th>
									{isSearchMode && (
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ผลิต</th>
									)}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะการผลิต</th>
									{/* ต้นทุนวัตถุดิบตั้งต้น */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-100">น้ำหนักรวม (กก.)</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-100">ราคารวม</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-100">ราคาต่อหน่วย (บาท/กก.)</th>
									{/* ผลการผลิต */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">จำนวนที่ผลิตได้ (กก.)</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">จำนวนที่ผลิตได้</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">หน่วย</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">% Yield</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">เวลาที่ใช้ (ชั่วโมง:นาที)</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">จำนวนผู้ปฏิบัติงาน</th>
									{/* ต้นทุนที่ผลิตได้ */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-100">มูลค่าต่อหน่วย (บาท/หน่วย)</th>
									{/* ต้นทุนแรงงาน */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-100">ต้นทุนแรงงาน/หน่วย</th>
									{/* ต้นทุนแรงงาน+โสหุ้ย */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-100">ต้นทุนแรงงาน+โสหุ้ย/หน่วย ({overheadPercentage}%)</th>
									{/* ต้นทุนรวม */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-100">ต้นทุนรวม/หน่วย ({utilityPercentage}%)</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{loading ? (
									<tr>
										<td colSpan="18" className="px-4 py-8 text-center text-gray-500">กำลังโหลดข้อมูน...</td>
									</tr>
								) : isSearchMode && searchResults.length === 0 ? (
									<tr>
										<td colSpan="18" className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลที่ค้นหา</td>
									</tr>
								) : (
									searchResults.length === 0 ? (
										reportData.map((item, index) => (
											<tr key={item.batch_id} className="hover:bg-gray-50">
												<td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.job_code}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.job_name}</td>
												{isSearchMode && (
													<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.production_date)}</td>
												)}
												<td className="px-4 py-4 whitespace-nowrap">
													<span className={`px-2 py-1 text-xs font-medium rounded-full ${
														item.production_status === 'completed' ? 'bg-green-100 text-green-800' :
														item.production_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
														item.production_status === 'cancelled' ? 'bg-red-100 text-red-800' :
														'bg-gray-100 text-gray-800'
													}`}>
														{item.production_status === 'completed' ? 'เสร็จสิ้น' :
														 item.production_status === 'in_progress' ? 'กำลังดำเนินการ' :
														 item.production_status === 'cancelled' ? 'ยกเลิก' :
														 'รอดำเนินการ'}
													</span>
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">{item.batch_id ? formatNumber(item.total_weight_kg || 0, 3) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">{item.batch_id ? formatCurrency(item.total_material_cost || 0) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">{item.batch_id ? formatCurrency((item.total_material_cost || 0) / (item.total_material_qty || 1)) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? formatNumber(item.good_qty || 0, 2) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id && item.good_secondary_qty != null ? formatNumber(item.good_secondary_qty, 2) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? (item.good_secondary_unit || item.display_unit || item.unit || 'หน่วย') : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? formatNumber(item.yield_percent || 0, 1) + '%' : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? formatTime(item.time_used_minutes || 0) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{(item.operators_count ?? null) !== null ? item.operators_count : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">{item.batch_id ? formatCurrency(item.cost_per_display_unit || 0) : '-'}</td>
												<td className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50 ${item.batch_id ? 'cursor-pointer hover:bg-blue-100' : ''}`} onClick={item.batch_id ? () => openLaborModal(item) : undefined}>{renderLaborPerUnit(item)}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50">{renderLaborWithOverhead(item)}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-orange-50">{renderTotalWithOHAndUtility(item)}</td>
											</tr>
										))
									) : (
										searchResults.map((item, index) => (
											<tr key={item.batch_id} className="hover:bg-gray-50">
												<td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.job_code}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.job_name}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.production_date)}</td>
												<td className="px-4 py-4 whitespace-nowrap">
													<span className={`px-2 py-1 text-xs font-medium rounded-full ${
														item.production_status === 'completed' ? 'bg-green-100 text-green-800' :
														item.production_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
														item.production_status === 'cancelled' ? 'bg-red-100 text-red-800' :
														'bg-gray-100 text-gray-800'
													}`}>
														{item.production_status === 'completed' ? 'เสร็จสิ้น' :
														 item.production_status === 'in_progress' ? 'กำลังดำเนินการ' :
														 item.production_status === 'cancelled' ? 'ยกเลิก' :
														 'รอดำเนินการ'}
													</span>
												</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">{item.batch_id ? formatNumber(item.total_weight_kg || 0, 3) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">{item.batch_id ? formatCurrency(item.total_material_cost || 0) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">{item.batch_id ? formatCurrency((item.total_material_cost || 0) / (item.total_material_qty || 1)) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? formatNumber(item.good_qty || 0, 2) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id && item.good_secondary_qty != null ? formatNumber(item.good_secondary_qty, 2) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? (item.good_secondary_unit || item.display_unit || item.unit || 'หน่วย') : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? formatNumber(item.yield_percent || 0, 1) + '%' : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{item.batch_id ? formatTime(item.time_used_minutes || 0) : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">{(item.operators_count ?? null) !== null ? item.operators_count : '-'}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">{item.batch_id ? formatCurrency(item.cost_per_display_unit || 0) : '-'}</td>
												<td className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50 ${item.batch_id ? 'cursor-pointer hover:bg-blue-100' : ''}`} onClick={item.batch_id ? () => openLaborModal(item) : undefined}>{renderLaborPerUnit(item)}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50">{renderLaborWithOverhead(item)}</td>
												<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-orange-50">{renderTotalWithOHAndUtility(item)}</td>
											</tr>
										))
									)
								)}
							</tbody>
						</table>
					</div>

					{/* หมายเหตุ */}
					<div className="mt-6 p-4 bg-yellow-50 rounded-lg w-full">
						<h4 className="font-medium text-yellow-900 mb-2">หมายเหตุ</h4>
						<div className="text-sm text-yellow-700">
							⚠️ ข้อมูลในตารางนี้อาจมีข้อผิดพลาด กรุณาตรวจสอบความถูกต้องก่อนนำไปใช้ | 
							{isSearchMode ? ' ค้นหาจากข้อมูล 30 วันย้อนหลัง | ' : ' '}
							คลิกที่คอลัมน์ต้นทุนแรงงานเพื่อปรับค่า | 
							{!isSearchMode && `สถานะการบันทึก: ${lastSaved ? 'บันทึกแล้ว' : 'ยังไม่บันทึก'}`}
						</div>
					</div>
				</div>
			</div>

			{/* Modal สำหรับปรับค่าแรงงาน */}
			{showModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-medium text-gray-900 mb-4">ใส่ข้อมูนแรงงาน - {selectedItem?.job_name}</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">ค่าแรงต่อวัน (บาท)</label>
									<input type="number" value={laborData.daily_wage} onChange={(e) => setLaborData(prev => ({ ...prev, daily_wage: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="480" />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">จำนวนคน</label>
									<input type="number" value={laborData.worker_count} onChange={(e) => setLaborData(prev => ({ ...prev, worker_count: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1" />
								</div>
								{selectedItem && (
									<div className="bg-gray-50 p-3 rounded-md">
										<h4 className="text-sm font-medium text-gray-700 mb-2">การคำนวณ:</h4>
										<div className="text-xs text-gray-600 space-y-1">
											<div>เวลาที่ใช้: {formatTime(selectedItem.time_used_minutes || 0)}</div>
											<div>Manhour: {formatCurrency(calculateManhour(selectedItem.time_used_minutes, laborData.daily_wage, laborData.worker_count))}</div>
											<div>มูลค่าต่อหน่วยรวม: {formatCurrency(calculateTotalLaborCostPerUnit(selectedItem, laborData.daily_wage, laborData.worker_count))}</div>
										</div>
									</div>
								)}
							</div>
							<div className="flex justify-end space-x-3 mt-6">
								<button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">ยกเลิก</button>
								<button onClick={saveLaborData} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">บันทึก</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal สำหรับปรับค่า % โสหุ้ย */}
			{showOverheadModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-medium text-gray-900 mb-4">ปรับค่า % โสหุ้ย</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">ค่า % โสหุ้ย</label>
									<div className="flex items-center gap-2">
										<input 
											type="number" 
											value={overheadPercentage} 
											onChange={(e) => setOverheadPercentage(Number(e.target.value))}
											className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
											min="0"
											max="100"
											step="0.1"
										/>
										<span className="text-sm text-gray-500">%</span>
									</div>
									<p className="text-xs text-gray-600 mt-1">ค่า % โสหุ้ยจะถูกเพิ่มเข้าไปในต้นทุนแรงงาน</p>
								</div>
							</div>
							<div className="flex justify-end space-x-3 mt-6">
								<button onClick={() => setShowOverheadModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">ยกเลิก</button>
								<button onClick={() => setShowOverheadModal(false)} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">ตกลง</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal สำหรับปรับค่า % ค่าน้ำไฟแก๊ส */}
			{showUtilityModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-medium text-gray-900 mb-4">ปรับค่า % ค่าน้ำไฟแก๊ส</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">ค่า % ค่าน้ำไฟแก๊ส</label>
									<div className="flex items-center gap-2">
										<input 
											type="number" 
											value={utilityPercentage} 
											onChange={(e) => setUtilityPercentage(Number(e.target.value))}
											className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
											min="0"
											max="100"
											step="0.1"
										/>
										<span className="text-sm text-gray-500">%</span>
									</div>
									<p className="text-xs text-gray-600 mt-1">ค่า % ค่าน้ำไฟแก๊สจะถูกเพิ่มเข้าไปในต้นทุนรวม (แรงงาน+โสหุ้ย)</p>
								</div>
							</div>
							<div className="flex justify-end space-x-3 mt-6">
								<button onClick={() => setShowUtilityModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">ยกเลิก</button>
								<button onClick={() => setShowUtilityModal(false)} className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500">ตกลง</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CostReports;
