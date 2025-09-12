import React, { useState, useEffect } from 'react';
import { DatePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'antd/dist/reset.css';

// Set dayjs to use Thai locale
dayjs.locale('th');

const CustomDateRangePicker = ({
  startDate,
  endDate,
  onRangeChange,
  placeholder = "เลือกช่วงวันที่",
  className = "",
  disabled = false,
  minDate,
  maxDate
}) => {
  const [startValue, setStartValue] = useState(startDate ? dayjs(startDate) : null);
  const [endValue, setEndValue] = useState(endDate ? dayjs(endDate) : null);
  const [validationError, setValidationError] = useState(null);

  // Update values when props change
  useEffect(() => {
    setStartValue(startDate ? dayjs(startDate) : null);
    setEndValue(endDate ? dayjs(endDate) : null);
  }, [startDate, endDate]);

  const handleStartChange = (date) => {
    setStartValue(date);
    setValidationError(null);
    
    if (date && endValue) {
      const startDateObj = date.toDate();
      const endDateObj = endValue.toDate();
      
      // Reset time to 00:00:00 to compare only dates
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(0, 0, 0, 0);
      
      if (startDateObj > endDateObj) {
        // Auto-correct: set both to the selected start date
        setEndValue(date);
        onRangeChange(date.toDate(), date.toDate());
      } else {
        onRangeChange(date.toDate(), endDateObj);
      }
    } else if (date) {
      // If no end date, set both to start date
      setEndValue(date);
      onRangeChange(date.toDate(), date.toDate());
    } else {
      onRangeChange(null, endValue ? endValue.toDate() : null);
    }
  };

  const handleEndChange = (date) => {
    setEndValue(date);
    setValidationError(null);
    
    if (date && startValue) {
      const startDateObj = startValue.toDate();
      const endDateObj = date.toDate();
      
      // Reset time to 00:00:00 to compare only dates
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(0, 0, 0, 0);
      
      if (startDateObj > endDateObj) {
        // Auto-correct: set both to the selected end date
        setStartValue(date);
        onRangeChange(date.toDate(), date.toDate());
      } else {
        onRangeChange(startDateObj, date.toDate());
      }
    } else if (date) {
      // If no start date, set both to end date
      setStartValue(date);
      onRangeChange(date.toDate(), date.toDate());
    } else {
      onRangeChange(startValue ? startValue.toDate() : null, null);
    }
  };

  return (
    <div className="w-full">
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#10b981',
            borderRadius: 6,
            colorError: '#ef4444',
          },
        }}
      >
        <div className="flex items-center gap-2">
          <DatePicker
            value={startValue}
            onChange={handleStartChange}
            placeholder="วันที่เริ่มต้น"
            className={`flex-1 ${className} ${validationError ? 'border-red-500' : ''}`}
            disabled={disabled}
            minDate={minDate ? dayjs(minDate) : undefined}
            maxDate={maxDate ? dayjs(maxDate) : undefined}
            format="DD/MM/YYYY"
            status={validationError ? 'error' : ''}
            locale={{
              lang: {
                locale: 'th_TH',
                placeholder: 'เลือกวันที่',
                today: 'วันนี้',
                now: 'ตอนนี้',
                backToToday: 'กลับไปวันนี้',
                ok: 'ตกลง',
                clear: 'ล้าง',
                month: 'เดือน',
                year: 'ปี',
                monthSelect: 'เลือกเดือน',
                yearSelect: 'เลือกปี',
                shortWeekDays: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
                shortMonths: [
                  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
                ],
                months: [
                  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                ]
              }
            }}
          />
          <span className="text-gray-500">→</span>
          <DatePicker
            value={endValue}
            onChange={handleEndChange}
            placeholder="วันที่สิ้นสุด"
            className={`flex-1 ${className} ${validationError ? 'border-red-500' : ''}`}
            disabled={disabled}
            minDate={minDate ? dayjs(minDate) : undefined}
            maxDate={maxDate ? dayjs(maxDate) : undefined}
            format="DD/MM/YYYY"
            status={validationError ? 'error' : ''}
            locale={{
              lang: {
                locale: 'th_TH',
                placeholder: 'เลือกวันที่',
                today: 'วันนี้',
                now: 'ตอนนี้',
                backToToday: 'กลับไปวันนี้',
                ok: 'ตกลง',
                clear: 'ล้าง',
                month: 'เดือน',
                year: 'ปี',
                monthSelect: 'เลือกเดือน',
                yearSelect: 'เลือกปี',
                shortWeekDays: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
                shortMonths: [
                  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
                ],
                months: [
                  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                ]
              }
            }}
          />
        </div>
        
        {validationError && (
          <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{validationError}</span>
          </div>
        )}
      </ConfigProvider>
    </div>
  );
};

export default CustomDateRangePicker;
