import React, { useState } from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'antd/dist/reset.css';

// Set dayjs to use Thai locale
dayjs.locale('th');

const { RangePicker } = DatePicker;

const SimpleDateRangePicker = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  onRangeChange,
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
      if (onRangeChange) {
        onRangeChange(null, null);
    } else {
        onStartDateChange && onStartDateChange(null);
        onEndDateChange && onEndDateChange(null);
      }
      return;
    }
    
    const [start, end] = dates;
    setValue([start, end]);

    // Convert dayjs to Date for compatibility
    const startDateObj = start ? start.toDate() : null;
    const endDateObj = end ? end.toDate() : null;
    
    if (onRangeChange) {
      onRangeChange(startDateObj, endDateObj);
    } else {
      onStartDateChange && onStartDateChange(startDateObj);
      onEndDateChange && onEndDateChange(endDateObj);
    }
  };

  return (
    <div className="w-full">
      <RangePicker
        value={value}
        onChange={handleChange}
        placeholder={[placeholder, placeholder]}
        className={`w-full ${className}`}
                disabled={disabled}
        minDate={minDate ? dayjs(minDate) : undefined}
        maxDate={maxDate ? dayjs(maxDate) : undefined}
        format="DD/MM/YYYY"
        showTime={false}
        allowClear={true}
        size="middle"
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default SimpleDateRangePicker;