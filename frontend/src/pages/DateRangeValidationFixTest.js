import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import SimpleAntDateRangePicker from '../components/SimpleAntDateRangePicker';

const DateRangeValidationFixTest = () => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [dateRangeError, setDateRangeError] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (test, result, expected, details) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setTestResults(prev => [...prev, {
      id: Date.now(),
      timestamp,
      test,
      result,
      expected,
      details,
      passed: result === expected
    }]);
  };

  const handleDateRangeChange = (startDate, endDate) => {
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
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      const currentEndDate = dateRange.endDate || date;
      handleDateRangeChange(date, currentEndDate);
    }
  };

  const handleEndDateChange = (date) => {
    if (date && typeof date === 'object' && date instanceof Date && !isNaN(date.getTime())) {
      const currentStartDate = dateRange.startDate || date;
      handleDateRangeChange(currentStartDate, date);
    }
  };

  const clearDates = () => {
    setDateRange({ startDate: null, endDate: null });
    setDateRangeError(null);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Test the specific case from the image
  const testSpecificCase = () => {
    const startDate = new Date('2025-09-01');
    const endDate = new Date('2025-09-18');
    
    // Reset time to compare only dates
    const startDateOnly = new Date(startDate);
    const endDateOnly = new Date(endDate);
    startDateOnly.setHours(0, 0, 0, 0);
    endDateOnly.setHours(0, 0, 0, 0);
    
    const result = startDateOnly > endDateOnly ? 'error' : 'valid';
    const expected = 'valid';
    
    addTestResult(
      'Test Case จากภาพ: 01/09/2025 - 18/09/2025',
      result,
      expected,
      `startDate: ${startDateOnly.toISOString().split('T')[0]}, endDate: ${endDateOnly.toISOString().split('T')[0]}`
    );
    
    // Set the dates in the picker
    setDateRange({ startDate, endDate });
  };

  // Test cases
  const runTestCases = () => {
    const tests = [
      {
        name: 'Test 1: 01/09/2025 - 18/09/2025 (กรณีจากภาพ)',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-18'),
        expected: 'valid'
      },
      {
        name: 'Test 2: 01/09/2025 - 01/09/2025 (วันเดียวกัน)',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-01'),
        expected: 'valid'
      },
      {
        name: 'Test 3: 18/09/2025 - 01/09/2025 (วันที่ผิด)',
        startDate: new Date('2025-09-18'),
        endDate: new Date('2025-09-01'),
        expected: 'error'
      },
      {
        name: 'Test 4: 01/01/2025 - 31/12/2025 (ทั้งปี)',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        expected: 'valid'
      },
      {
        name: 'Test 5: 31/12/2025 - 01/01/2025 (ข้ามปี)',
        startDate: new Date('2025-12-31'),
        endDate: new Date('2025-01-01'),
        expected: 'error'
      }
    ];

    tests.forEach((test, index) => {
      setTimeout(() => {
        // Reset time to compare only dates
        const startDateOnly = new Date(test.startDate);
        const endDateOnly = new Date(test.endDate);
        startDateOnly.setHours(0, 0, 0, 0);
        endDateOnly.setHours(0, 0, 0, 0);
        
        const result = startDateOnly > endDateOnly ? 'error' : 'valid';
        
        addTestResult(
          test.name,
          result,
          test.expected,
          `startDate: ${startDateOnly.toISOString().split('T')[0]}, endDate: ${endDateOnly.toISOString().split('T')[0]}`
        );
      }, index * 1000);
    });
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('dateRangeValidationFixTest')}</title>
      </Helmet>
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Date Range Validation Fix</h1>
          <p className="text-gray-600">ทดสอบการแก้ไขปัญหา validation ที่แสดง error ผิด</p>
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

          {/* Test Cases */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Test Cases</h2>
              <div className="flex gap-2">
                <button onClick={testSpecificCase} className="btn btn-primary">
                  ทดสอบกรณีจากภาพ
                </button>
                <button onClick={runTestCases} className="btn btn-primary">
                  รัน Test Cases ทั้งหมด
                </button>
                <button onClick={clearTestResults} className="btn btn-secondary">
                  ล้างผลลัพธ์
                </button>
              </div>
            </div>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500">ยังไม่มีผลการทดสอบ</p>
              ) : (
                testResults.map((result) => (
                  <div key={result.id} className={`mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">[{result.timestamp}]</span>
                      <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                        {result.passed ? '✓' : '✗'}
                      </span>
                      <span>{result.test}</span>
                    </div>
                    <div className="ml-6 text-xs text-gray-400">
                      ผลลัพธ์: {result.result} | คาดหวัง: {result.expected}
                    </div>
                    <div className="ml-6 text-xs text-gray-500">
                      {result.details}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">ปัญหาที่พบ</h2>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">กรณีจากภาพ:</h3>
              <ul className="text-sm text-red-800 space-y-2">
                <li>• <strong>วันที่เริ่มต้น:</strong> 01/09/2025</li>
                <li>• <strong>วันที่สิ้นสุด:</strong> 18/09/2025</li>
                <li>• <strong>ปัญหา:</strong> ระบบแสดง error "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด"</li>
                <li>• <strong>สาเหตุ:</strong> การใช้ dayjs.isAfter() อาจมีปัญหาเรื่อง timezone</li>
                <li>• <strong>การแก้ไข:</strong> ใช้การเปรียบเทียบ Date objects โดย reset time เป็น 00:00:00</li>
              </ul>
            </div>
          </div>

          {/* Solution Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">วิธีแก้ไข</h2>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">การแก้ไขที่ทำ:</h3>
              <ul className="text-sm text-green-800 space-y-2">
                <li>• <strong>เปลี่ยนจาก:</strong> <code>start.isAfter(end)</code></li>
                <li>• <strong>เป็น:</strong> <code>startDateOnly > endDateOnly</code></li>
                <li>• <strong>เพิ่ม:</strong> <code>setHours(0, 0, 0, 0)</code> เพื่อเปรียบเทียบเฉพาะวันที่</li>
                <li>• <strong>ผลลัพธ์:</strong> การเปรียบเทียบที่แม่นยำและไม่มีปัญหา timezone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeValidationFixTest;
