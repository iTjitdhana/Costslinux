import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const AntDesignLogicTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const handleRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Logic ของ Ant Design RangePicker</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>เลือกช่วงวันที่:</label>
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
          onClick={clearDates}
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
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      }}>
        <h3>สถานะปัจจุบัน:</h3>
        <p><strong>วันที่เริ่มต้น:</strong> {dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : 'ยังไม่ได้เลือก'}</p>
        <p><strong>วันที่สิ้นสุด:</strong> {dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : 'ยังไม่ได้เลือก'}</p>
        {dateRange.startDate && dateRange.endDate && (
          <p><strong>จำนวนวัน:</strong> {Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>📋 Logic ของ Ant Design RangePicker:</h2>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          border: '1px solid #2196f3' 
        }}>
          <h3>🔄 Auto-Sorting (การจัดเรียงอัตโนมัติ):</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>เมื่อผู้ใช้เลือก:</strong> 01/08/2025 → 01/07/2025</li>
            <li><strong>Ant Design จะจัดเรียงเป็น:</strong> 01/07/2025 → 01/08/2025</li>
            <li><strong>เหตุผล:</strong> RangePicker จัดเรียงให้วันที่น้อยกว่าอยู่ซ้าย, วันที่มากกว่าอยู่ขวาเสมอ</li>
          </ul>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f3e5f5', 
          borderRadius: '4px',
          border: '1px solid #9c27b0' 
        }}>
          <h3>⚙️ การทำงานภายใน:</h3>
          <ol style={{ marginLeft: '20px' }}>
            <li><strong>User Selection:</strong> ผู้ใช้คลิกเลือกวันที่ 2 วัน</li>
            <li><strong>Internal Processing:</strong> Ant Design เปรียบเทียบวันที่</li>
            <li><strong>Auto-Sort:</strong> จัดเรียงให้ start ≤ end เสมอ</li>
            <li><strong>Callback:</strong> เรียก onChange พร้อมวันที่ที่จัดเรียงแล้ว</li>
          </ol>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3e0', 
          borderRadius: '4px',
          border: '1px solid #ff9800' 
        }}>
          <h3>📝 ตัวอย่างการทำงาน:</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>การเลือกของผู้ใช้</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>ผลลัพธ์จาก Ant Design</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>01/09/2025 → 11/09/2025</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>01/09/2025 → 11/09/2025</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>ปกติ (ไม่เปลี่ยน)</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>01/08/2025 → 01/07/2025</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>01/07/2025 → 01/08/2025</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>สลับตำแหน่ง</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>15/09/2025 → 10/09/2025</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>10/09/2025 → 15/09/2025</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>สลับตำแหน่ง</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          border: '1px solid #4caf50' 
        }}>
          <h3>✅ ข้อดีของ Ant Design Logic:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>ความสม่ำเสมอ:</strong> start date จะน้อยกว่าหรือเท่ากับ end date เสมอ</li>
            <li><strong>User-Friendly:</strong> ผู้ใช้ไม่ต้องกังวลเรื่องลำดับการเลือก</li>
            <li><strong>ป้องกัน Error:</strong> ไม่มี invalid date range</li>
            <li><strong>Standard Behavior:</strong> เป็นพฤติกรรมมาตรฐานของ date picker</li>
          </ul>
        </div>
        
        <div style={{ 
          marginTop: '15px',
          padding: '15px', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px',
          border: '1px solid #f44336' 
        }}>
          <h3>⚠️ ข้อควรระวัง:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>ไม่สามารถตรวจจับได้ว่าผู้ใช้เลือกวันที่ย้อนหลัง</li>
            <li>ไม่สามารถใช้วันที่ที่เลือกล่าสุดเป็นตัวกำหนดได้</li>
            <li>การสลับวันที่เป็นไปอัตโนมัติ ไม่สามารถปิดได้</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AntDesignLogicTest;
