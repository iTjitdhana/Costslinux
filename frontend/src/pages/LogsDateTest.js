import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const LogsDateTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [dateRangeError, setDateRangeError] = useState(null);

  // Handle date range changes (same logic as LogsTest.js)
  const handleDateRangeChange = (startDate, endDate) => {
    // More comprehensive date validation
    if (!startDate || !endDate || 
        typeof startDate !== 'object' || !(startDate instanceof Date) || isNaN(startDate.getTime()) ||
        typeof endDate !== 'object' || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      setDateRangeError('กรุณาเลือกวันที่ให้ครบถ้วน');
      return;
    }
    
    // Convert to date-only comparison
    const startDateOnly = new Date(startDate);
    const endDateOnly = new Date(endDate);
    startDateOnly.setHours(0, 0, 0, 0);
    endDateOnly.setHours(0, 0, 0, 0);
    
    if (startDateOnly > endDateOnly) {
      setDateRangeError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }
    
    setDateRangeError(null);
    setDateRange({ startDate, endDate });
  };

  // Handle individual date changes (same logic as LogsTest.js)
  const handleStartDateChange = (date) => {
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // Always update startDate, preserve endDate if it exists
      if (dateRange.endDate) {
        handleDateRangeChange(date, dateRange.endDate);
      } else {
        // If no endDate, set both to the same date
        handleDateRangeChange(date, date);
      }
    }
  };

  const handleEndDateChange = (date) => {
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // Always update endDate, preserve startDate if it exists
      if (dateRange.startDate) {
        handleDateRangeChange(dateRange.startDate, date);
      } else {
        // If no startDate, set both to the same date
        handleDateRangeChange(date, date);
      }
    }
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    setDateRangeError(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบ Date Range Picker (Logs Test)</h1>
      <p>ใช้ SimpleAntDateRangePicker เหมือนในหน้า Logs จริง</p>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>เลือกช่วงวันที่:</label>
        <SimpleAntDateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onRangeChange={handleDateRangeChange}
          placeholder="เลือกช่วงวันที่"
          className="w-80"
        />
        {dateRangeError && (
          <div style={{ 
            color: 'red', 
            backgroundColor: '#ffebee', 
            padding: '10px', 
            marginTop: '10px',
            border: '1px solid #f44336',
            borderRadius: '4px'
          }}>
            {dateRangeError}
          </div>
        )}
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
        {dateRange.startDate && dateRange.endDate && !dateRangeError && (
          <p><strong>จำนวนวัน:</strong> {Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>คำแนะนำการทดสอบ:</h3>
        <ol>
          <li><strong>ปกติ:</strong> เลือก 01/09/2025 -> 11/09/2025 ควรแสดง 01/09/2025 -> 11/09/2025</li>
          <li><strong>Auto-correct:</strong> เลือก 01/08/2025 -> 01/07/2025 ควรกลายเป็น 01/08/2025 -> 01/08/2025</li>
          <li><strong>Auto-correct:</strong> เลือก 15/09/2025 -> 10/09/2025 ควรกลายเป็น 15/09/2025 -> 15/09/2025</li>
          <li><strong>ไฮไลท์:</strong> วันที่ที่เลือกล่าสุด (วันที่มากกว่า) จะถูกใช้เป็นทั้งเริ่มต้นและสิ้นสุด</li>
        </ol>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          border: '1px solid #2196f3' 
        }}>
          <strong>📝 Logic ใหม่:</strong> เมื่อเลือกวันที่ย้อนหลัง ระบบจะตั้งทั้งสองวันเป็นวันที่ที่เลือกล่าสุด (ไม่สลับวันที่)
        </div>
      </div>
    </div>
  );
};

export default LogsDateTest;
