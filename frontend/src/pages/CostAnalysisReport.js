import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

const CostAnalysisReport = () => {
	const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

	// Mockup Data ตามตัวอย่างในภาพ
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
				return 'bg-green-100 text-green-800';
			case 'กำลังดำเนินการ':
				return 'bg-yellow-100 text-yellow-800';
			case 'ยกเลิก':
				return 'bg-red-100 text-red-800';
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
						{/* วันที่ */}
						<div className="flex items-center gap-2">
							<Calendar size={16} className="text-gray-500" />
							<label className="text-sm font-medium text-gray-700 whitespace-nowrap">วันที่:</label>
							<input 
								type="date" 
								value={reportDate}
								onChange={(e) => setReportDate(e.target.value)}
								className="input"
							/>
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
								{mockData.map((item, index) => {
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
								})}
							</tbody>
						</table>
					</div>

					{/* ข้อความแนะนำการใช้งาน */}
					<div className="mt-4 p-3 bg-blue-50 rounded-lg">
						<div className="flex items-center gap-2 text-sm text-blue-800">
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
							</svg>
							<span><strong>คำแนะนำ:</strong> ใช้แถบเลื่อนด้านล่างเพื่อดูข้อมูลทั้งหมดในตาราง</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CostAnalysisReport;
