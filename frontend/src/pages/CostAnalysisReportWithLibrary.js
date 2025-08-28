import React, { useState, useMemo } from 'react';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const CostAnalysisReportWithLibrary = () => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [overheadPercentage, setOverheadPercentage] = useState(10);
  const [utilityPercentage, setUtilityPercentage] = useState(5);
  const [dailyWage, setDailyWage] = useState(480);

  // Mockup Data
  const mockData = [
    {
      jobNo: 1,
      jobCode: '240057',
      jobName: 'มะม่วงกวน-รสพริกเกลือ (Preserved Mango with Chili Salt)',
      productionStatus: 'เสร็จสิ้น',
      totalWeight: 23.13,
      totalPrice: 1807.26,
      pricePerUnit: 78.13,
      quantityProduced: 100,
      unit: 'กก.',
      yieldPercent: 432.30,
      timeUsed: '5:28',
      operatorsCount: 1,
      actualCostPerUnit: 8.13,
    },
    // ... เพิ่มข้อมูลอื่นๆ
  ];

  const columnHelper = createColumnHelper();

  const columns = useMemo(
    () => [
      columnHelper.accessor('jobNo', {
        header: 'งานที่ (Job No.)',
        cell: info => info.getValue(),
        size: 60,
        sticky: 'left',
      }),
      columnHelper.accessor('jobCode', {
        header: 'รหัสงาน (Job Code)',
        cell: info => info.getValue(),
        size: 80,
        sticky: 'left',
      }),
      columnHelper.accessor('jobName', {
        header: 'ชื่องาน (Job Name)',
        cell: info => (
          <div className="truncate" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
        size: 200,
        sticky: 'left',
      }),
      columnHelper.accessor('productionStatus', {
        header: 'สถานะการผลิต',
        cell: info => (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            info.getValue() === 'เสร็จสิ้น' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {info.getValue()}
          </span>
        ),
        size: 120,
        sticky: 'left',
      }),
      columnHelper.accessor('totalWeight', {
        header: 'น้ำหนักรวม (กก.)',
        cell: info => info.getValue()?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '-',
        size: 120,
      }),
      // ... เพิ่มคอลัมน์อื่นๆ
    ],
    []
  );

  const table = useReactTable({
    data: mockData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  });

  return (
    <div className="space-y-6 w-full max-w-none">
      <style>{`
        .table-container {
          overflow: auto;
          max-height: 70vh;
          border: 1px solid #d1d5db;
        }
        
        .table {
          border-collapse: collapse;
          width: 100%;
        }
        
        .table th,
        .table td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
          background: white;
        }
        
        .table th {
          background: #f3f4f6;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .table th[data-sticky="left"] {
          position: sticky;
          left: 0;
          z-index: 20;
        }
        
        .table td[data-sticky="left"] {
          position: sticky;
          left: 0;
          z-index: 5;
        }
      `}</style>

      <div className="card w-full">
        <div className="card-header flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานวิเคราะห์ต้นทุนการผลิต (React Table)</h1>
            <p className="text-gray-600">ใช้ React Table Library สำหรับการจัดการตาราง</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary flex items-center gap-2">
              <Download size={16} />
              ส่งออก
            </button>
          </div>
        </div>

        <div className="card-body space-y-4">
          {/* Controls */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <label className="text-sm font-medium text-gray-700">วันที่:</label>
              <input 
                type="date" 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="input"
              />
              <button className="btn btn-primary flex items-center gap-2">
                <RefreshCw size={16} />
                โหลดข้อมูล
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        data-sticky={header.column.columnDef.sticky}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        data-sticky={cell.column.columnDef.sticky}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span><strong>หมายเหตุ:</strong> ตัวอย่างนี้ใช้ React Table Library ซึ่งจัดการเรื่อง z-index และ sticky positioning ได้ดีกว่า</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysisReportWithLibrary;
