import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const DateRangePickerDebugTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });

  const [debugLogs, setDebugLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    addLog(`handleDateRangeChange called: startDate=${startDate ? startDate.toISOString().split('T')[0] : 'null'}, endDate=${endDate ? endDate.toISOString().split('T')[0] : 'null'}`);
    
    if (!startDate || !endDate || 
        typeof startDate !== 'object' || !(startDate instanceof Date) || isNaN(startDate.getTime()) ||
        typeof endDate !== 'object' || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      addLog('Validation failed - invalid dates');
      return;
    }
    
    setDateRange({ startDate, endDate });
    addLog(`Date range updated successfully`);
  };

  const handleStartDateChange = (date) => {
    addLog(`handleStartDateChange called: date=${date ? date.toISOString().split('T')[0] : 'null'}`);
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      const currentEndDate = dateRange.endDate || new Date();
      addLog(`Using currentEndDate: ${currentEndDate.toISOString().split('T')[0]}`);
      handleDateRangeChange(date, currentEndDate);
    } else {
      addLog('Start date validation failed');
    }
  };

  const handleEndDateChange = (date) => {
    addLog(`handleEndDateChange called: date=${date ? date.toISOString().split('T')[0] : 'null'}`);
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      const currentStartDate = dateRange.startDate || new Date();
      addLog(`Using currentStartDate: ${currentStartDate.toISOString().split('T')[0]}`);
      handleDateRangeChange(currentStartDate, date);
    } else {
      addLog('End date validation failed');
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    addLog('Dates cleared');
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('dateRangePickerDebugTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Date Range Picker Debug</h1>
          <p className="text-gray-600">ทดสอบการทำงานของ Date Range Picker พร้อม debug logs</p>
        </div>
        
        <div className="card-body space-y-6">
          {/* Date Range Picker */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Date Range Picker</h2>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">เลือกช่วงวันที่:</label>
              <SimpleAntDateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                placeholder="เลือกช่วงวันที่"
                className="w-80"
              />
              <button onClick={clearDates} className="btn btn-secondary">
                ล้างค่า
              </button>
            </div>
          </div>

          {/* Current State Display */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">สถานะปัจจุบัน</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น:</label>
                  <p className="text-sm text-gray-900">
                    {dateRange.startDate 
                      ? dateRange.startDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })
                      : 'ยังไม่ได้เลือก'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    ISO: {dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : 'null'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด:</label>
                  <p className="text-sm text-gray-900">
                    {dateRange.endDate 
                      ? dateRange.endDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })
                      : 'ยังไม่ได้เลือก'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    ISO: {dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : 'null'}
                  </p>
                </div>
              </div>
              
              {dateRange.startDate && dateRange.endDate && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนวัน:</label>
                  <p className="text-sm text-gray-900">
                    {Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Debug Logs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Debug Logs</h2>
              <button onClick={clearLogs} className="btn btn-secondary text-sm">
                ล้าง Logs
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-gray-500">ยังไม่มี logs</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Instructions */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">คำแนะนำการทดสอบ</h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <ol className="text-sm text-yellow-800 space-y-2">
                <li>1. คลิกที่ date picker เพื่อเปิดปฏิทิน</li>
                <li>2. เลือกวันที่เริ่มต้น (เช่น 01/09/2025)</li>
                <li>3. เลือกวันที่สิ้นสุด (เช่น 12/09/2025)</li>
                <li>4. ดู debug logs เพื่อตรวจสอบการทำงาน</li>
                <li>5. ตรวจสอบว่าวันที่ที่เลือกถูกต้องหรือไม่</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePickerDebugTest;
