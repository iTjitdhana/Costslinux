import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const SearchDebugTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  const handleRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
  };

  const handleSearch = () => {
    const from = dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : null;
    const to = dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : null;
    
    const debugData = {
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      searchParams: {
        from,
        to,
        query: searchQuery
      },
      timestamp: new Date().toLocaleString('th-TH')
    };
    
    setDebugInfo(debugData);
    
    console.log('🔍 Search Debug Test:', debugData);
  };

  const clearAll = () => {
    setDateRange({ startDate: null, endDate: null });
    setSearchQuery('');
    setDebugInfo(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบการค้นหาและ Debug</h1>
      
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
        <label style={{ display: 'block', marginBottom: '5px' }}>ค้นหา (รหัส/ชื่องาน/ผู้ปฏิบัติงาน):</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="เช่น 235001, น้ำแกงส้ม, เอ"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleSearch}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          ค้นหา (ทดสอบ)
        </button>
        
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
      
      {debugInfo && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #dee2e6',
          marginBottom: '20px'
        }}>
          <h3>🔍 Debug Information:</h3>
          <pre style={{ 
            backgroundColor: '#e9ecef',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h2>🐛 การ Debug ปัญหาการค้นหา:</h2>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '4px',
          border: '1px solid #ffeaa7' 
        }}>
          <h3>⚠️ ปัญหาที่พบ:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>เลือกวันที่แล้วกดค้นหา แต่ข้อมูลไม่ตรงกับวันที่ที่เลือก</li>
            <li>ระบบอาจไม่ได้ใช้วันที่จาก dateRange</li>
            <li>ต้องตรวจสอบว่า parameters ที่ส่งไป API ถูกต้องหรือไม่</li>
          </ul>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          border: '1px solid #2196f3' 
        }}>
          <h3>🔧 วิธีการ Debug:</h3>
          <ol style={{ marginLeft: '20px' }}>
            <li><strong>เลือกวันที่:</strong> เช่น 01/09/2025 - 11/09/2025</li>
            <li><strong>พิมพ์คำค้นหา:</strong> (ถ้าต้องการ)</li>
            <li><strong>กดปุ่มค้นหา:</strong> ดู Debug Information ที่แสดง</li>
            <li><strong>ตรวจสอบ Console:</strong> เปิด Developer Tools (F12) ดู console log</li>
            <li><strong>เปรียบเทียบ:</strong> วันที่ในการค้นหากับผลลัพธ์ที่ได้</li>
          </ol>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          border: '1px solid #4caf50' 
        }}>
          <h3>✅ สิ่งที่ควรเห็นใน Debug:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>dateRange.startDate:</strong> วันที่เริ่มต้นที่เลือก</li>
            <li><strong>dateRange.endDate:</strong> วันที่สิ้นสุดที่เลือก</li>
            <li><strong>searchParams.from:</strong> วันที่เริ่มต้นในรูปแบบ YYYY-MM-DD</li>
            <li><strong>searchParams.to:</strong> วันที่สิ้นสุดในรูปแบบ YYYY-MM-DD</li>
            <li><strong>searchParams.query:</strong> ข้อความค้นหา</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SearchDebugTest;
