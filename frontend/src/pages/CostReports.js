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
	
	// State สำหรับค่าโสหุ้ย
	const [overheadPercentage, setOverheadPercentage] = useState(10); // Default 10%
	
	// State สำหรับค่าน้ำไฟแก๊ส
	const [utilityPercentage, setUtilityPercentage] = useState(5); // Default 5%

	const reportDate = watch('report_date');

	// ฟังก์ชันแปลงนาทีเป็นรูปแบบ ชั่วโมง:นาที
	const formatTime = (minutes) => {
		if (!minutes || minutes === 0) return '0:00';
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}:${mins.toString().padStart(2, '0')}`;
	};

	// ฟังก์ชันคำนวณ Manhour
	const calculateManhour = (timeUsedMinutes, dailyWage, workerCount) => {
		console.log('Debug - Input values:', { timeUsedMinutes, dailyWage, workerCount });
		
		if (!timeUsedMinutes || timeUsedMinutes === 0 || !dailyWage || !workerCount) {
			console.log('Debug - Returning 0 due to invalid input');
			return 0;
		}
		
		// หักเวลาพัก 45 นาที ถ้าผ่านช่วง 12:30-13:15
		let adjustedTime = timeUsedMinutes;
		// TODO: เพิ่มการตรวจสอบช่วงเวลาพัก
		
		// คำนวณ Manhour = (ค่าแรงต่อวัน × จำนวนคน) ÷ 480 × (เวลาที่ใช้ - เวลาพัก) ÷ 24
		const manhour = (dailyWage * workerCount / 480) * (adjustedTime / 24);
		console.log('Debug - Manhour calculation:', { dailyWage, workerCount, adjustedTime, manhour });
		
		return isNaN(manhour) ? 0 : manhour;
	};

	// ฟังก์ชันคำนวณมูลค่าต่อหน่วยรวมต้นทุนแรงงาน
	const calculateTotalLaborCostPerUnit = (item, dailyWage, workerCount) => {
		console.log('Debug - Item data:', item);
		
		const totalMaterialCost = Number(item.total_material_cost) || 0;
		const productionQty = Number(item.good_qty) || 0;
		const manhour = calculateManhour(item.time_used_minutes, dailyWage, workerCount);
		
		console.log('Debug - Calculation values:', { totalMaterialCost, productionQty, manhour });
		
		if (productionQty === 0) {
			console.log('Debug - Production quantity is 0, returning 0');
			return 0;
		}
		
		// มูลค่าต่อหน่วยในต้นทุนที่ผลิตได้
		const productionCostPerUnit = totalMaterialCost / productionQty;
		// ต้นทุนแรงงานต่อหน่วย
		const laborCostPerUnit = manhour / productionQty;
		// มูลค่าต่อหน่วยรวมต้นทุนแรงงาน
		const totalCost = productionCostPerUnit + laborCostPerUnit;
		
		console.log('Debug - Final calculation:', { productionCostPerUnit, laborCostPerUnit, totalCost });
		
		return isNaN(totalCost) ? productionCostPerUnit : totalCost;
	};

	// ฟังก์ชันคำนวณมูลค่าต่อหน่วยรวมต้นทุนแรงงาน+ค่าโสหุ้ย
	const calculateTotalCostWithOverhead = (laborCostPerUnit, overheadPercent) => {
		if (!laborCostPerUnit || laborCostPerUnit === 0) return 0;
		
		const overheadAmount = laborCostPerUnit * (overheadPercent / 100);
		const totalCost = laborCostPerUnit + overheadAmount;
		
		return isNaN(totalCost) ? laborCostPerUnit : totalCost;
	};

	// ฟังก์ชันคำนวณมูลค่าต่อหน่วยรวมต้นทุนแรงงาน+ค่าโสหุ้ย+ค่าน้ำไฟแก๊ส
	const calculateTotalCostWithOverheadAndUtility = (laborCostPerUnit, overheadPercent, utilityPercent) => {
		if (!laborCostPerUnit || laborCostPerUnit === 0) return 0;
		
		const overheadAmount = laborCostPerUnit * (overheadPercent / 100);
		const utilityAmount = laborCostPerUnit * (utilityPercent / 100);
		const totalCost = laborCostPerUnit + overheadAmount + utilityAmount;
		
		return isNaN(totalCost) ? laborCostPerUnit : totalCost;
	};

	// ฟังก์ชันเปิด popup
	const openLaborModal = (item) => {
		setSelectedItem(item);
		setShowModal(true);
	};

	// ฟังก์ชันบันทึกข้อมูนแรงงาน
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
			
			// คำนวณ Yield % สำหรับแต่ละรายการ
			const processedData = data.map(item => ({
				...item,
				yield_percent: item.total_material_qty > 0 ? 
					((item.good_qty || 0) / item.total_material_qty) * 100 : 0
			}));
			
			setReportData(processedData);
			
			// คำนวณสรุป
			const totalBatches = processedData.length;
			const totalMaterialCost = processedData.reduce((sum, item) => sum + (item.total_material_cost || 0), 0);
			const totalProduction = processedData.reduce((sum, item) => sum + (item.good_qty || 0), 0);
			const averageYield = totalBatches > 0 ? 
				(processedData.reduce((sum, item) => sum + (item.yield_percent || 0), 0) / totalBatches) : 0;
			
			setSummary({
				total_batches: totalBatches,
				total_material_cost: totalMaterialCost,
				total_production: totalProduction,
				average_yield: averageYield
			});
		} catch (error) {
			console.error(error);
			toast.error('โหลดรายงานไม่สำเร็จ');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (reportDate) {
			loadReport(reportDate);
		}
	}, [reportDate]);

	const onExport = () => {
		// TODO: Implement export functionality
		toast.success('ส่งออกรายงานสำเร็จ');
	};

	const onRefresh = () => {
		loadReport(reportDate);
	};

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h1 className="text-2xl font-bold text-gray-900">ตารางต้นทุนการผลิต</h1>
					<p className="text-gray-600">
						บันทึกและวิเคราะห์ต้นทุนการผลิตรายวัน - วันที่ {formatDate(reportDate)}
					</p>
				</div>
				<div className="card-body space-y-4">
					{/* ตัวกรองและปุ่มควบคุม */}
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Calendar size={16} className="text-gray-500" />
								<label className="text-sm font-medium text-gray-700">วันที่:</label>
								<input
									type="date"
									className="input"
									{...register('report_date')}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-gray-700">ค่าโสหุ้ย:</label>
								<input
									type="number"
									value={overheadPercentage}
									onChange={(e) => setOverheadPercentage(Number(e.target.value))}
									className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
									min="0"
									max="100"
									step="0.1"
								/>
								<span className="text-sm text-gray-600">%</span>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-gray-700">ค่าน้ำไฟแก๊ส:</label>
								<input
									type="number"
									value={utilityPercentage}
									onChange={(e) => setUtilityPercentage(Number(e.target.value))}
									className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
									min="0"
									max="100"
									step="0.1"
								/>
								<span className="text-sm text-gray-600">%</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={onRefresh}
								disabled={loading}
								className="btn btn-secondary flex items-center gap-2"
							>
								<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
								รีเฟรช
							</button>
							<button
								onClick={onExport}
								className="btn btn-primary flex items-center gap-2"
							>
								<Download size={16} />
								ส่งออก
							</button>
						</div>
					</div>

					{/* สรุปข้อมูน */}
					{/* ลบส่วนสรุปข้อมูนออก */}

					{/* ตารางรายงาน */}
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								{/* แถวหัวข้อกลุ่มใหญ่ */}
								<tr>
									<th colSpan="4" className="px-4 py-2 text-center text-xs font-semibold text-gray-700">ข้อมูนทั่วไป</th>
									<th colSpan="3" className="px-4 py-2 text-center text-xs font-semibold text-red-700 bg-red-50">ต้นทุนวัตถุดิบตั้งต้น</th>
									<th colSpan="3" className="px-4 py-2 text-center text-xs font-semibold text-yellow-700 bg-yellow-50">ผลการผลิต</th>
									<th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-green-700 bg-green-50">ต้นทุนที่ผลิตได้</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-blue-700 bg-blue-50">ต้นทุนแรงงาน</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-purple-700 bg-purple-50">ต้นทุนแรงงาน+โสหุ้ย</th>
									<th colSpan="1" className="px-4 py-2 text-center text-xs font-semibold text-orange-700 bg-orange-50">ต้นทุนรวม</th>
								</tr>
								<tr>
									{/* ข้อมูนทั่วไป */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">งานที่</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสงาน</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่องาน</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะการผลิต</th>
									{/* ต้นทุนวัตถุดิบตั้งต้น */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-100">จำนวนวัตถุดิบรวม</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-100">หน่วย</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-100">ราคารวม</th>
									{/* ผลการผลิต */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">จำนวนผลิตได้</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">% Yield</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-100">เวลาที่ใช้ (ชั่วโมง:นาที)</th>
									{/* ต้นทุนที่ผลิตได้ */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-100">มูลค่าต่อหน่วย</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-100">หน่วย</th>
									{/* ต้นทุนแรงงาน */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-100">ต้นทุนแรงงาน/หน่วย</th>
									{/* ต้นทุนแรงงาน+โสหุ้ย */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-100">ต้นทุนแรงงาน+โสหุ้ย/หน่วย</th>
									{/* ต้นทุนรวม */}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-100">ต้นทุนรวม/หน่วย</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{loading ? (
									<tr>
										<td colSpan="15" className="px-4 py-8 text-center text-gray-500">
											กำลังโหลดข้อมูน...
										</td>
									</tr>
								) : reportData.length === 0 ? (
									<tr>
										<td colSpan="15" className="px-4 py-8 text-center text-gray-500">
											ไม่พบงานในวันที่เลือก
										</td>
									</tr>
								) : (
									reportData.map((item, index) => (
										<tr key={item.batch_id} className="hover:bg-gray-50">
											{/* ข้อมูนทั่วไป */}
											<td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{index + 1}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
												{item.job_code}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
												{item.job_name}
											</td>
											<td className="px-4 py-4 whitespace-nowrap">
												<span className={`px-2 py-1 text-xs font-medium rounded-full ${
													item.status === 'completed' 
														? 'bg-green-100 text-green-800' 
														: 'bg-yellow-100 text-yellow-800'
												}`}>
													{item.status === 'completed' ? 'เสร็จสิ้น' : item.status}
												</span>
											</td>
											
											{/* ต้นทุนวัตถุดิบตั้งต้น */}
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">
												{formatNumber(item.total_material_qty || 0, 2)}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">
												{item.unit || 'กก.'}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">
												{formatCurrency(item.total_material_cost || 0)}
											</td>
											
											{/* ผลการผลิต */}
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">
												{formatNumber(item.good_qty || 0, 2)}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">
												{formatNumber(item.yield_percent || 0, 1)}%
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-50">
												{formatTime(item.time_used_minutes || 0)}
											</td>
											
											{/* ต้นทุนที่ผลิตได้ */}
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">
												{formatCurrency((item.total_material_cost || 0) / (item.good_qty || 1))}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">
												{item.unit || 'กก.'}
											</td>

											{/* ต้นทุนแรงงาน */}
											<td 
												className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50 cursor-pointer hover:bg-blue-100"
												onClick={() => openLaborModal(item)}
											>
												{calculatedLaborCost[item.batch_id] ? 
													formatCurrency(calculatedLaborCost[item.batch_id].total_cost_per_unit) :
													<span className="text-blue-600 hover:text-blue-800">คลิกเพื่อคำนวณ</span>
												}
											</td>

											{/* ต้นทุนแรงงาน+โสหุ้ย */}
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50">
												{calculatedLaborCost[item.batch_id] ? 
													formatCurrency(calculateTotalCostWithOverhead(calculatedLaborCost[item.batch_id].total_cost_per_unit, overheadPercentage)) :
													<span className="text-gray-400">-</span>
												}
											</td>

											{/* ต้นทุนรวม */}
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-orange-50">
												{calculatedLaborCost[item.batch_id] ? 
													formatCurrency(calculateTotalCostWithOverheadAndUtility(calculatedLaborCost[item.batch_id].total_cost_per_unit, overheadPercentage, utilityPercentage)) :
													<span className="text-gray-400">-</span>
												}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* หมายเหตุ */}
					<div className="mt-6 p-4 bg-gray-50 rounded-lg">
						<h4 className="font-medium text-gray-900 mb-2">หมายเหตุ:</h4>
						<p className="text-sm text-gray-600">
							⚠️ ข้อมูลในตารางนี้อาจมีข้อผิดพลาด กรุณาตรวจสอบความถูกต้องก่อนนำไปใช้ในการตัดสินใจ
						</p>
					</div>
				</div>
			</div>

			{/* Modal สำหรับใส่ข้อมูนแรงงาน */}
			{showModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-medium text-gray-900 mb-4">
								ใส่ข้อมูนแรงงาน - {selectedItem?.job_name}
							</h3>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										ค่าแรงต่อวัน (บาท)
									</label>
									<input
										type="number"
										value={laborData.daily_wage}
										onChange={(e) => setLaborData(prev => ({ ...prev, daily_wage: Number(e.target.value) }))}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="480"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										จำนวนคน
									</label>
									<input
										type="number"
										value={laborData.worker_count}
										onChange={(e) => setLaborData(prev => ({ ...prev, worker_count: Number(e.target.value) }))}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="1"
									/>
								</div>

								{/* แสดงการคำนวณตัวอย่าง */}
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
								<button
									onClick={() => setShowModal(false)}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
								>
									ยกเลิก
								</button>
								<button
									onClick={saveLaborData}
									className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									บันทึก
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CostReports;
