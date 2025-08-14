import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { costAPI } from '../services/api';
import { Clock, RefreshCw, Database } from 'lucide-react';

const LogsTest = () => {
	const [loading, setLoading] = useState(false);
	const [logsData, setLogsData] = useState([]);
	const [batchTimeData, setBatchTimeData] = useState([]);

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

	useEffect(() => {
		loadLogsData();
	}, []);

	return (
		<div className="space-y-6">
			<div className="card">
				<div className="card-header">
					<h1 className="text-2xl font-bold text-gray-900">ทดสอบการดึงข้อมูล Logs</h1>
					<p className="text-gray-600">
						ทดสอบการดึงข้อมูลจากตาราง logs และคำนวณเวลาที่ใช้
					</p>
				</div>
				<div className="card-body space-y-6">
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
													}`}>
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
