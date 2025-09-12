import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const DateRangeQuickTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [dateRangeError, setDateRangeError] = useState(null);
  const [testSteps, setTestSteps] = useState([]);

  const addTestStep = (step, result) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setTestSteps(prev => [...prev, {
      id: Date.now(),
      timestamp,
      step,
      result
    }]);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    addTestStep(
      `handleDateRangeChange called`,
      `startDate: ${startDate ? startDate.toISOString().split('T')[0] : 'null'}, endDate: ${endDate ? endDate.toISOString().split('T')[0] : 'null'}`
    );
    
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
    addTestStep('Date range updated successfully', 'No errors');
  };

  const handleStartDateChange = (date) => {
    addTestStep(
      `handleStartDateChange called`,
      `date: ${date ? date.toISOString().split('T')[0] : 'null'}, currentEndDate: ${dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : 'null'}`
    );
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // Only update if we have both dates, or if endDate is null
      if (dateRange.endDate) {
        addTestStep('Using existing endDate', dateRange.endDate.toISOString().split('T')[0]);
        handleDateRangeChange(date, dateRange.endDate);
      } else {
        addTestStep('No endDate, setting both to same date', date.toISOString().split('T')[0]);
        handleDateRangeChange(date, date);
      }
    }
  };

  const handleEndDateChange = (date) => {
    addTestStep(
      `handleEndDateChange called`,
      `date: ${date ? date.toISOString().split('T')[0] : 'null'}, currentStartDate: ${dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : 'null'}`
    );
    
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      // Only update if we have both dates, or if startDate is null
      if (dateRange.startDate) {
        addTestStep('Using existing startDate', dateRange.startDate.toISOString().split('T')[0]);
        handleDateRangeChange(dateRange.startDate, date);
      } else {
        addTestStep('No startDate, setting both to same date', date.toISOString().split('T')[0]);
        handleDateRangeChange(date, date);
      }
    }
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    setDateRangeError(null);
    setTestSteps([]);
    addTestStep('Dates cleared', 'All states reset');
  };

  const clearTestSteps = () => {
    setTestSteps([]);
  };

  const runQuickTest = () => {
    addTestStep('=== Starting Quick Test ===', '');
    
    // Test 1: Select start date
    const startDate = new Date('2025-09-01');
    addTestStep('Test 1: Selecting start date', '01/09/2025');
    handleStartDateChange(startDate);
    
    // Test 2: Select end date
    setTimeout(() => {
      const endDate = new Date('2025-09-12');
      addTestStep('Test 2: Selecting end date', '12/09/2025');
      handleEndDateChange(endDate);
    }, 1000);
    
    // Test 3: Select earlier date
    setTimeout(() => {
      const earlierDate = new Date('2025-09-15');
      addTestStep('Test 3: Selecting earlier date (should not change end date)', '15/09/2025');
      handleStartDateChange(earlierDate);
    }, 2000);
    
    // Test 4: Select later date
    setTimeout(() => {
      const laterDate = new Date('2025-09-20');
      addTestStep('Test 4: Selecting later date (should not change start date)', '20/09/2025');
      handleEndDateChange(laterDate);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('dateRangeQuickTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Date Range Picker (Quick Test)</h1>
          <p className="text-gray-600">ทดสอบการเลือกวันที่แบบง่ายๆ โดยไม่ต้องรัน server</p>
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
                <button onClick={runQuickTest} className="btn btn-primary">
                  รัน Quick Test
                </button>
                <button onClick={clearTestSteps} className="btn btn-secondary">
                  ล้าง Logs
                </button>
              </div>
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

          {/* Test Steps Log */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Test Steps Log</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testSteps.length === 0 ? (
                <p className="text-gray-500">ยังไม่มี test steps</p>
              ) : (
                testSteps.map((step) => (
                  <div key={step.id} className="mb-1">
                    <span className="text-gray-500">[{step.timestamp}]</span> <span className="text-blue-400">{step.step}</span>
                    <div className="ml-4 text-gray-400">{step.result}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Instructions */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">คำแนะนำการทดสอบ</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">ทดสอบด้วยตนเอง:</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li>1. <strong>เลือกวันที่เริ่มต้น:</strong> คลิกที่ date picker และเลือกวันที่เริ่มต้น (เช่น 01/09/2025)</li>
                <li>2. <strong>เลือกวันที่สิ้นสุด:</strong> เลือกวันที่สิ้นสุด (เช่น 12/09/2025)</li>
                <li>3. <strong>ทดสอบการเลือกวันย้อนหลัง:</strong> เลือกวันที่เริ่มต้นเป็นวันที่ย้อนหลัง (เช่น 15/09/2025)</li>
                <li>4. <strong>ทดสอบการเลือกวันข้างหน้า:</strong> เลือกวันที่สิ้นสุดเป็นวันที่ข้างหน้า (เช่น 20/09/2025)</li>
                <li>5. <strong>ตรวจสอบ Logs:</strong> ดู test steps log เพื่อตรวจสอบการทำงาน</li>
              </ol>
            </div>
          </div>

          {/* Expected Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">ผลลัพธ์ที่คาดหวัง</h2>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">ควรทำงานดังนี้:</h3>
              <ul className="text-sm text-green-800 space-y-2">
                <li>• <strong>เลือกวันที่เริ่มต้น:</strong> วันที่สิ้นสุดควรเป็นวันที่เดียวกัน (ถ้ายังไม่ได้เลือก)</li>
                <li>• <strong>เลือกวันที่สิ้นสุด:</strong> วันที่เริ่มต้นควรเป็นวันที่เดิม (ถ้าเลือกแล้ว)</li>
                <li>• <strong>เลือกวันย้อนหลัง:</strong> วันที่สิ้นสุดไม่ควรเปลี่ยน</li>
                <li>• <strong>เลือกวันข้างหน้า:</strong> วันที่เริ่มต้นไม่ควรเปลี่ยน</li>
                <li>• <strong>Validation:</strong> แสดง error เมื่อวันที่เริ่มต้นมากกว่าวันที่สิ้นสุด</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeQuickTest;
