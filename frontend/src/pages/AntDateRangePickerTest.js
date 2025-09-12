import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import AntDateRangePicker from '../components/AntDateRangePicker';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const AntDateRangePickerTest = () => {
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
        <title>{getPageTitle('antDateRangePickerTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Ant Design Date Range Picker</h1>
          <p className="text-gray-600">ระบบทดสอบการทำงานของ Ant Design Date Range Picker</p>
        </div>
        
        <div className="card-body space-y-8">
          {/* Ant Design Date Range Picker */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Ant Design Date Range Picker (แบบเต็ม)</h2>
            <div className="space-y-4">
              <AntDateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={(date) => handleDateRangeChange(date, dateRange.endDate)}
                onEndDateChange={(date) => handleDateRangeChange(dateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
                autoApply={false}
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

          {/* Simple Ant Design Date Range Picker */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Simple Ant Design Date Range Picker (แบบง่าย)</h2>
            <div className="space-y-4">
              <SimpleAntDateRangePicker
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
                <h3 className="font-semibold text-blue-800 mb-3">Ant Design Date Range Picker</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ใช้ Ant Design RangePicker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>UI สวยงามและทันสมัย</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>รองรับภาษาไทย</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>มีฟีเจอร์ครบครัน</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>จัดการวันที่ได้ดี</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>มีปุ่มตกลง/ยกเลิก</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">Simple Ant Design Date Range Picker</h3>
                <ul className="text-sm text-green-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ใช้ Ant Design RangePicker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>UI สวยงามและทันสมัย</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>รองรับภาษาไทย</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>มีฟีเจอร์ครบครัน</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>จัดการวันที่ได้ดี</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>เลือกแล้วใช้ทันที (Auto Apply)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Advantages */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">ข้อดีของ Ant Design Date Range Picker</h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <ul className="text-sm text-yellow-800 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>UI สวยงาม:</strong> ใช้ Ant Design ที่มี UI สวยงามและทันสมัย</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>เสถียร:</strong> เป็นไลบรารีที่ได้รับความนิยมและมีผู้ใช้มาก</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>ฟีเจอร์ครบ:</strong> มีฟีเจอร์ครบครันสำหรับการเลือกวันที่</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>รองรับภาษาไทย:</strong> มี locale สำหรับภาษาไทย</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>จัดการวันที่ได้ดี:</strong> ไม่มีปัญหาเรื่อง Date object</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>ปรับแต่งได้:</strong> สามารถปรับแต่ง theme และ style ได้</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Installation Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">ข้อมูลการติดตั้ง</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">คำสั่งติดตั้ง:</h3>
              <code className="block bg-gray-800 text-green-400 p-2 rounded text-sm">
                npm install antd
              </code>
              <p className="text-sm text-gray-600 mt-2">
                Ant Design เป็นไลบรารี UI ที่ได้รับความนิยมและมีฟีเจอร์ครบครันสำหรับการสร้าง UI ใน React
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AntDateRangePickerTest;
