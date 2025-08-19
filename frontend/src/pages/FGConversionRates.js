import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { costAPI, formatNumber } from '../services/api';
import { RefreshCw, Info } from 'lucide-react';

const FGConversionRates = () => {
	const [loading, setLoading] = useState(false);
	const [conversionRates, setConversionRates] = useState([]);

	// ดึงข้อมูล conversion rates
	const fetchConversionRates = async () => {
		try {
			setLoading(true);
			const response = await costAPI.getFGConversionRates();
			if (response.data.success) {
				setConversionRates(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching conversion rates:', error);
			toast.error('ไม่สามารถดึงข้อมูล conversion rates ได้');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConversionRates();
	}, []);

	const onRefresh = () => {
		fetchConversionRates();
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="card">
				<div className="card-header">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Info size={24} className="text-blue-600" />
							<h1 className="text-2xl font-bold text-gray-900">อัตราส่วนการแปลงหน่วย (Conversion Rates)</h1>
						</div>
						<button
							onClick={onRefresh}
							disabled={loading}
							className="btn btn-secondary flex items-center gap-2"
						>
							<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
							รีเฟรช
						</button>
					</div>
					<p className="text-gray-600 mt-2">
						แสดงข้อมูลอัตราส่วนการแปลงหน่วยจากหน่วยฐาน (กก.) เป็นหน่วยแสดงผลของสินค้าสำเร็จรูป
					</p>
				</div>

				<div className="card-body">
					{/* ตารางแสดงข้อมูล */}
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										รหัสสินค้า
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										ชื่อสินค้า
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										หน่วยฐาน
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										หน่วยแสดงผล
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										อัตราส่วนการแปลง
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										คำอธิบาย
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										ตัวอย่างการแปลง
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{loading ? (
									<tr>
										<td colSpan="7" className="px-4 py-8 text-center text-gray-500">
											กำลังโหลดข้อมูล...
										</td>
									</tr>
								) : conversionRates.length === 0 ? (
									<tr>
										<td colSpan="7" className="px-4 py-8 text-center text-gray-500">
											ไม่พบข้อมูล conversion rates
										</td>
									</tr>
								) : (
									conversionRates.map((item, index) => (
										<tr key={index} className="hover:bg-gray-50">
											<td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{item.FG_Code}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
												{item.FG_Name}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50">
												{item.base_unit}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">
												{item.FG_Unit}
											</td>
											<td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
												{formatNumber(item.conversion_rate, 4)}
											</td>
											<td className="px-4 py-4 text-sm text-gray-900">
												{item.conversion_description || '-'}
											</td>
											<td className="px-4 py-4 text-sm text-gray-600">
												{/* ตัวอย่างการแปลง */}
												{item.conversion_rate === 1 ? (
													<span className="text-gray-400">ไม่มีการแปลง</span>
												) : (
													<span>
														1 {item.FG_Unit} = {formatNumber(item.conversion_rate, 2)} {item.base_unit}
													</span>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* สรุปข้อมูล */}
					{conversionRates.length > 0 && (
						<div className="mt-6 p-4 bg-blue-50 rounded-lg">
							<h3 className="text-lg font-semibold text-blue-900 mb-2">สรุปข้อมูล</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="text-center">
									<div className="text-2xl font-bold text-blue-600">
										{conversionRates.length}
									</div>
									<div className="text-sm text-blue-700">จำนวนสินค้าทั้งหมด</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600">
										{conversionRates.filter(item => item.conversion_rate !== 1).length}
									</div>
									<div className="text-sm text-green-700">สินค้าที่มีการแปลงหน่วย</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-purple-600">
										{conversionRates.filter(item => item.conversion_rate === 1).length}
									</div>
									<div className="text-sm text-purple-700">สินค้าที่ไม่มีการแปลงหน่วย</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default FGConversionRates;
