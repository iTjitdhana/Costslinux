import React, { useState } from 'react';
import CustomDateRangePicker from '../components/CustomDateRangePicker';

const CustomDateTest = () => {
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
      <h1>ทดสอบ Custom Date Range Picker</h1>
      <p>ใช้ DatePicker แยกกัน 2 ตัว เพื่อป้องกันการสลับวันที่อัตโนมัติ</p>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>เลือกช่วงวันที่:</label>
        <CustomDateRangePicker
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
        <h3>คำแนะนำการทดสอบ:</h3>
        <ol>
          <li><strong>ปกติ:</strong> เลือก 01/09/2025 (เริ่มต้น) แล้วเลือก 11/09/2025 (สิ้นสุด) ควรแสดง 01/09/2025 -> 11/09/2025</li>
          <li><strong>Auto-correct:</strong> เลือก 01/08/2025 (เริ่มต้น) แล้วเลือก 01/07/2025 (สิ้นสุด) ควรกลายเป็น 01/07/2025 -> 01/07/2025</li>
          <li><strong>Auto-correct:</strong> เลือก 15/09/2025 (สิ้นสุด) แล้วเลือก 10/09/2025 (เริ่มต้น) ควรกลายเป็น 10/09/2025 -> 10/09/2025</li>
          <li><strong>Logic:</strong> วันที่ที่เลือกล่าสุดจะเป็นตัวกำหนดทั้งสองวันเมื่อมีการเลือกย้อนหลัง</li>
        </ol>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          border: '1px solid #4caf50' 
        }}>
          <strong>✅ ข้อดี Custom DatePicker:</strong>
          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
            <li>ไม่มีการสลับวันที่อัตโนมัติ</li>
            <li>ควบคุมการทำงานได้เต็มที่</li>
            <li>แสดงผลชัดเจน (วันที่เริ่มต้น → วันที่สิ้นสุด)</li>
            <li>Auto-correct ตาม logic ที่ต้องการ</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CustomDateTest;
