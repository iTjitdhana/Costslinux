import React, { useState } from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'antd/dist/reset.css';
import AntdConfigProvider from './AntdConfigProvider';

// Set dayjs to use Thai locale
dayjs.locale('th');

const { RangePicker } = DatePicker;

const SimpleAntDateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange, // New callback for both dates at once
  placeholder = "เลือกช่วงวันที่",
  className = "",
  disabled = false,
  minDate,
  maxDate
}) => {
  const [value, setValue] = useState([
    startDate ? dayjs(startDate) : null,
    endDate ? dayjs(endDate) : null
  ]);
  const [validationError, setValidationError] = useState(null);

  // Update value when props change
  React.useEffect(() => {
    setValue([
      startDate ? dayjs(startDate) : null,
      endDate ? dayjs(endDate) : null
    ]);
  }, [startDate, endDate]);

  const handleChange = (dates) => {
    if (!dates || dates.length !== 2) {
      setValue([null, null]);
      setValidationError(null);
      if (onRangeChange) {
        onRangeChange(null, null);
      } else {
        onStartDateChange && onStartDateChange(null);
        onEndDateChange && onEndDateChange(null);
      }
      return;
    }

    const [start, end] = dates;
    
    // Clear previous validation error
    setValidationError(null);
    setValue([start, end]);

    // Convert dayjs to Date for compatibility
    const startDateObj = start ? start.toDate() : null;
    const endDateObj = end ? end.toDate() : null;
    
    // Use callback to update parent component
    if (onRangeChange) {
      onRangeChange(startDateObj, endDateObj);
    } else {
      // Fallback to individual callbacks
      onStartDateChange && onStartDateChange(startDateObj);
      onEndDateChange && onEndDateChange(endDateObj);
    }
  };

  return (
    <div className="w-full">
      <AntdConfigProvider>
        <RangePicker
          value={value}
          onChange={handleChange}
          placeholder={[placeholder, placeholder]}
          className={`w-full ${className} ${validationError ? 'border-red-500' : ''}`}
          disabled={disabled}
          minDate={minDate ? dayjs(minDate) : undefined}
          maxDate={maxDate ? dayjs(maxDate) : undefined}
          format="DD/MM/YYYY"
          status={validationError ? 'error' : ''}
          showTime={false}
          allowClear={true}
          size="middle"
          style={{ width: '100%' }}
        />
      </AntdConfigProvider>
      
      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationError}
        </div>
      )}
    </div>
  );
};

export default SimpleAntDateRangePicker;
