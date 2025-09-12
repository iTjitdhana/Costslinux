import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const SimpleSearchTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRangeChange = (startDate, endDate) => {
    console.log('📅 Date range changed:', { startDate, endDate });
    setDateRange({ startDate, endDate });
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      console.log('🔍 Search button clicked');
      console.log('Current dateRange:', dateRange);
      console.log('Current searchQuery:', searchQuery);
      
      // Simulate search
      const from = dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : null;
      const to = dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : null;
      
      const results = {
        searchParams: {
          from,
          to,
          query: searchQuery
        },
        message: from && to ? 
          `ค้นหาข้อมูลจากวันที่ ${from} ถึง ${to}${searchQuery ? ` ด้วยคำค้นหา "${searchQuery}"` : ''}` :
          'ไม่ได้เลือกวันที่ - จะใช้วันที่เริ่มต้น',
        timestamp: new Date().toLocaleString('th-TH')
      };
      
      console.log('✅ Search completed:', results);
      setSearchResults(results);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setDateRange({ startDate: null, endDate: null });
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบการค้นหาแบบง่าย</h1>
      
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '4px',
        border: '1px solid #ffeaa7',
        marginBottom: '20px'
      }}>
        <h3>🎯 วัตถุประสงค์:</h3>
        <p>ทดสอบว่าการเลือกวันที่และการกดปุ่มค้นหาทำงานถูกต้องหรือไม่</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>1. เลือกช่วงวันที่:</label>
        <SimpleAntDateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onRangeChange={handleRangeChange}
          placeholder="เลือกช่วงวันที่"
          className="w-80"
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>2. ค้นหา (ถ้าต้องการ):</label>
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
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: loading ? '#6c757d' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'กำลังค้นหา...' : '3. กดค้นหา'}
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
      
      {searchResults && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #4caf50',
          marginBottom: '20px'
        }}>
          <h3>✅ ผลการค้นหา:</h3>
          <p><strong>ข้อความ:</strong> {searchResults.message}</p>
          <p><strong>เวลา:</strong> {searchResults.timestamp}</p>
          
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '10px',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            <strong>พารามิเตอร์ที่ใช้:</strong>
            <pre style={{ margin: '5px 0', fontSize: '12px' }}>
              {JSON.stringify(searchResults.searchParams, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h2>📋 ขั้นตอนการทดสอบ:</h2>
        <ol style={{ marginLeft: '20px' }}>
          <li><strong>เลือกวันที่:</strong> คลิกที่ date picker เลือกช่วงวันที่ (เช่น 01/09/2025 - 11/09/2025)</li>
          <li><strong>พิมพ์คำค้นหา:</strong> (ถ้าต้องการ) เช่น "235001" หรือ "น้ำแกงส้ม"</li>
          <li><strong>กดปุ่มค้นหา:</strong> ดูว่าปุ่มเปลี่ยนเป็น "กำลังค้นหา..." หรือไม่</li>
          <li><strong>ตรวจสอบผลลัพธ์:</strong> ดูว่าแสดงผลการค้นหาหรือไม่</li>
          <li><strong>ดู Console:</strong> เปิด Developer Tools (F12) ดู console log</li>
        </ol>
        
        <div style={{ 
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          border: '1px solid #2196f3'
        }}>
          <strong>🔍 สิ่งที่ควรเห็นใน Console:</strong>
          <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
            <li><code>📅 Date range changed:</code> เมื่อเลือกวันที่</li>
            <li><code>🔍 Search button clicked</code> เมื่อกดปุ่มค้นหา</li>
            <li><code>✅ Search completed:</code> เมื่อค้นหาเสร็จ</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleSearchTest;
