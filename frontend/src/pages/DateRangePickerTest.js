import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import DateRangePicker from '../components/DateRangePicker';
import SimpleDateRangePicker from '../components/SimpleDateRangePicker';
import { getPageTitle } from '../config/pageTitles';

const DateRangePickerTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [selectedDates, setSelectedDates] = useState({
    startDate: null,
    endDate: null
  });

  const [simpleDateRange, setSimpleDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [simpleSelectedDates, setSimpleSelectedDates] = useState({
    startDate: null,
    endDate: null
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
        <title>{getPageTitle('dateRangePickerTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">ทดสอบ Date Range Picker</h2>
          <p className="text-sm text-gray-600">ทดสอบการทำงานของ Date Range Picker Component</p>
        </div>
        
        <div className="card-body space-y-6">
          {/* Basic Usage - Original */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">การใช้งานพื้นฐาน (แบบเดิม)</h3>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">เลือกช่วงวันที่:</label>
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={(date) => handleDateRangeChange(date, dateRange.endDate)}
                onEndDateChange={(date) => handleDateRangeChange(dateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
              />
              <button
                onClick={clearDates}
                className="btn btn-secondary text-sm px-4"
              >
                ล้างข้อมูล
              </button>
            </div>
          </div>

          {/* Simple Usage - New */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">การใช้งานแบบง่าย (ใหม่)</h3>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">เลือกช่วงวันที่:</label>
              <SimpleDateRangePicker
                startDate={simpleDateRange.startDate}
                endDate={simpleDateRange.endDate}
                onStartDateChange={(date) => handleSimpleDateRangeChange(date, simpleDateRange.endDate)}
                onEndDateChange={(date) => handleSimpleDateRangeChange(simpleDateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
              />
              <button
                onClick={clearSimpleDates}
                className="btn btn-secondary text-sm px-4"
              >
                ล้างข้อมูล
              </button>
            </div>
          </div>

          {/* With Min/Max Date */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">การใช้งานพร้อม Min/Max Date</h3>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">เลือกช่วงวันที่ (จำกัดช่วง):</label>
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={(date) => handleDateRangeChange(date, dateRange.endDate)}
                onEndDateChange={(date) => handleDateRangeChange(dateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
                minDate={new Date('2024-01-01')}
                maxDate={new Date('2024-12-31')}
              />
            </div>
          </div>

          {/* Disabled State */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">สถานะ Disabled</h3>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Date Range Picker (Disabled):</label>
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={(date) => handleDateRangeChange(date, dateRange.endDate)}
                onEndDateChange={(date) => handleDateRangeChange(dateRange.startDate, date)}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
                disabled={true}
              />
            </div>
          </div>

          {/* Selected Dates Display - Original */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">ข้อมูลที่เลือก (แบบเดิม)</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น:</label>
                  <p className="text-sm text-gray-900">
                    {selectedDates.startDate 
                      ? selectedDates.startDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })
                      : 'ยังไม่ได้เลือก'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด:</label>
                  <p className="text-sm text-gray-900">
                    {selectedDates.endDate 
                      ? selectedDates.endDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })
                      : 'ยังไม่ได้เลือก'
                    }
                  </p>
                </div>
              </div>
              
              {selectedDates.startDate && selectedDates.endDate && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนวัน:</label>
                  <p className="text-sm text-gray-900">
                    {Math.ceil((selectedDates.endDate - selectedDates.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Dates Display - Simple */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">ข้อมูลที่เลือก (แบบง่าย)</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น:</label>
                  <p className="text-sm text-gray-900">
                    {simpleSelectedDates.startDate 
                      ? simpleSelectedDates.startDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })
                      : 'ยังไม่ได้เลือก'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด:</label>
                  <p className="text-sm text-gray-900">
                    {simpleSelectedDates.endDate 
                      ? simpleSelectedDates.endDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })
                      : 'ยังไม่ได้เลือก'
                    }
                  </p>
                </div>
              </div>
              
              {simpleSelectedDates.startDate && simpleSelectedDates.endDate && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนวัน:</label>
                  <p className="text-sm text-gray-900">
                    {Math.ceil((simpleSelectedDates.endDate - simpleSelectedDates.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-800">คุณสมบัติที่รองรับ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Features */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">แบบเดิม (DateRangePicker)</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>แสดงปฏิทิน 2 เดือนเคียงข้างกัน (เดือนปัจจุบัน + เดือนถัดไป)</span>
                </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>คลิกครั้งเดียวเปิดปฏิทิน 2 เดือน</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>เลือกวันเริ่มต้นและวันสิ้นสุดในปฏิทินเดียวกัน</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ปุ่มตกลง/ยกเลิก</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>รองรับ minDate และ maxDate</span>
                  </li>
                </ul>
              </div>

              {/* Simple Features */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">แบบง่าย (SimpleDateRangePicker)</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>แสดงปฏิทิน 2 เดือนเคียงข้างกัน (เดือนปัจจุบัน + เดือนถัดไป)</span>
                </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>คลิกครั้งเดียวเปิดปฏิทิน 2 เดือน</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>เลือกแล้วใช้ทันที (Auto Apply)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ปิดปฏิทินอัตโนมัติ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Validation และไฮไลท์ข้อผิดพลาด</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>ปุ่มล้างข้อมูล</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Responsive design</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePickerTest;
