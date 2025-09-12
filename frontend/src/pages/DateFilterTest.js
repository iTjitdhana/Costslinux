import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const DateFilterTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [testData, setTestData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Sample data สำหรับทดสอบ
  const sampleData = [
    { id: 1, job_code: '235032', production_date: '2025-07-02', work_name: 'งานทดสอบ 1' },
    { id: 2, job_code: '235265', production_date: '2025-07-03', work_name: 'งานทดสอบ 2' },
    { id: 3, job_code: '119111', production_date: '2025-07-04', work_name: 'งานทดสอบ 3' },
    { id: 4, job_code: '235191R', production_date: '2025-07-05', work_name: 'งานทดสอบ 4' },
    { id: 5, job_code: '235013', production_date: '2025-07-06', work_name: 'งานทดสอบ 5' },
    { id: 6, job_code: '230060-D2', production_date: '2025-07-07', work_name: 'งานทดสอบ 6' },
    { id: 7, job_code: 'temp-002', production_date: '2025-07-08', work_name: 'งานทดสอบ 7' },
    { id: 8, job_code: '305024R', production_date: '2025-08-01', work_name: 'งานทดสอบ 8' },
    { id: 9, job_code: '235070', production_date: '2025-08-02', work_name: 'งานทดสอบ 9' },
    { id: 10, job_code: '304011R', production_date: '2025-08-03', work_name: 'งานทดสอบ 10' }
  ];

  const handleRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    
    if (startDate && endDate) {
      // ทำการ filter เหมือนใน LogsTest.js
      const from = startDate.toISOString().split('T')[0];
      const to = endDate.toISOString().split('T')[0];
      
      const fromDate = new Date(from);
      const toDate = new Date(to);
      
      const filtered = sampleData.filter(row => {
        if (!row.production_date) return false;
        
        const productionDate = new Date(row.production_date);
        return productionDate >= fromDate && productionDate <= toDate;
      });
      
      console.log('🔍 Date filtering test:', {
        from,
        to,
        originalCount: sampleData.length,
        filteredCount: filtered.length,
        removedRows: sampleData.length - filtered.length,
        dateRange: { fromDate, toDate }
      });
      
      setTestData(sampleData);
      setFilteredData(filtered);
    } else {
      setTestData([]);
      setFilteredData([]);
    }
  };

  const clearAll = () => {
    setDateRange({ startDate: null, endDate: null });
    setTestData([]);
    setFilteredData([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบการ Filter วันที่</h1>
      
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '4px',
        border: '1px solid #ffeaa7',
        marginBottom: '20px'
      }}>
        <h3>🎯 วัตถุประสงค์:</h3>
        <p>ทดสอบว่าการ filter วันที่ทำงานถูกต้องหรือไม่ เมื่อเลือก 04/07/2025 -> 01/08/2025 ควรได้เฉพาะข้อมูลในช่วงนั้น</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>เลือกช่วงวันที่:</label>
        <SimpleAntDateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onRangeChange={handleRangeChange}
          placeholder="เลือกช่วงวันที่"
          className="w-80"
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={clearAll}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ล้างค่า
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* ข้อมูลทั้งหมด */}
        <div>
          <h3>📊 ข้อมูลทั้งหมด ({sampleData.length} รายการ):</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px',
            border: '1px solid #dee2e6',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            {sampleData.map(item => (
              <div 
                key={item.id} 
                style={{ 
                  padding: '8px',
                  marginBottom: '5px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #e9ecef',
                  fontSize: '12px'
                }}
              >
                <div><strong>{item.job_code}</strong> - {item.work_name}</div>
                <div style={{ color: '#666' }}>วันที่: {item.production_date}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* ข้อมูลที่ผ่าน filter */}
        <div>
          <h3>✅ ข้อมูลที่ผ่าน Filter ({filteredData.length} รายการ):</h3>
          <div style={{ 
            backgroundColor: '#e8f5e8', 
            padding: '10px', 
            borderRadius: '4px',
            border: '1px solid #4caf50',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            {filteredData.length > 0 ? (
              filteredData.map(item => (
                <div 
                  key={item.id} 
                  style={{ 
                    padding: '8px',
                    marginBottom: '5px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #c8e6c9',
                    fontSize: '12px'
                  }}
                >
                  <div><strong>{item.job_code}</strong> - {item.work_name}</div>
                  <div style={{ color: '#2e7d32' }}>วันที่: {item.production_date}</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                {dateRange.startDate && dateRange.endDate ? 'ไม่มีข้อมูลในช่วงวันที่ที่เลือก' : 'กรุณาเลือกช่วงวันที่'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {dateRange.startDate && dateRange.endDate && (
        <div style={{ 
          marginTop: '20px',
          backgroundColor: '#e3f2fd', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #2196f3'
        }}>
          <h3>🔍 สถิติการ Filter:</h3>
          <p><strong>ช่วงวันที่ที่เลือก:</strong> {dateRange.startDate.toISOString().split('T')[0]} ถึง {dateRange.endDate.toISOString().split('T')[0]}</p>
          <p><strong>ข้อมูลทั้งหมด:</strong> {sampleData.length} รายการ</p>
          <p><strong>ข้อมูลที่ผ่าน Filter:</strong> {filteredData.length} รายการ</p>
          <p><strong>ข้อมูลที่ถูกตัดออก:</strong> {sampleData.length - filteredData.length} รายการ</p>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h2>📋 ขั้นตอนการทดสอบ:</h2>
        <ol style={{ marginLeft: '20px' }}>
          <li><strong>เลือกวันที่:</strong> 04/07/2025 -> 01/08/2025</li>
          <li><strong>ตรวจสอบผลลัพธ์:</strong> ควรได้ข้อมูลเฉพาะวันที่ 04/07/2025 - 01/08/2025</li>
          <li><strong>ข้อมูลที่ไม่ควรมี:</strong> 02/07/2025, 03/07/2025, 02/08/2025, 03/08/2025</li>
          <li><strong>ดู Console:</strong> เปิด Developer Tools (F12) ดู console log</li>
        </ol>
        
        <div style={{ 
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          border: '1px solid #f44336'
        }}>
          <strong>⚠️ ปัญหาที่พบ:</strong>
          <p>ในระบบจริง เมื่อเลือก 04/07/2025 -> 01/08/2025 แต่มีข้อมูล 03/07/2025 ปรากฏ</p>
          <p>นี่อาจเป็นปัญหาจาก:</p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Backend API ส่งข้อมูลมากเกินไป</li>
            <li>การเปรียบเทียบวันที่ไม่ถูกต้อง</li>
            <li>Timezone หรือ Date parsing issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DateFilterTest;
