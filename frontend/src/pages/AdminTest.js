import React, { useState } from 'react';

const AdminTest = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleStartDateChange = (e) => {
    const date = e.target.value;
    setStartDate(date);
    setError('');
    
    if (date && endDate && date > endDate) {
      setError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
    }
  };

  const handleEndDateChange = (e) => {
    const date = e.target.value;
    setEndDate(date);
    setError('');
    
    if (startDate && date && startDate > date) {
      setError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
    }
  };

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
    setError('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบ Date Range Picker (Admin Test)</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>วันที่เริ่มต้น:</label>
        <input
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          style={{ padding: '8px', marginRight: '10px' }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>วันที่สิ้นสุด:</label>
        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          style={{ padding: '8px', marginRight: '10px' }}
        />
      </div>
      
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          marginBottom: '20px',
          border: '1px solid #f44336',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
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
        <p><strong>วันที่เริ่มต้น:</strong> {startDate || 'ยังไม่ได้เลือก'}</p>
        <p><strong>วันที่สิ้นสุด:</strong> {endDate || 'ยังไม่ได้เลือก'}</p>
        {startDate && endDate && !error && (
          <p><strong>จำนวนวัน:</strong> {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1} วัน</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>คำแนะนำการทดสอบ:</h3>
        <ol>
          <li>เลือกวันที่เริ่มต้น (เช่น 01/09/2025)</li>
          <li>เลือกวันที่สิ้นสุด (เช่น 12/09/2025)</li>
          <li>ทดสอบเลือกวันที่ย้อนหลัง (เช่น 15/09/2025) - ควรเห็น error</li>
          <li>ทดสอบเลือกวันที่ข้างหน้า (เช่น 20/09/2025) - ควรไม่มี error</li>
        </ol>
      </div>
    </div>
  );
};

export default AdminTest;
