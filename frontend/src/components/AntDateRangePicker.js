import React, { useState } from 'react';
import { DatePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';
import thTH from 'antd/locale/th_TH';

const { RangePicker } = DatePicker;

const AntDateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  placeholder = "เลือกช่วงวันที่",
  className = "",
  disabled = false,
  minDate,
  maxDate,
  autoApply = true
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
      onStartDateChange(null);
      onEndDateChange(null);
      return;
    }

    const [start, end] = dates;
    setValue([start, end]);

    if (autoApply) {
      // Convert dayjs to Date for compatibility
      onStartDateChange(start ? start.toDate() : null);
      onEndDateChange(end ? end.toDate() : null);
    }
  };

  const handleOpenChange = (open) => {
    if (!open && !autoApply) {
      // Apply changes when picker closes
      if (value && value.length === 2 && value[0] && value[1]) {
        onStartDateChange(value[0] ? value[0].toDate() : null);
        onEndDateChange(value[1] ? value[1].toDate() : null);
      }
    }
  };

  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 6,
        },
      }}
    >
      <RangePicker
        value={value}
        onChange={handleChange}
        onOpenChange={handleOpenChange}
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
    </ConfigProvider>
  );
};

export default AntDateRangePicker;
