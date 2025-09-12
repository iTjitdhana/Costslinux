import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const DateRangePickerFixedTest = () => {
  // เริ่มต้นด้วย null เหมือนใน LogsTest
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
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
      // If endDate is null, use the same date as startDate
      const currentEndDate = dateRange.endDate || date;
      addLog(`Using currentEndDate: ${currentEndDate.toISOString().split('T')[0]}`);
      handleDateRangeChange(date, currentEndDate);
    } else {
      addLog('Start date validation failed');
    }
  };

  const handleEndDateChange = (date) => {
    addLog(`handleEndDateChange called: date=${date ? date.toISOString().split('T')[0] : 'null'}`);
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // If startDate is null, use the same date as endDate
      const currentStartDate = dateRange.startDate || date;
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

  const setToday = () => {
    const today = new Date();
    setDateRange({ startDate: today, endDate: today });
    addLog('Set to today');
  };

  const setCustomRange = () => {
    const startDate = new Date('2025-09-01');
    const endDate = new Date('2025-09-12');
    setDateRange({ startDate, endDate });
    addLog('Set custom range: 01/09/2025 - 12/09/2025');
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('dateRangePickerFixedTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Date Range Picker (แก้ไขแล้ว)</h1>
          <p className="text-gray-600">ทดสอบการทำงานของ Date Range Picker หลังแก้ไขปัญหา default date</p>
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
              <div className="flex gap-2">
                <button onClick={clearDates} className="btn btn-secondary">
                  ล้างค่า
                </button>
                <button onClick={setToday} className="btn btn-primary">
                  วันนี้
                </button>
                <button onClick={setCustomRange} className="btn btn-primary">
                  01/09/2025 - 12/09/2025
                </button>
              </div>
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
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">การทดสอบที่ควรทำ:</h3>
              <ol className="text-sm text-green-800 space-y-2">
                <li>1. <strong>ทดสอบการเลือกวันที่เริ่มต้น:</strong> คลิกที่ date picker และเลือกวันที่เริ่มต้น (เช่น 01/09/2025) - ควรเห็นว่าวันที่สิ้นสุดเป็นวันที่เดียวกัน</li>
                <li>2. <strong>ทดสอบการเลือกวันที่สิ้นสุด:</strong> เลือกวันที่สิ้นสุด (เช่น 12/09/2025) - ควรเห็นว่าวันที่เริ่มต้นยังคงเป็นวันที่เดิม</li>
                <li>3. <strong>ทดสอบการล้างค่า:</strong> กดปุ่ม "ล้างค่า" - ควรเห็นว่าทั้งสองฟิลด์เป็น null</li>
                <li>4. <strong>ทดสอบปุ่มทดสอบ:</strong> กดปุ่ม "01/09/2025 - 12/09/2025" - ควรเห็นว่าวันที่ถูกตั้งค่าถูกต้อง</li>
                <li>5. <strong>ตรวจสอบ Debug Logs:</strong> ดู logs เพื่อตรวจสอบการทำงานของแต่ละฟังก์ชัน</li>
              </ol>
            </div>
          </div>

          {/* Expected Behavior */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">พฤติกรรมที่คาดหวัง</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">ควรทำงานดังนี้:</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• <strong>เมื่อเข้าเว็บครั้งแรก:</strong> Date picker ควรว่างเปล่า (ไม่มีวันที่เลือก)</li>
                <li>• <strong>เมื่อเลือกวันที่เริ่มต้น:</strong> วันที่สิ้นสุดควรเป็นวันที่เดียวกัน (ถ้ายังไม่ได้เลือก)</li>
                <li>• <strong>เมื่อเลือกวันที่สิ้นสุด:</strong> วันที่เริ่มต้นควรเป็นวันที่เดิม (ถ้าเลือกแล้ว) หรือวันที่เดียวกัน (ถ้ายังไม่ได้เลือก)</li>
                <li>• <strong>เมื่อล้างค่า:</strong> ทั้งสองฟิลด์ควรเป็น null</li>
                <li>• <strong>ไม่ควรมีปัญหา:</strong> เลือกวันไหนก็เป็นวันปัจจุบัน</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePickerFixedTest;
