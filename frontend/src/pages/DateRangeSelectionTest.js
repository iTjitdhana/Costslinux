import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const DateRangeSelectionTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [dateRangeError, setDateRangeError] = useState(null);
  const [testLogs, setTestLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setTestLogs(prev => [...prev, {
      id: Date.now(),
      timestamp,
      message
    }]);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    addLog(`handleDateRangeChange: startDate=${startDate ? startDate.toISOString().split('T')[0] : 'null'}, endDate=${endDate ? endDate.toISOString().split('T')[0] : 'null'}`);
    
    // Clear previous error
    setDateRangeError(null);
    
    // Validate date range
    if (!startDate || !endDate) {
      setDateRangeError('กรุณาเลือกวันที่ให้ครบถ้วน');
      return;
    }
    
    // Reset time to compare only dates
    const startDateOnly = new Date(startDate);
    const endDateOnly = new Date(endDate);
    startDateOnly.setHours(0, 0, 0, 0);
    endDateOnly.setHours(0, 0, 0, 0);
    
    if (startDateOnly > endDateOnly) {
      setDateRangeError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }
    
    setDateRange({ startDate, endDate });
  };

  const handleStartDateChange = (date) => {
    addLog(`handleStartDateChange: date=${date ? date.toISOString().split('T')[0] : 'null'}, currentEndDate=${dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : 'null'}`);
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // Only update if we have both dates, or if endDate is null
      if (dateRange.endDate) {
        handleDateRangeChange(date, dateRange.endDate);
      } else {
        // If no endDate, set both to the same date
        handleDateRangeChange(date, date);
      }
    }
  };

  const handleEndDateChange = (date) => {
    addLog(`handleEndDateChange: date=${date ? date.toISOString().split('T')[0] : 'null'}, currentStartDate=${dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : 'null'}`);
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // Only update if we have both dates, or if startDate is null
      if (dateRange.startDate) {
        handleDateRangeChange(dateRange.startDate, date);
      } else {
        // If no startDate, set both to the same date
        handleDateRangeChange(date, date);
      }
    }
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    setDateRangeError(null);
    addLog('Dates cleared');
  };

  const clearLogs = () => {
    setTestLogs([]);
  };

  const testScenario1 = () => {
    addLog('=== Test Scenario 1: เลือกวันที่เริ่มต้นก่อน ===');
    const startDate = new Date('2025-09-01');
    handleStartDateChange(startDate);
  };

  const testScenario2 = () => {
    addLog('=== Test Scenario 2: เลือกวันที่สิ้นสุดหลังจากมีวันที่เริ่มต้น ===');
    const endDate = new Date('2025-09-12');
    handleEndDateChange(endDate);
  };

  const testScenario3 = () => {
    addLog('=== Test Scenario 3: เลือกวันที่ย้อนหลัง ===');
    const startDate = new Date('2025-09-15');
    handleStartDateChange(startDate);
  };

  const testScenario4 = () => {
    addLog('=== Test Scenario 4: เลือกวันที่ย้อนหลังหลังจากมีวันที่สิ้นสุด ===');
    const endDate = new Date('2025-09-10');
    handleEndDateChange(endDate);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('dateRangeSelectionTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Date Range Selection</h1>
          <p className="text-gray-600">ทดสอบการเลือกวันที่ย้อนหลังและปัญหาที่เกิดขึ้น</p>
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
            
            {/* Error Display */}
            {dateRangeError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800 font-medium">{dateRangeError}</span>
                </div>
              </div>
            )}
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
              
              {dateRange.startDate && dateRange.endDate && !dateRangeError && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนวัน:</label>
                  <p className="text-sm text-gray-900">
                    {Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)) + 1} วัน
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test Scenarios */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Test Scenarios</h2>
              <button onClick={clearLogs} className="btn btn-secondary">
                ล้าง Logs
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button onClick={testScenario1} className="btn btn-primary text-sm">
                Scenario 1: เลือกวันที่เริ่มต้น
              </button>
              <button onClick={testScenario2} className="btn btn-primary text-sm">
                Scenario 2: เลือกวันที่สิ้นสุด
              </button>
              <button onClick={testScenario3} className="btn btn-primary text-sm">
                Scenario 3: เลือกวันที่ย้อนหลัง
              </button>
              <button onClick={testScenario4} className="btn btn-primary text-sm">
                Scenario 4: เลือกวันที่ย้อนหลัง
              </button>
            </div>
          </div>

          {/* Test Logs */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Test Logs</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testLogs.length === 0 ? (
                <p className="text-gray-500">ยังไม่มี logs</p>
              ) : (
                testLogs.map((log) => (
                  <div key={log.id} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">ปัญหาที่พบ</h2>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">ปัญหาหลัก:</h3>
              <ul className="text-sm text-red-800 space-y-2">
                <li>• <strong>เลือกวันไหนก็กลายเป็นวันที่เดียวกัน:</strong> 12/09/2025 -> 12/09/2025</li>
                <li>• <strong>ไม่สามารถเลือกวันย้อนหลังได้:</strong> เมื่อเลือกวันที่ย้อนหลัง ระบบจะเปลี่ยนวันที่สิ้นสุดให้เป็นวันที่เดียวกัน</li>
                <li>• <strong>สาเหตุ:</strong> Fallback logic ใน handleStartDateChange และ handleEndDateChange ผิด</li>
                <li>• <strong>เดิม:</strong> <code>const currentEndDate = dateRange.endDate || date;</code></li>
                <li>• <strong>ปัญหา:</strong> เมื่อ dateRange.endDate เป็น null จะใช้ date (วันที่เริ่มต้น) เป็นวันที่สิ้นสุดด้วย</li>
              </ul>
            </div>
          </div>

          {/* Solution Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">วิธีแก้ไข</h2>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">การแก้ไขที่ทำ:</h3>
              <ul className="text-sm text-green-800 space-y-2">
                <li>• <strong>เปลี่ยน logic:</strong> ตรวจสอบว่ามีวันที่อีกฝ่ายหรือไม่ก่อน</li>
                <li>• <strong>ถ้ามี:</strong> ใช้วันที่เดิมและอัปเดตเฉพาะวันที่ที่เลือก</li>
                <li>• <strong>ถ้าไม่มี:</strong> ตั้งค่าทั้งสองวันที่เป็นวันที่เดียวกัน</li>
                <li>• <strong>ผลลัพธ์:</strong> สามารถเลือกวันย้อนหลังได้โดยไม่เปลี่ยนวันที่อีกฝ่าย</li>
              </ul>
            </div>
          </div>

          {/* Expected Behavior */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">พฤติกรรมที่คาดหวัง</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">ควรทำงานดังนี้:</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li>1. <strong>เลือกวันที่เริ่มต้น:</strong> วันที่สิ้นสุดควรเป็นวันที่เดียวกัน (ถ้ายังไม่ได้เลือก)</li>
                <li>2. <strong>เลือกวันที่สิ้นสุด:</strong> วันที่เริ่มต้นควรเป็นวันที่เดิม (ถ้าเลือกแล้ว)</li>
                <li>3. <strong>เลือกวันย้อนหลัง:</strong> วันที่อีกฝ่ายไม่ควรเปลี่ยน</li>
                <li>4. <strong>เลือกวันข้างหน้า:</strong> วันที่อีกฝ่ายไม่ควรเปลี่ยน</li>
                <li>5. <strong>Validation:</strong> แสดง error เมื่อวันที่เริ่มต้นมากกว่าวันที่สิ้นสุด</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelectionTest;
