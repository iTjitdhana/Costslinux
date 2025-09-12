import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const TimezoneTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [conversionResults, setConversionResults] = useState(null);

  const handleRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    
    if (startDate && endDate) {
      // ทดสอบการแปลงวันที่แบบต่างๆ
      const results = {
        original: {
          startDate: startDate,
          endDate: endDate
        },
        toISOString: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        toISOStringSplit: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        manualFormat: {
          startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
          endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        },
        toLocaleDateString: {
          startDate: startDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format
          endDate: endDate.toLocaleDateString('en-CA')
        },
        getTime: {
          startDate: startDate.getTime(),
          endDate: endDate.getTime()
        },
        timezone: {
          offset: startDate.getTimezoneOffset(),
          offsetHours: startDate.getTimezoneOffset() / 60
        }
      };
      
      console.log('🕐 Timezone conversion test:', results);
      setConversionResults(results);
    } else {
      setConversionResults(null);
    }
  };

  const clearAll = () => {
    setDateRange({ startDate: null, endDate: null });
    setConversionResults(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบปัญหา Timezone</h1>
      
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '4px',
        border: '1px solid #ffeaa7',
        marginBottom: '20px'
      }}>
        <h3>🎯 ปัญหาที่พบ:</h3>
        <p>เลือกวันที่ 01/08/2025 -> 31/08/2025 แต่ระบบแสดง 31/07/2025 -> 30/08/2025</p>
        <p>นี่อาจเป็นปัญหาจาก timezone offset หรือการแปลงวันที่</p>
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
      
      {conversionResults && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h3>🔍 ผลการแปลงวันที่:</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4>📅 วันที่เริ่มต้น:</h4>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                <div><strong>Original Date:</strong> {conversionResults.original.startDate.toString()}</div>
                <div><strong>toISOString():</strong> {conversionResults.toISOString.startDate}</div>
                <div style={{ color: '#dc3545' }}><strong>toISOString().split('T')[0]:</strong> {conversionResults.toISOStringSplit.startDate}</div>
                <div style={{ color: '#28a745' }}><strong>Manual Format:</strong> {conversionResults.manualFormat.startDate}</div>
                <div><strong>toLocaleDateString('en-CA'):</strong> {conversionResults.toLocaleDateString.startDate}</div>
                <div><strong>getTime():</strong> {conversionResults.getTime.startDate}</div>
              </div>
            </div>
            
            <div>
              <h4>📅 วันที่สิ้นสุด:</h4>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                <div><strong>Original Date:</strong> {conversionResults.original.endDate.toString()}</div>
                <div><strong>toISOString():</strong> {conversionResults.toISOString.endDate}</div>
                <div style={{ color: '#dc3545' }}><strong>toISOString().split('T')[0]:</strong> {conversionResults.toISOStringSplit.endDate}</div>
                <div style={{ color: '#28a745' }}><strong>Manual Format:</strong> {conversionResults.manualFormat.endDate}</div>
                <div><strong>toLocaleDateString('en-CA'):</strong> {conversionResults.toLocaleDateString.endDate}</div>
                <div><strong>getTime():</strong> {conversionResults.getTime.endDate}</div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#e3f2fd',
            borderRadius: '4px'
          }}>
            <h4>🌍 Timezone Information:</h4>
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <div><strong>Timezone Offset:</strong> {conversionResults.timezone.offset} minutes</div>
              <div><strong>Timezone Offset Hours:</strong> {conversionResults.timezone.offsetHours} hours</div>
              <div><strong>Browser Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h2>📋 การเปรียบเทียบ Methods:</h2>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px',
          border: '1px solid #f44336' 
        }}>
          <h3>❌ toISOString().split('T')[0] (ปัญหา):</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>แปลงเป็น UTC ก่อน ทำให้เกิด timezone shift</li>
            <li>ถ้า local time เป็น GMT+7 อาจทำให้วันที่เลื่อนไป</li>
            <li>เช่น: 2025-08-01 00:00 GMT+7 → 2025-07-31 17:00 UTC</li>
          </ul>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          border: '1px solid #4caf50' 
        }}>
          <h3>✅ Manual Format (แก้ไขแล้ว):</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>ใช้ getFullYear(), getMonth(), getDate() โดยตรง</li>
            <li>ไม่มีการแปลง timezone</li>
            <li>ได้วันที่ตรงกับที่ผู้ใช้เลือก</li>
          </ul>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px',
            marginTop: '10px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            <code>
              {`const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const formatted = \`\${year}-\${month}-\${day}\`;`}
            </code>
          </div>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          border: '1px solid #2196f3' 
        }}>
          <h3>📝 วิธีทดสอบ:</h3>
          <ol style={{ marginLeft: '20px' }}>
            <li>เลือกวันที่ 01/08/2025 -> 31/08/2025</li>
            <li>ดูผลการแปลงแต่ละ method</li>
            <li>เปรียบเทียบ toISOString().split('T')[0] กับ Manual Format</li>
            <li>ตรวจสอบว่า Manual Format ให้ผลลัพธ์ถูกต้อง</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TimezoneTest;
