import React, { useState } from 'react';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';
import CustomDateRangePicker from '../components/CustomDateRangePicker';

const ThaiLocaleTest = () => {
  const [dateRange1, setDateRange1] = useState({
    startDate: null,
    endDate: null
  });
  
  const [dateRange2, setDateRange2] = useState({
    startDate: null,
    endDate: null
  });

  const handleRangeChange1 = (startDate, endDate) => {
    setDateRange1({ startDate, endDate });
  };
  
  const handleRangeChange2 = (startDate, endDate) => {
    setDateRange2({ startDate, endDate });
  };

  const clearDates = () => {
    setDateRange1({ startDate: null, endDate: null });
    setDateRange2({ startDate: null, endDate: null });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ทดสอบปฏิทินภาษาไทย</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>1. SimpleAntDateRangePicker (RangePicker)</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>เลือกช่วงวันที่:</label>
          <SimpleAntDateRangePicker
            startDate={dateRange1.startDate}
            endDate={dateRange1.endDate}
            onRangeChange={handleRangeChange1}
            placeholder="เลือกช่วงวันที่"
            className="w-80"
          />
        </div>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h4>สถานะปัจจุบัน:</h4>
          <p><strong>วันที่เริ่มต้น:</strong> {dateRange1.startDate ? dateRange1.startDate.toLocaleDateString('th-TH') : 'ยังไม่ได้เลือก'}</p>
          <p><strong>วันที่สิ้นสุด:</strong> {dateRange1.endDate ? dateRange1.endDate.toLocaleDateString('th-TH') : 'ยังไม่ได้เลือก'}</p>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>2. CustomDateRangePicker (DatePicker แยก)</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>เลือกช่วงวันที่:</label>
          <CustomDateRangePicker
            startDate={dateRange2.startDate}
            endDate={dateRange2.endDate}
            onRangeChange={handleRangeChange2}
            placeholder="เลือกช่วงวันที่"
            className="w-80"
          />
        </div>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h4>สถานะปัจจุบัน:</h4>
          <p><strong>วันที่เริ่มต้น:</strong> {dateRange2.startDate ? dateRange2.startDate.toLocaleDateString('th-TH') : 'ยังไม่ได้เลือก'}</p>
          <p><strong>วันที่สิ้นสุด:</strong> {dateRange2.endDate ? dateRange2.endDate.toLocaleDateString('th-TH') : 'ยังไม่ได้เลือก'}</p>
        </div>
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
          ล้างค่าทั้งหมด
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>🇹🇭 คุณสมบัติภาษาไทยที่เพิ่มเข้ามา:</h2>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          border: '1px solid #4caf50' 
        }}>
          <h3>✅ ชื่อเดือนภาษาไทย:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
            <div><strong>มกราคม</strong> (January)</div>
            <div><strong>กุมภาพันธ์</strong> (February)</div>
            <div><strong>มีนาคม</strong> (March)</div>
            <div><strong>เมษายน</strong> (April)</div>
            <div><strong>พฤษภาคม</strong> (May)</div>
            <div><strong>มิถุนายน</strong> (June)</div>
            <div><strong>กรกฎาคม</strong> (July)</div>
            <div><strong>สิงหาคม</strong> (August)</div>
            <div><strong>กันยายน</strong> (September)</div>
            <div><strong>ตุลาคม</strong> (October)</div>
            <div><strong>พฤศจิกายน</strong> (November)</div>
            <div><strong>ธันวาคม</strong> (December)</div>
          </div>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          border: '1px solid #2196f3' 
        }}>
          <h3>📅 วันในสัปดาห์ภาษาไทย:</h3>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <span><strong>อา</strong> (อาทิตย์)</span>
            <span><strong>จ</strong> (จันทร์)</span>
            <span><strong>อ</strong> (อังคาร)</span>
            <span><strong>พ</strong> (พุธ)</span>
            <span><strong>พฤ</strong> (พฤหัสบดี)</span>
            <span><strong>ศ</strong> (ศุกร์)</span>
            <span><strong>ส</strong> (เสาร์)</span>
          </div>
        </div>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3e0', 
          borderRadius: '4px',
          border: '1px solid #ff9800' 
        }}>
          <h3>🔧 การตั้งค่าที่เพิ่มเข้ามา:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>dayjs.locale('th'):</strong> ตั้งค่า dayjs ให้ใช้ภาษาไทย</li>
            <li><strong>shortMonths:</strong> ชื่อเดือนแบบย่อ (ม.ค., ก.พ., ฯลฯ)</li>
            <li><strong>months:</strong> ชื่อเดือนแบบเต็ม (มกราคม, กุมภาพันธ์, ฯลฯ)</li>
            <li><strong>shortWeekDays:</strong> ชื่อวันในสัปดาห์แบบย่อ (อา, จ, อ, ฯลฯ)</li>
            <li><strong>UI Text:</strong> ข้อความต่างๆ เป็นภาษาไทย</li>
          </ul>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f3e5f5', 
          borderRadius: '4px',
          border: '1px solid #9c27b0' 
        }}>
          <h3>📝 คำแนะนำการทดสอบ:</h3>
          <ol style={{ marginLeft: '20px' }}>
            <li>คลิกเพื่อเปิดปฏิทิน</li>
            <li>สังเกตชื่อเดือนที่แสดงเป็นภาษาไทย</li>
            <li>ลองเปลี่ยนเดือนดูชื่อเดือนต่างๆ</li>
            <li>สังเกตวันในสัปดาห์ที่แสดงเป็นตัวอักษรไทย</li>
            <li>ทดสอบปุ่มต่างๆ ที่แสดงเป็นภาษาไทย</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ThaiLocaleTest;
