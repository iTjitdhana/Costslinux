import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const UserErrorPreventionTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [userIntent, setUserIntent] = useState('');
  const [warnings, setWarnings] = useState([]);

  const handleRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    
    // ตรวจสอบและแสดงคำเตือน
    const newWarnings = [];
    
    if (startDate && endDate) {
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // คำเตือนสำหรับช่วงวันที่ผิดปกติ
      if (daysDiff === 0) {
        newWarnings.push({
          type: 'info',
          message: '📅 คุณเลือกวันเดียวกัน - ระบบจะค้นหาข้อมูลในวันนี้เท่านั้น'
        });
      }
      
      if (daysDiff > 90) {
        newWarnings.push({
          type: 'warning',
          message: '⚠️ ช่วงวันที่มากกว่า 90 วัน - การโหลดข้อมูลอาจใช้เวลานาน'
        });
      }
      
      // ตรวจสอบวันที่ในอนาคต
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (endDate > today) {
        newWarnings.push({
          type: 'warning',
          message: '🔮 คุณเลือกวันที่ในอนาคต - อาจไม่มีข้อมูล'
        });
      }
      
      // ตรวจสอบวันที่เก่ามาก
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (startDate < oneYearAgo) {
        newWarnings.push({
          type: 'info',
          message: '📊 ข้อมูลเก่ากว่า 1 ปี - อาจมีการเปลี่ยนแปลงระบบ'
        });
      }
    }
    
    setWarnings(newWarnings);
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    setWarnings([]);
    setUserIntent('');
  };

  const handleUserIntentChange = (e) => {
    setUserIntent(e.target.value);
  };

  const getIntentSuggestion = () => {
    if (!userIntent) return null;
    
    const today = new Date();
    const suggestions = [];
    
    if (userIntent.includes('วันนี้') || userIntent.includes('today')) {
      suggestions.push({
        text: 'วันนี้',
        dates: [today, today],
        description: 'ข้อมูลวันปัจจุบัน'
      });
    }
    
    if (userIntent.includes('สัปดาห์') || userIntent.includes('week')) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      suggestions.push({
        text: 'สัปดาห์นี้',
        dates: [weekStart, weekEnd],
        description: 'จันทร์ - อาทิตย์'
      });
    }
    
    if (userIntent.includes('เดือน') || userIntent.includes('month')) {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      suggestions.push({
        text: 'เดือนนี้',
        dates: [monthStart, monthEnd],
        description: 'วันที่ 1 - สิ้นเดือน'
      });
    }
    
    return suggestions;
  };

  const applySuggestion = (suggestion) => {
    const [startDate, endDate] = suggestion.dates;
    setDateRange({ startDate, endDate });
    handleRangeChange(startDate, endDate);
  };

  const suggestions = getIntentSuggestion();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>การป้องกันข้อผิดพลาดของ User</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>บอกว่าต้องการข้อมูลอะไร:</label>
        <input
          type="text"
          value={userIntent}
          onChange={handleUserIntentChange}
          placeholder="เช่น: ข้อมูลวันนี้, สัปดาห์นี้, เดือนนี้"
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            marginBottom: '10px'
          }}
        />
        
        {suggestions && suggestions.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <strong>💡 คำแนะนำ:</strong>
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion(suggestion)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #2196f3',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title={suggestion.description}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
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
      
      {/* แสดงคำเตือน */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {warnings.map((warning, index) => (
            <div
              key={index}
              style={{
                padding: '10px',
                marginBottom: '5px',
                borderRadius: '4px',
                backgroundColor: warning.type === 'warning' ? '#fff3cd' : '#d1ecf1',
                border: `1px solid ${warning.type === 'warning' ? '#ffeaa7' : '#bee5eb'}`,
                color: warning.type === 'warning' ? '#856404' : '#0c5460'
              }}
            >
              {warning.message}
            </div>
          ))}
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
        <p><strong>วันที่เริ่มต้น:</strong> {dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : 'ยังไม่ได้เลือก'}</p>
        <p><strong>วันที่สิ้นสุด:</strong> {dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : 'ยังไม่ได้เลือก'}</p>
        {dateRange.startDate && dateRange.endDate && (
          <p><strong>จำนวนวัน:</strong> {Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>🛡️ วิธีป้องกันข้อผิดพลาดของ User:</h2>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          border: '1px solid #4caf50' 
        }}>
          <h3>✅ 1. Smart Suggestions (คำแนะนำอัจฉริยะ):</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>Intent Detection:</strong> ตรวจจับความต้องการจากข้อความ</li>
            <li><strong>Quick Actions:</strong> ปุ่มทางลัดสำหรับช่วงวันที่ยอดนิยม</li>
            <li><strong>Context Aware:</strong> แนะนำตามบริบทการใช้งาน</li>
          </ul>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3e0', 
          borderRadius: '4px',
          border: '1px solid #ff9800' 
        }}>
          <h3>⚠️ 2. Real-time Warnings (คำเตือนแบบเรียลไทม์):</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>ช่วงวันที่ยาว:</strong> เตือนเมื่อเลือกมากกว่า 90 วัน</li>
            <li><strong>วันที่ในอนาคต:</strong> เตือนเมื่ออาจไม่มีข้อมูล</li>
            <li><strong>ข้อมูลเก่า:</strong> แจ้งเตือนข้อมูลเก่ากว่า 1 ปี</li>
            <li><strong>วันเดียวกัน:</strong> ยืนยันเมื่อเลือกวันเดียว</li>
          </ul>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          border: '1px solid #2196f3' 
        }}>
          <h3>🎯 3. User Experience Improvements:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>Visual Feedback:</strong> สีและไอคอนบ่งบอกสถานะ</li>
            <li><strong>Progressive Disclosure:</strong> แสดงข้อมูลที่เกี่ยวข้องตามบริบท</li>
            <li><strong>Confirmation:</strong> ยืนยันการกระทำที่อาจมีผลกระทบ</li>
            <li><strong>Undo/Reset:</strong> ให้ผู้ใช้กลับไปสถานะเดิมได้</li>
          </ul>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f3e5f5', 
          borderRadius: '4px',
          border: '1px solid #9c27b0' 
        }}>
          <h3>🔧 4. Technical Safeguards:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>Input Validation:</strong> ตรวจสอบข้อมูลก่อนส่ง</li>
            <li><strong>Error Boundaries:</strong> จัดการข้อผิดพลาดอย่างสง่างาม</li>
            <li><strong>Loading States:</strong> แสดงสถานะการโหลด</li>
            <li><strong>Fallback Values:</strong> ค่าเริ่มต้นที่สมเหตุสมผล</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserErrorPreventionTest;
