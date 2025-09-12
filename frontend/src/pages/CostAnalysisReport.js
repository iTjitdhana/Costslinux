import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-hot-toast';
import { Calendar, Loader2 } from 'lucide-react';
import { getPageTitle } from '../config/pageTitles';
import { workplanAPI, costAPI, productionAPI, materialAPI, pricesAPI } from '../services/api';
import DateRangePicker from '../components/DateRangePicker';

// Constants
const FG_STATUS = '1';
const DEFAULT_UNIT = 'กก.';
const PRODUCTION_STATUS = {
	IN_PROGRESS: 'กำลังดำเนินการ',
	COMPLETED: 'เสร็จสิ้น',
	ERROR: 'ข้อผิดพลาด'
};

// Status mapping from status_id to Thai status names
const STATUS_MAPPING = {
	1: 'รอดำเนินการ',      // pending
	2: 'กำลังดำเนินการ',    // in_progress  
	3: 'เสร็จสิ้น',         // completed
	4: 'ยกเลิก',           // cancelled
	5: 'ระงับ',            // suspended
	6: 'รออนุมัติ',        // pending_approval
	7: 'อนุมัติแล้ว',      // approved
	8: 'ปฏิเสธ',           // rejected
	9: 'ยกเลิก',           // force-cancel when status_id = 9
	10: 'ตรวจสอบแล้ว'      // reviewed
};

// Helper Functions
const getProductionStatus = (workplan, productionData, inventoryData) => {
	// ใช้ status_id จาก workplan เป็นหลัก
	if (workplan.status_id && STATUS_MAPPING[workplan.status_id]) {
		return STATUS_MAPPING[workplan.status_id];
	}
	
	// Fallback: ใช้ logic เดิมถ้าไม่มี status_id
	if (productionData && productionData.actual_qty > 0) {
		return PRODUCTION_STATUS.COMPLETED;
	} else if (inventoryData && inventoryData.materials && inventoryData.materials.length > 0) {
		return PRODUCTION_STATUS.COMPLETED;
	}
	
	// Default status
	return PRODUCTION_STATUS.IN_PROGRESS;
};

// แปลงสถานะจาก backend (production_status) เป็นข้อความภาษาไทยสำหรับ UI
const mapBackendStatusToThai = (status) => {
	switch ((status || '').toLowerCase()) {
		case 'completed':
			return 'เสร็จสิ้น';
		case 'in_progress':
			return 'กำลังดำเนินการ';
		case 'cancelled':
			return 'ยกเลิก';
		case 'pending':
		default:
			return 'รอดำเนินการ';
	}
};

const getMaterialPrice = (rawCode, bomDefaultPrices, fallbackPrice, materialPrice) => {
	// ใช้ราคาจาก default_itemvalue เป็นหลัก
	if (bomDefaultPrices[rawCode] && bomDefaultPrices[rawCode] > 0) {
		return bomDefaultPrices[rawCode];
	}
	
	// Fallback 1: ราคาจาก material table
	if (fallbackPrice && parseFloat(fallbackPrice) > 0) {
		return parseFloat(fallbackPrice);
	}
	
	// Fallback 2: ราคาจาก material_price
	if (materialPrice && parseFloat(materialPrice) > 0) {
		return parseFloat(materialPrice);
	}
	
	return 0;
};

const calculatePricePerUnit = (totalCost, totalWeight) => {
	if (totalCost !== null && totalWeight !== null && totalWeight > 0) {
		return totalCost / totalWeight;
	}
	return null;
};

const CostAnalysisReport = () => {
	const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
	const [reportData, setReportData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	
	// Date range state
	const [dateRange, setDateRange] = useState({
		startDate: new Date(),
		endDate: new Date()
	});
	const [useDateRange, setUseDateRange] = useState(false);

	// Handle date range changes
	const handleDateRangeChange = (startDate, endDate) => {
		setDateRange({ startDate, endDate });
	};

	// Load data with date range
	const loadReportWithDateRange = () => {
		if (dateRange.startDate && dateRange.endDate) {
			setUseDateRange(true);
			fetchReportDataWithRange(dateRange.startDate, dateRange.endDate);
		} else {
			toast.error('กรุณาเลือกช่วงวันที่');
		}
	};

	// ฟังก์ชันดึงข้อมูลจริงจาก APIs สำหรับช่วงวันที่
	const fetchReportDataWithRange = async (startDate, endDate) => {
		setLoading(true);
		setError(null);
		try {
			// ดึงข้อมูลสำหรับทุกวันในช่วงที่เลือก
			const promises = [];
			const start = new Date(startDate);
			const end = new Date(endDate);
			
			for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
				const dateStr = d.toISOString().split('T')[0];
				promises.push(fetchReportDataForDate(dateStr));
			}
			
			const allResults = await Promise.all(promises);
			const flattenedResults = allResults.flat();
			
			// เรียงลำดับตาม start_time
			const sortedResults = flattenedResults.sort((a, b) => {
				const timeA = a._rawData?.start_time;
				const timeB = b._rawData?.start_time;
				
				if (!timeA && timeB) return 1;
				if (timeA && !timeB) return -1;
				if (!timeA && !timeB) return a._rawData?.workplanId - b._rawData?.workplanId;
				
				const compareTime = timeA.localeCompare(timeB);
				if (compareTime !== 0) return compareTime;
				
				return a._rawData?.workplanId - b._rawData?.workplanId;
			});
			
			// อัพเดท jobNo ใหม่หลังจากเรียงลำดับ
			const reorderedResults = sortedResults.map((item, index) => ({
				...item,
				jobNo: index + 1
			}));
			
			setReportData(reorderedResults);
			
			if (reorderedResults.length === 0) {
				toast.info('ไม่พบข้อมูลสำหรับช่วงวันที่เลือก');
			} else {
				toast.success(`โหลดข้อมูลสำเร็จ ${reorderedResults.length} รายการ`);
			}
		} catch (error) {
			console.error('Error fetching report data with range:', error);
			setError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
			toast.error(`ไม่สามารถดึงข้อมูลรายงานได้: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	// ฟังก์ชันดึงข้อมูลสำหรับวันที่เดียว
	const fetchReportDataForDate = async (date) => {
		try {
			const workplansRes = await workplanAPI.getByDate(date);
			const workplans = workplansRes.data.data || [];
			
			if (workplans.length === 0) {
				return [];
			}

			const reportPromises = workplans.map(async (workplan, index) => {
				try {
					let bomData = null;
					let costData = null;
					
					// ดึงข้อมูล BOM
					try {
						if (workplan.job_code) {
							try {
								const bomRes = await materialAPI.getBOMByJobCode(workplan.job_code);
								bomData = bomRes.data.data || [];
							} catch (bomByJobError) {
								const bomRes = await materialAPI.getBOM(workplan.job_code);
								bomData = bomRes.data.data || [];
							}
						}
					} catch (bomError) {
						console.log(`Error fetching BOM data for job ${workplan.job_code}:`, bomError.message);
					}
					
					// ดึงข้อมูลต้นทุน
					try {
						const costRes = await costAPI.getSummary({ 
							date: date,
							job_code: workplan.job_code 
						});
						const rows = costRes?.data?.data || [];
						costData = rows.find(r => r.work_plan_id === workplan.id) 
							|| rows.find(r => String(r.job_code) === String(workplan.job_code)) 
							|| null;
					} catch (costError) {
						console.log(`No cost data for job ${workplan.job_code}:`, costError.message);
					}

					// คำนวณต้นทุนตั้งต้นจาก BOM
					let bomTotalCost = null;
					let bomTotalWeight = null;
					
					if (bomData && bomData.length > 0) {
						const bomMatIds = bomData
							.filter(item => item.is_fg !== FG_STATUS)
							.map(item => String(item.Raw_Code))
							.filter(id => id && id.trim() !== '');
						let bomDefaultPrices = {};
						
						if (bomMatIds.length > 0) {
							try {
								const bomPricesRes = await pricesAPI.getLatestBatch(bomMatIds);
								if (bomPricesRes && bomPricesRes.data && Array.isArray(bomPricesRes.data)) {
									bomDefaultPrices = bomPricesRes.data.reduce((acc, price) => {
										if (price && price.material_id && price.price_per_unit !== undefined) {
											acc[String(price.material_id)] = parseFloat(price.price_per_unit) || 0;
										}
										return acc;
									}, {});
								}
							} catch (bomPriceError) {
								console.error('Error loading BOM default prices:', bomPriceError.message);
							}
						}
						
						bomTotalCost = bomData.reduce((total, item) => {
							if (item.is_fg === FG_STATUS) {
								return total;
							}
							
							const qty = parseFloat(item.Raw_Qty) || 0;
							const price = getMaterialPrice(
								String(item.Raw_Code), 
								bomDefaultPrices, 
								item.price, 
								item.material_price
							);
							const itemCost = qty * price;
							
							return total + itemCost;
						}, 0);
						
						bomTotalWeight = bomData.reduce((total, item) => {
							if (item.is_fg === FG_STATUS) {
								return total;
							}
							
							const qty = parseFloat(item.Raw_Qty) || 0;
							return total + qty;
						}, 0);
					}

					let productionStatus = costData?.production_status 
						? mapBackendStatusToThai(costData.production_status) 
						: getProductionStatus(workplan, null, null);

					return {
						jobNo: index + 1,
						jobCode: workplan.job_code || '',
						jobName: workplan.job_name_th || workplan.job_name || '',
						productionStatus: productionStatus,
						totalWeight: bomTotalWeight || null,
						totalPrice: bomTotalCost || null,
						pricePerUnit: calculatePricePerUnit(bomTotalCost, bomTotalWeight),
						producibleCostPerUnit: calculatePricePerUnit(bomTotalCost, bomTotalWeight),
						quantityProduced: null,
						quantityProducedSecondary: 0,
						unit: DEFAULT_UNIT,
						yieldPercent: null,
						timeUsed: costData?.time_used_formatted || null,
						operatorsCount: costData?.operators_count || null,
						actualCostPerUnit: calculatePricePerUnit(bomTotalCost, bomTotalWeight),
						laborCostPerUnit: costData?.labor_cost_per_unit || null,
						laborWithOverheadPerUnit: costData?.labor_with_overhead_per_unit || null,
						totalCostPerUnit: costData?.total_cost_per_unit || null,
						totalProductionCost: costData?.total_production_cost || null,
						_rawData: {
							workplanId: workplan.id,
							jobCode: workplan.job_code,
							start_time: workplan.start_time,
							bomTotalCost,
							bomTotalWeight,
							hasBomData: !!(bomData && bomData.length > 0)
						}
					};
				} catch (itemError) {
					console.error(`Error processing workplan ${workplan.id}:`, itemError);
					return {
						jobNo: index + 1,
						jobCode: workplan.job_code || '',
						jobName: workplan.job_name_th || workplan.job_name || '',
						productionStatus: PRODUCTION_STATUS.ERROR,
						totalWeight: null,
						totalPrice: null,
						pricePerUnit: null,
						producibleCostPerUnit: null,
						quantityProduced: null,
						quantityProducedSecondary: null,
						unit: null,
						yieldPercent: null,
						timeUsed: null,
						operatorsCount: null,
						actualCostPerUnit: null,
						laborCostPerUnit: null,
						laborWithOverheadPerUnit: null,
						totalCostPerUnit: null,
						totalProductionCost: null
					};
				}
			});

			return await Promise.all(reportPromises);
		} catch (error) {
			console.error('Error fetching data for date:', date, error);
			return [];
		}
	};

	// ฟังก์ชันดึงข้อมูลจริงจาก APIs
	const fetchReportData = async (date) => {
		setLoading(true);
		setError(null);
		try {
			// 1. ดึงรายการงานตามวันที่ที่เลือก
			console.log('Fetching workplans for date:', date);
			const workplansRes = await workplanAPI.getByDate(date);
			const workplans = workplansRes.data.data || [];
			console.log('Workplans found:', workplans.length, workplans);
			
			if (workplans.length === 0) {
				setReportData([]);
				return;
			}

			// 2. ดึงข้อมูลต้นทุนและการผลิตสำหรับแต่ละงาน
			const reportPromises = workplans.map(async (workplan, index) => {
				try {
					// ดึงข้อมูลต้นทุนตั้งต้นจาก BOM
					let bomData = null;
					let costData = null;
					
					// ดึงข้อมูล BOM ตั้งต้น (ข้อมูลตามแผน)
					try {
						if (workplan.job_code) {
							console.log(`Trying to fetch BOM for job_code: ${workplan.job_code}`);
							
							// ลองใช้ getBOMByJobCode ก่อน
							try {
								const bomRes = await materialAPI.getBOMByJobCode(workplan.job_code);
								console.log(`BOM API response (by job_code) for ${workplan.job_code}:`, bomRes);
								bomData = bomRes.data.data || [];
								console.log(`BOM data (by job_code) for ${workplan.job_code}:`, bomData);
							} catch (bomByJobError) {
								console.log(`getBOMByJobCode failed, trying getBOM instead:`, bomByJobError.message);
								
								// ถ้าไม่ได้ ลองใช้ getBOM (job_code เป็น fg_code)
								const bomRes = await materialAPI.getBOM(workplan.job_code);
								console.log(`BOM API response (by fg_code) for ${workplan.job_code}:`, bomRes);
								bomData = bomRes.data.data || [];
								console.log(`BOM data (by fg_code) for ${workplan.job_code}:`, bomData);
							}
						} else {
							console.log(`No job_code found for workplan ${workplan.id}`);
						}
					} catch (bomError) {
						console.log(`Error fetching BOM data for job ${workplan.job_code}:`, bomError.message);
						if (bomError.response) {
							console.log('BOM Error response:', bomError.response.data);
						}
					}
					
					// ดึงข้อมูลต้นทุนจาก cost summary (รวม production_status ที่คำนวณจาก logs/finished_flags)
					try {
						const costRes = await costAPI.getSummary({ 
							date: date,
							job_code: workplan.job_code 
						});
						const rows = costRes?.data?.data || [];
						// เลือกแถวที่ตรงกับงานปัจจุบัน โดยใช้ work_plan_id ก่อน ถ้าไม่มีก็ใช้ job_code
						costData = rows.find(r => r.work_plan_id === workplan.id) 
							|| rows.find(r => String(r.job_code) === String(workplan.job_code)) 
							|| null;
					} catch (costError) {
						console.log(`No cost data for job ${workplan.job_code}:`, costError.message);
					}

					// ดึงข้อมูลการผลิตและ Inventory จาก batch ถ้ามี
					let productionData = null;
					let inventoryData = null;
					let batchId = null;
					let actualMaterialCost = null;
					let actualTotalWeight = null;
					
					// ไม่ต้องดึง Inventory data แล้ว เพราะต้องการแสดงเฉพาะต้นทุนจาก BOM
					console.log(`Skipping inventory data for workplan ${workplan.id} (${workplan.job_code}) - using BOM cost only`);

					// คำนวณต้นทุนตั้งต้นจาก BOM
					let bomTotalCost = null;
					let bomTotalWeight = null;
					
					if (bomData && bomData.length > 0) {
						
						// ดึงราคาจาก default_itemvalue สำหรับ BOM items
						// ใช้ Raw_Code ซึ่งเป็น Mat_Id ในการเชื่อมต่อ
						const bomMatIds = bomData
							.filter(item => item.is_fg !== FG_STATUS)
							.map(item => String(item.Raw_Code))
							.filter(id => id && id.trim() !== '');
						let bomDefaultPrices = {};
						
						if (bomMatIds.length > 0) {
							try {
								const bomPricesRes = await pricesAPI.getLatestBatch(bomMatIds);
								
								// Validate API response
								if (bomPricesRes && bomPricesRes.data && Array.isArray(bomPricesRes.data)) {
									bomDefaultPrices = bomPricesRes.data.reduce((acc, price) => {
										if (price && price.material_id && price.price_per_unit !== undefined) {
											acc[String(price.material_id)] = parseFloat(price.price_per_unit) || 0;
										}
										return acc;
									}, {});
									console.log(`BOM default prices loaded for ${Object.keys(bomDefaultPrices).length} materials`);
								} else {
									console.warn('Invalid prices API response structure');
								}
							} catch (bomPriceError) {
								console.error('Error loading BOM default prices:', bomPriceError.message);
							}
						}
						
						bomTotalCost = bomData.reduce((total, item) => {
							// ข้าม FG (finished goods) ไม่นับในต้นทุน
							if (item.is_fg === FG_STATUS) {
								return total;
							}
							
							const qty = parseFloat(item.Raw_Qty) || 0;
							const price = getMaterialPrice(
								String(item.Raw_Code), 
								bomDefaultPrices, 
								item.price, 
								item.material_price
							);
							const itemCost = qty * price;
							
							return total + itemCost;
						}, 0);
						
						bomTotalWeight = bomData.reduce((total, item) => {
							// ข้าม FG (finished goods) ไม่นับในน้ำหนัก
							if (item.is_fg === FG_STATUS) {
								return total;
							}
							
							const qty = parseFloat(item.Raw_Qty) || 0;
							return total + qty;
						}, 0);
						
						console.log(`BOM ${workplan.job_code} - Total Cost: ${bomTotalCost}, Total Weight: ${bomTotalWeight}`);
					} else {
						console.log(`No BOM data found for ${workplan.job_code}`);
					}

					// กำหนดสถานะการผลิต: ใช้ค่าจาก backend ก่อน ถ้าไม่มีค่อย fallback
					let productionStatus = costData?.production_status 
						? mapBackendStatusToThai(costData.production_status) 
						: getProductionStatus(workplan, productionData, inventoryData);
					console.log(`Status for ${workplan.job_code}: status_id=${workplan.status_id}, determined_status=${productionStatus}`);

					const finalData = {
						jobNo: index + 1,
						jobCode: workplan.job_code || '',
						jobName: workplan.job_name_th || workplan.job_name || '',
						productionStatus: productionStatus,
						
						// ข้อมูลต้นทุนตั้งต้นจาก BOM (ต้นทุนการผลิตจาก BOM)
						totalWeight: bomTotalWeight || null,
						totalPrice: bomTotalCost || null,
						pricePerUnit: calculatePricePerUnit(bomTotalCost, bomTotalWeight),
						producibleCostPerUnit: calculatePricePerUnit(bomTotalCost, bomTotalWeight),
						
						// ข้อมูลการผลิตจริง (ถ้ามี)
						quantityProduced: productionData?.actual_qty || null,
						quantityProducedSecondary: productionData?.good_secondary_qty || 0,
						unit: productionData?.unit || DEFAULT_UNIT,
						yieldPercent: bomTotalWeight && productionData?.actual_qty 
							? ((productionData.actual_qty / bomTotalWeight) * 100) : null,
						timeUsed: costData?.time_used_formatted || null,
						operatorsCount: costData?.operators_count || null,
						
						// ต้นทุนต่อหน่วยจาก BOM (ต้นทุนตั้งต้น)
						actualCostPerUnit: calculatePricePerUnit(bomTotalCost, bomTotalWeight),
						
						// ข้อมูลต้นทุนเพิ่มเติม
						laborCostPerUnit: costData?.labor_cost_per_unit || null,
						laborWithOverheadPerUnit: costData?.labor_with_overhead_per_unit || null,
						totalCostPerUnit: costData?.total_cost_per_unit || null,
						totalProductionCost: costData?.total_production_cost || null,
						
						// เก็บข้อมูลดิบเฉพาะที่จำเป็น (รวม start_time สำหรับการเรียงลำดับ)
						_rawData: {
							workplanId: workplan.id,
							jobCode: workplan.job_code,
							start_time: workplan.start_time,
							bomTotalCost,
							bomTotalWeight,
							hasBomData: !!(bomData && bomData.length > 0)
						}
					};

					console.log(`Final data for ${workplan.job_code}: Total Cost: ${finalData.totalPrice}, Total Weight: ${finalData.totalWeight}, Price/Unit: ${finalData.pricePerUnit}`);

					return finalData;
				} catch (itemError) {
					console.error(`Error processing workplan ${workplan.id}:`, itemError);
					return {
						jobNo: index + 1,
						jobCode: workplan.job_code || '',
						jobName: workplan.job_name_th || workplan.job_name || '',
						productionStatus: PRODUCTION_STATUS.ERROR,
						totalWeight: null,
						totalPrice: null,
						pricePerUnit: null,
						producibleCostPerUnit: null,
						quantityProduced: null,
						quantityProducedSecondary: null,
						unit: null,
						yieldPercent: null,
						timeUsed: null,
						operatorsCount: null,
						actualCostPerUnit: null,
						laborCostPerUnit: null,
						laborWithOverheadPerUnit: null,
						totalCostPerUnit: null,
						totalProductionCost: null
					};
				}
			});

			const results = await Promise.all(reportPromises);
			
			// เรียงลำดับตามหน้า Logs: เรียงตาม start_time เป็นหลัก (เหมือน logs API)
			const sortedResults = results.sort((a, b) => {
				// เรียงตาม start_time เป็นหลัก (null ไปท้าย)
				const timeA = a._rawData?.start_time;
				const timeB = b._rawData?.start_time;
				
				if (!timeA && timeB) return 1;
				if (timeA && !timeB) return -1;
				if (!timeA && !timeB) return a._rawData?.workplanId - b._rawData?.workplanId;
				
				// เปรียบเทียบเวลา
				const compareTime = timeA.localeCompare(timeB);
				if (compareTime !== 0) return compareTime;
				
				// ถ้าเวลาเท่ากัน เรียงตาม id
				return a._rawData?.workplanId - b._rawData?.workplanId;
			});
			
			// อัพเดท jobNo ใหม่หลังจากเรียงลำดับ
			const reorderedResults = sortedResults.map((item, index) => ({
				...item,
				jobNo: index + 1
			}));
			
			setReportData(reorderedResults);

		} catch (error) {
			console.error('Error fetching report data:', error);
			setError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
			toast.error(`ไม่สามารถดึงข้อมูลรายงานได้: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	// โหลดข้อมูลเมื่อเปลี่ยนวันที่
	useEffect(() => {
		fetchReportData(reportDate);
	}, [reportDate]);

	// Mockup Data สำหรับ fallback (เก็บไว้ชั่วคราว)
	const mockData = [
		{
			jobNo: 1,
			jobCode: '240057',
			jobName: 'มะม่วงกวน-รสพริกเกลือ (Preserved Mango with Chili Salt)',
			productionStatus: 'เสร็จสิ้น',
			// ต้นทุนการผลิตจาก BOM
			totalWeight: 23.13,
			totalPrice: 1807.26,
			pricePerUnit: 78.13,
			producibleCostPerUnit: null,
			// ต้นทุนการผลิตจริง (Inventory)
			quantityProduced: 100,
			quantityProducedSecondary: 0,
			unit: 'กก.',
			yieldPercent: 432.30,
			timeUsed: '5:28',
			operatorsCount: 1,
			actualCostPerUnit: 8.13,
			// Utilities Cost
			laborCostPerUnit: null,
			laborWithOverheadPerUnit: null,
			totalCostPerUnit: null,
			// Total
			totalProductionCost: null
		},
		{
			jobNo: 2,
			jobCode: '235206R',
			jobName: 'แป้งจุ้ยก๊วย (Repack) (Jui Guay Flour (Repack))',
			productionStatus: 'เสร็จสิ้น',
			// ต้นทุนการผลิตจาก BOM
			totalWeight: 13.71,
			totalPrice: 787.58,
			pricePerUnit: 57.45,
			producibleCostPerUnit: null,
			// ต้นทุนการผลิตจริง (Inventory)
			quantityProduced: 14.58,
			quantityProducedSecondary: 0,
			unit: 'กก.',
			yieldPercent: 106.30,
			timeUsed: '5:44',
			operatorsCount: 1,
			actualCostPerUnit: 54.02,
			// Utilities Cost
			laborCostPerUnit: null,
			laborWithOverheadPerUnit: null,
			totalCostPerUnit: null,
			// Total
			totalProductionCost: null
		},
		{
			jobNo: 3,
			jobCode: '135012',
			jobName: 'น้ำแกงส้ม 450 กรัม (1*5 แพ็ค) (Sour Curry Paste 450g (1*5 packs))',
			productionStatus: 'เสร็จสิ้น',
			// ต้นทุนการผลิตจาก BOM
			totalWeight: 23.13,
			totalPrice: 1807.26,
			pricePerUnit: 78.13,
			producibleCostPerUnit: null,
			// ต้นทุนการผลิตจริง (Inventory)
			quantityProduced: 100,
			quantityProducedSecondary: 0,
			unit: 'กก.',
			yieldPercent: 432.30,
			timeUsed: '5:28',
			operatorsCount: 1,
			actualCostPerUnit: 8.13,
			// Utilities Cost
			laborCostPerUnit: null,
			laborWithOverheadPerUnit: null,
			totalCostPerUnit: null,
			// Total
			totalProductionCost: null
		},
		{
			jobNo: 4,
			jobCode: '235013',
			jobName: 'น้ำจิ้มเมี่ยงคำ (Miang Kham Sauce)',
			productionStatus: 'เสร็จสิ้น',
			// ต้นทุนการผลิตจาก BOM
			totalWeight: 5,
			totalPrice: 350.00,
			pricePerUnit: 70.00,
			producibleCostPerUnit: null,
			// ต้นทุนการผลิตจริง (Inventory)
			quantityProduced: 4.32,
			quantityProducedSecondary: 0,
			unit: 'กก.',
			yieldPercent: 86.40,
			timeUsed: '2:19',
			operatorsCount: 1,
			actualCostPerUnit: 81.02,
			// Utilities Cost
			laborCostPerUnit: null,
			laborWithOverheadPerUnit: null,
			totalCostPerUnit: null,
			// Total
			totalProductionCost: null
		},
		{
			jobNo: 5,
			jobCode: '230004',
			jobName: 'ไส้ไก่จ๋า (Chicken Intestines)',
			productionStatus: 'กำลังดำเนินการ',
			// ต้นทุนการผลิตจาก BOM
			totalWeight: null,
			totalPrice: null,
			pricePerUnit: null,
			producibleCostPerUnit: null,
			// ต้นทุนการผลิตจริง (Inventory)
			quantityProduced: null,
			quantityProducedSecondary: null,
			unit: null,
			yieldPercent: null,
			timeUsed: null,
			operatorsCount: null,
			actualCostPerUnit: null,
			// Utilities Cost
			laborCostPerUnit: null,
			laborWithOverheadPerUnit: null,
			totalCostPerUnit: null,
			// Total
			totalProductionCost: null
		},
		{
			jobNo: 6,
			jobCode: '235007',
			jobName: 'ถั่วลิสงคั่ว/อบ (Roasted/Baked Peanuts)',
			productionStatus: 'กำลังดำเนินการ',
			// ต้นทุนการผลิตจาก BOM
			totalWeight: null,
			totalPrice: null,
			pricePerUnit: null,
			producibleCostPerUnit: null,
			// ต้นทุนการผลิตจริง (Inventory)
			quantityProduced: null,
			quantityProducedSecondary: null,
			unit: null,
			yieldPercent: null,
			timeUsed: null,
			operatorsCount: null,
			actualCostPerUnit: null,
			// Utilities Cost
			laborCostPerUnit: null,
			laborWithOverheadPerUnit: null,
			totalCostPerUnit: null,
			// Total
			totalProductionCost: null
		}
	];

	// Helper functions
	const formatCurrency = (value) => {
		if (value === null || value === undefined) return '-';
		return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	const formatNumber = (value, decimals = 2) => {
		if (value === null || value === undefined) return '-';
		return value.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
	};

	const formatPercentage = (value) => {
		if (value === null || value === undefined) return '-';
		return `${value.toFixed(2)}%`;
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'เสร็จสิ้น':
			case 'ตรวจสอบแล้ว':
			case 'อนุมัติแล้ว':
				return 'bg-green-100 text-green-800';
			case 'กำลังดำเนินการ':
				return 'bg-yellow-100 text-yellow-800';
			case 'ยกเลิก':
			case 'ปฏิเสธ':
				return 'bg-red-100 text-red-800';
			case 'รอดำเนินการ':
			case 'รออนุมัติ':
			case 'รอตรวจสอบ':
				return 'bg-blue-100 text-blue-800';
			case 'ระงับ':
				return 'bg-orange-100 text-orange-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// ฟังก์ชันคำนวณต้นทุนแรงงาน
	const calculateLaborCost = (timeUsed, operatorsCount) => {
		if (!timeUsed || !operatorsCount) return null;
		
		// แปลงเวลาเป็นนาที
		const [hours, minutes] = timeUsed.split(':').map(Number);
		const totalMinutes = hours * 60 + minutes;
		
		// คำนวณต้นทุนแรงงาน
		const laborCostPerMinute = 1; // 480 นาทีต่อวัน
		const totalLaborCost = laborCostPerMinute * totalMinutes * operatorsCount;
		
		return totalLaborCost;
	};

	// ฟังก์ชันคำนวณต้นทุนต่อหน่วย
	const calculateCostPerUnit = (laborCost, quantityProduced) => {
		if (!laborCost || !quantityProduced) return null;
		return laborCost / quantityProduced;
	};

	// ฟังก์ชันคำนวณต้นทุนรวม
	const calculateTotalCost = (actualCostPerUnit, laborCostPerUnit) => {
		if (!actualCostPerUnit || !laborCostPerUnit) return null;
		
		const laborWithOverhead = laborCostPerUnit * 1;
		const totalWithUtility = (actualCostPerUnit + laborWithOverhead) * 1;
		
		return {
			laborWithOverhead,
			totalWithUtility
		};
	};

	return (
		<div className="space-y-6 w-full max-w-none">
			<Helmet>
				<title>{getPageTitle('costAnalysis')}</title>
			</Helmet>
			{/* CSS สำหรับ Basic Table */}
			<style>{`
				.table-container {
					overflow-x: auto;
					max-height: 70vh;
					border: 1px solid #d1d5db;
					border-radius: 0.5rem;
					background: white;
				}

				.data-table {
					border-collapse: collapse;
					width: max-content;
					min-width: 100%;
					background: white;
				}

				.data-table th,
				.data-table td {
					border: 1px solid #d1d5db;
					padding: 12px 8px;
					text-align: left;
					background: white;
					white-space: nowrap;
					vertical-align: middle;
				}

				.data-table th {
					background: #f3f4f6;
					font-weight: 600;
					font-size: 11px;
					line-height: 1.3;
					white-space: normal;
					word-wrap: break-word;
					text-align: center;
					min-height: 60px;
					vertical-align: middle;
				}

				/* Column Headers - ตัวเล็กกว่า Group Headers และเป็นตัวหน้า */
				.data-table thead tr:nth-child(2) th {
					font-size: 16px;
					font-weight: 700;
					line-height: 1.4;
					min-height: 70px;
				}

				/* Group Headers - ใหญ่สุดตัวหนา */
				.data-table thead tr:first-child th {
					font-size: 22px;
					font-weight: 900;
					line-height: 1.2;
					min-height: 80px;
					border-right: 3px solid #374151;
				}

				/* เส้นแนวตั้งหนาระหว่าง Group Headers */
				.data-table thead tr:first-child th:nth-child(4) {
					border-right: 3px solid #374151;
				}

				.data-table thead tr:first-child th:nth-child(8) {
					border-right: 3px solid #374151;
				}

				.data-table thead tr:first-child th:nth-child(15) {
					border-right: 3px solid #374151;
				}

				.data-table thead tr:first-child th:nth-child(18) {
					border-right: 3px solid #374151;
				}

				/* เส้นแนวตั้งหนาในข้อมูล */
				.data-table td:nth-child(4),
				.data-table td:nth-child(8),
				.data-table td:nth-child(15),
				.data-table td:nth-child(18) {
					border-right: 3px solid #374151;
				}

				/* เส้นแนวตั้งหนาใน Column Headers */
				.data-table thead tr:nth-child(2) th:nth-child(4),
				.data-table thead tr:nth-child(2) th:nth-child(8),
				.data-table thead tr:nth-child(2) th:nth-child(15),
				.data-table thead tr:nth-child(2) th:nth-child(18) {
					border-right: 3px solid #374151;
				}

				/* ข้อมูลเนื้อหา - เล็กกว่า Column Headers เป็นตัวธรรมดา */
				.data-table tbody td {
					font-size: 14px;
					font-weight: 400;
					line-height: 1.3;
				}

				/* Fixed width columns - เพิ่มความกว้างให้มากขึ้น */
				.data-table th:nth-child(1),
				.data-table td:nth-child(1) {
					width: 80px;
					min-width: 80px;
					max-width: 80px;
				}

				.data-table th:nth-child(2),
				.data-table td:nth-child(2) {
					width: 120px;
					min-width: 120px;
					max-width: 120px;
				}

				.data-table th:nth-child(3),
				.data-table td:nth-child(3) {
					width: 350px;
					min-width: 350px;
					max-width: 350px;
				}

				.data-table th:nth-child(4),
				.data-table td:nth-child(4) {
					width: 180px;
					min-width: 180px;
					max-width: 180px;
				}

				/* คอลัมน์ที่ 5-19 ให้มีความกว้างที่เหมาะสม */
				.data-table th:nth-child(5),
				.data-table td:nth-child(5) {
					width: 150px;
					min-width: 150px;
				}

				.data-table th:nth-child(6),
				.data-table td:nth-child(6) {
					width: 120px;
					min-width: 120px;
				}

				.data-table th:nth-child(7),
				.data-table td:nth-child(7) {
					width: 180px;
					min-width: 180px;
				}

				.data-table th:nth-child(8),
				.data-table td:nth-child(8) {
					width: 200px;
					min-width: 200px;
				}

				.data-table th:nth-child(9),
				.data-table td:nth-child(9) {
					width: 150px;
					min-width: 150px;
				}

				.data-table th:nth-child(10),
				.data-table td:nth-child(10) {
					width: 150px;
					min-width: 150px;
				}

				.data-table th:nth-child(11),
				.data-table td:nth-child(11) {
					width: 80px;
					min-width: 80px;
				}

				.data-table th:nth-child(12),
				.data-table td:nth-child(12) {
					width: 100px;
					min-width: 100px;
				}

				.data-table th:nth-child(13),
				.data-table td:nth-child(13) {
					width: 150px;
					min-width: 150px;
				}

				.data-table th:nth-child(14),
				.data-table td:nth-child(14) {
					width: 120px;
					min-width: 120px;
				}

				.data-table th:nth-child(15),
				.data-table td:nth-child(15) {
					width: 200px;
					min-width: 200px;
				}

				.data-table th:nth-child(16),
				.data-table td:nth-child(16) {
					width: 150px;
					min-width: 150px;
				}

				.data-table th:nth-child(17),
				.data-table td:nth-child(17) {
					width: 200px;
					min-width: 200px;
				}

				.data-table th:nth-child(18),
				.data-table td:nth-child(18) {
					width: 180px;
					min-width: 180px;
				}

				.data-table th:nth-child(19),
				.data-table td:nth-child(19) {
					width: 200px;
					min-width: 200px;
				}

				/* Status badge */
				.status-badge {
					padding: 4px 8px;
					border-radius: 9999px;
					font-size: 12px;
					font-weight: 500;
					white-space: nowrap;
				}

				/* Hover effects */
				.data-table tbody tr:hover td {
					background-color: #f3f4f6;
				}

				/* จัดรูปแบบข้อมูลตามประเภท */
				.data-table td.text-center {
					text-align: center !important;
				}

				.data-table td.text-right {
					text-align: right !important;
				}

				.data-table td.text-left {
					text-align: left !important;
				}
			`}</style>

			<div className="card w-full">
				<div className="card-header flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">รายงานวิเคราะห์ต้นทุนการผลิต</h1>
						<p className="text-gray-600">รายงานต้นทุนการผลิตแยกตามประเภทและรายละเอียด</p>
					</div>
				</div>

				<div className="card-body space-y-4 w-full">
					{/* ตัวกรองและตัวควบคุม */}
					<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
						{/* วันที่ - Single Date */}
						<div className="flex items-center gap-2">
							<Calendar size={16} className="text-gray-500" />
							<label className="text-sm font-medium text-gray-700 whitespace-nowrap">วันที่:</label>
							<input 
								type="date" 
								value={reportDate}
								onChange={(e) => setReportDate(e.target.value)}
								className="input"
								disabled={loading}
							/>
							<span className="text-xs text-gray-500">เรียงลำดับตามหน้า Logs</span>
						</div>

						{/* Date Range Picker */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-gray-700 whitespace-nowrap">ช่วงวันที่:</label>
							<DateRangePicker
								startDate={dateRange.startDate}
								endDate={dateRange.endDate}
								onStartDateChange={(date) => handleDateRangeChange(date, dateRange.endDate)}
								onEndDateChange={(date) => handleDateRangeChange(dateRange.startDate, date)}
								placeholder="เลือกช่วงวันที่"
								className="w-80"
								disabled={loading}
							/>
							<button
								onClick={loadReportWithDateRange}
								disabled={loading || !dateRange.startDate || !dateRange.endDate}
								className="btn btn-primary text-sm px-4"
							>
								โหลดข้อมูล
							</button>
						</div>
						
						{/* สถานะและปุ่ม refresh */}
						<div className="flex items-center gap-2">
							{reportData.length > 0 && (
								<span className="text-sm text-gray-600">
									พบ {reportData.length} รายการ
								</span>
							)}
							<button
								onClick={() => fetchReportData(reportDate)}
								disabled={loading}
								className="btn btn-outline btn-sm flex items-center gap-2"
							>
								<Loader2 size={16} className={loading ? "animate-spin" : "hidden"} />
								รีเฟรช
							</button>
						</div>
					</div>

					{/* ตารางรายงาน */}
					<div className="table-container">
						<table className="data-table">
							<thead>
								{/* แถวหัวข้อกลุ่มใหญ่ */}
								<tr>
									<th colSpan="4" className="text-center text-sm font-bold text-gray-700">
										รายการผลิตสินค้า
									</th>
									<th colSpan="4" className="text-center text-sm font-bold text-gray-700">
										ต้นทุนการผลิตจาก BOM
									</th>
									<th colSpan="7" className="text-center text-sm font-bold text-green-700 bg-green-50">
										ต้นทุนการผลิตจริง
									</th>
									<th colSpan="3" className="text-center text-sm font-bold text-orange-700 bg-orange-50">
										คำนวณต้นทุน
									</th>
									<th colSpan="1" className="text-center text-sm font-bold text-gray-700 bg-white border-2 border-gray-400">
										มูลค่าต้นทุนรวม
									</th>
								</tr>
								{/* แถวหัวข้อย่อย */}
								<tr>
									<th>งานที่</th>
									<th>รหัสงาน</th>
									<th>ชื่องาน</th>
									<th>สถานะ</th>
									{/* ต้นทุนการผลิตจาก BOM (4 คอลัมน์) */}
									<th>น้ำหนักรวม (กก.)</th>
									<th>ราคารวม</th>
									<th>ราคา/หน่วย (บาท/กก.)</th>
									<th>ต้นทุน/หน่วย (บาท)</th>
									{/* ต้นทุนการผลิตจริง (7 คอลัมน์) */}
									<th>จำนวนผลิต (กก.)</th>
									<th>จำนวนผลิต</th>
									<th>หน่วย</th>
									<th>% Yield</th>
									<th>เวลาที่ใช้</th>
									<th>จำนวนคน</th>
									<th>ต้นทุน/หน่วย (บาท)</th>
									{/* คำนวณต้นทุน (3 คอลัมน์) */}
									<th>ต้นทุน/หน่วย (บาท)</th>
									<th>ต้นทุน + โสหุ้ย</th>
									<th>ต้นทุน + โสหุ้ย + น้ำไฟแก๊ส</th>
									{/* มูลค่าต้นทุนรวม (1 คอลัมน์) */}
									<th>มูลค่ารวม</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan="19" className="text-center py-8">
											<div className="flex items-center justify-center gap-2">
												<Loader2 className="animate-spin" size={20} />
												<span>กำลังโหลดข้อมูล...</span>
											</div>
										</td>
									</tr>
								) : error ? (
									<tr>
										<td colSpan="19" className="text-center py-8 text-red-600">
											<div className="flex flex-col items-center gap-2">
												<span>เกิดข้อผิดพลาด: {error}</span>
												<button 
													onClick={() => fetchReportData(reportDate)}
													className="text-blue-600 hover:text-blue-800 underline text-sm"
												>
													ลองใหม่
												</button>
											</div>
										</td>
									</tr>
								) : reportData.length === 0 ? (
									<tr>
										<td colSpan="19" className="text-center py-8 text-gray-500">
											ไม่พบข้อมูลการผลิตสำหรับวันที่ {new Date(reportDate).toLocaleDateString('th-TH')}
										</td>
									</tr>
								) : (
									reportData.map((item, index) => {
									const laborCost = calculateLaborCost(item.timeUsed, item.operatorsCount);
									const laborCostPerUnit = calculateCostPerUnit(laborCost, item.quantityProduced);
									const totalCost = calculateTotalCost(item.actualCostPerUnit, laborCostPerUnit);
									
									return (
										<tr key={index} className="hover:bg-gray-50">
											<td style={{textAlign: 'left'}}>{item.jobNo}</td>
											<td style={{textAlign: 'left'}}>{item.jobCode}</td>
											<td style={{textAlign: 'left'}} title={item.jobName}>{item.jobName}</td>
											<td style={{textAlign: 'center'}}>
												<span className={`status-badge ${getStatusColor(item.productionStatus)}`}>
													{item.productionStatus}
												</span>
											</td>
											<td style={{textAlign: 'center'}}>{item.totalWeight !== null ? formatNumber(item.totalWeight, 2) : '-'}</td>
											<td style={{textAlign: 'right'}}>{item.totalPrice !== null ? formatCurrency(item.totalPrice) : '-'}</td>
											<td style={{textAlign: 'right'}}>{item.pricePerUnit !== null ? formatCurrency(item.pricePerUnit) : '-'}</td>
											<td style={{textAlign: 'right'}}>{item.actualCostPerUnit !== null ? formatCurrency(item.actualCostPerUnit) : '-'}</td>
											<td style={{textAlign: 'center'}}>{item.quantityProduced !== null ? formatNumber(item.quantityProduced, 2) : '-'}</td>
											<td style={{textAlign: 'center'}}>{item.quantityProducedSecondary !== null ? formatNumber(item.quantityProducedSecondary, 2) : '-'}</td>
											<td style={{textAlign: 'center'}}>{item.unit || '-'}</td>
											<td style={{textAlign: 'center'}}>{item.yieldPercent !== null ? formatPercentage(item.yieldPercent) : '-'}</td>
											<td style={{textAlign: 'center'}}>{item.timeUsed || '-'}</td>
											<td style={{textAlign: 'center'}}>{item.operatorsCount !== null ? item.operatorsCount : '-'}</td>
											<td style={{textAlign: 'right'}}>{item.actualCostPerUnit !== null ? formatCurrency(item.actualCostPerUnit) : '-'}</td>
											<td style={{textAlign: 'right'}}>{laborCostPerUnit !== null ? formatCurrency(laborCostPerUnit) : '-'}</td>
											<td style={{textAlign: 'right'}}>{totalCost ? formatCurrency(totalCost.laborWithOverhead) : '-'}</td>
											<td style={{textAlign: 'right'}}>{totalCost ? formatCurrency(totalCost.totalWithUtility) : '-'}</td>
											<td style={{textAlign: 'right'}}>
												{totalCost && item.quantityProduced 
													? formatCurrency(totalCost.totalWithUtility * item.quantityProduced) 
													: '-'}
											</td>
										</tr>
									);
									})
								)}
							</tbody>
						</table>
					</div>

				</div>
			</div>
		</div>
	);
};

export default CostAnalysisReport;
