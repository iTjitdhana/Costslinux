import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import NativeDateRangePicker from '../components/NativeDateRangePicker';
import SimpleNativeDateRangePicker from '../components/SimpleNativeDateRangePicker';

const NativeDateRangePickerTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });
  const [selectedDates, setSelectedDates] = useState({
    startDate: new Date(),
    endDate: new Date()
  });

  const [simpleDateRange, setSimpleDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });
  const [simpleSelectedDates, setSimpleSelectedDates] = useState({
    startDate: new Date(),
    endDate: new Date()
  });

  const handleDateRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    setSelectedDates({ startDate, endDate });
  };

  const handleSimpleDateRangeChange = (startDate, endDate) => {
    setSimpleDateRange({ startDate, endDate });
    setSimpleSelectedDates({ startDate, endDate });
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    setSelectedDates({ startDate: null, endDate: null });
  };

  const clearSimpleDates = () => {
    setSimpleDateRange({ startDate: null, endDate: null });
    setSimpleSelectedDates({ startDate: null, endDate: null });
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('nativeDateRangePickerTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Native Date Range Picker</h1>
          <p className="text-gray-600">ระบบทดสอบการทำงานของ Native Date Range Picker ที่ใช้ HTML5 Native Input</p>
        </div>
        
        <div className="card-body space-y-8">
          {/* Native Date Range Picker */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Native Date Range Picker (แบบเต็ม)</h2>
            <div className="space-y-4">
              <NativeDateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={(date) => handleDateRangeChange(date, dateRange.endDate)}
                onEndDateChange={(date) => handleDateRangeChange(dateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
              />
              <button onClick={clearDates} className="btn btn-secondary">
                ล้างค่า
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">วันที่ที่เลือก:</h3>
              <p className="text-sm text-gray-600">
                เริ่มต้น: {selectedDates.startDate ? selectedDates.startDate.toLocaleDateString('th-TH') : 'ไม่ได้เลือก'}
              </p>
              <p className="text-sm text-gray-600">
                สิ้นสุด: {selectedDates.endDate ? selectedDates.endDate.toLocaleDateString('th-TH') : 'ไม่ได้เลือก'}
              </p>
            </div>
          </div>

          {/* Simple Native Date Range Picker */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Simple Native Date Range Picker (แบบง่าย)</h2>
            <div className="space-y-4">
              <SimpleNativeDateRangePicker
                startDate={simpleDateRange.startDate}
                endDate={simpleDateRange.endDate}
                onStartDateChange={(date) => handleSimpleDateRangeChange(date, simpleDateRange.endDate)}
                onEndDateChange={(date) => handleSimpleDateRangeChange(simpleDateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
              />
              <button onClick={clearSimpleDates} className="btn btn-secondary">
                ล้างค่า
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">วันที่ที่เลือก:</h3>
              <p className="text-sm text-gray-600">
                เริ่มต้น: {simpleSelectedDates.startDate ? simpleSelectedDates.startDate.toLocaleDateString('th-TH') : 'ไม่ได้เลือก'}
              </p>
              <p className="text-sm text-gray-600">
                สิ้นสุด: {simpleSelectedDates.endDate ? simpleSelectedDates.endDate.toLocaleDateString('th-TH') : 'ไม่ได้เลือก'}
              </p>
            </div>
          </div>

          {/* Features Comparison */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">เปรียบเทียบฟีเจอร์</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Native Date Range Picker</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ใช้ HTML5 Native Input</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ไม่มีปัญหาเรื่อง Date object</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ทำงานได้ดีในทุกเบราว์เซอร์</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ไม่ต้องติดตั้งไลบรารีเพิ่ม</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>มีปุ่มตกลง/ยกเลิก</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>แสดงข้อผิดพลาดได้</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">Simple Native Date Range Picker</h3>
                <ul className="text-sm text-green-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ใช้ HTML5 Native Input</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ไม่มีปัญหาเรื่อง Date object</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ทำงานได้ดีในทุกเบราว์เซอร์</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ไม่ต้องติดตั้งไลบรารีเพิ่ม</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>เลือกแล้วใช้ทันที (Auto Apply)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ปิดอัตโนมัติ</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Advantages */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">ข้อดีของ Native Date Range Picker</h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <ul className="text-sm text-yellow-800 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>เสถียร:</strong> ไม่มีปัญหาเรื่อง Date object หรือ error</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>มาตรฐาน:</strong> ใช้ HTML5 Native Input ที่เป็นมาตรฐาน</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>เบา:</strong> ไม่ต้องติดตั้งไลบรารีเพิ่ม</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>เร็ว:</strong> โหลดเร็ว ไม่มี dependency</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>ปลอดภัย:</strong> ไม่มีปัญหาเรื่อง security</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>ใช้งานง่าย:</strong> ผู้ใช้คุ้นเคยกับ UI ของเบราว์เซอร์</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NativeDateRangePickerTest;
