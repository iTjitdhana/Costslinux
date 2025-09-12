import React, { useState, useEffect } from 'react';

const NativeDateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  placeholder = "เลือกช่วงวันที่",
  className = "",
  disabled = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [validationError, setValidationError] = useState('');

  // Update temp dates when props change
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  // Format date for display
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return '';
  };

  // Format date for input
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return '';
  };

  // Handle start date change
  const handleStartDateChange = (e) => {
    const value = e.target.value;
    if (!value) {
      setTempStartDate(null);
      setValidationError('');
      return;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      setValidationError('วันที่ไม่ถูกต้อง');
      return;
    }

    setTempStartDate(date);
    setValidationError('');

    // If end date exists and start date is after end date, show validation error
    if (tempEndDate && date > tempEndDate) {
      setValidationError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
    } else {
      // Auto apply when both dates are valid
      if (tempEndDate && date <= tempEndDate) {
        onStartDateChange(date);
        onEndDateChange(tempEndDate);
      }
    }
  };

  // Handle end date change
  const handleEndDateChange = (e) => {
    const value = e.target.value;
    if (!value) {
      setTempEndDate(null);
      setValidationError('');
      return;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      setValidationError('วันที่ไม่ถูกต้อง');
      return;
    }

    setTempEndDate(date);
    setValidationError('');

    // If start date exists and end date is before start date, show validation error
    if (tempStartDate && date < tempStartDate) {
      setValidationError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
    } else {
      // Auto apply when both dates are valid
      if (tempStartDate && date >= tempStartDate) {
        onStartDateChange(tempStartDate);
        onEndDateChange(date);
      }
    }
  };

  // Clear dates
  const clearDates = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onStartDateChange(null);
    onEndDateChange(null);
    setValidationError('');
  };

  // Handle input click
  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.native-date-range-picker')) {
        setIsOpen(false);
        // Reset temp dates to current values
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setValidationError('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, startDate, endDate]);

  return (
    <div className={`native-date-range-picker relative ${className}`}>
      {/* Input Display */}
      <div
        className={`input cursor-pointer flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleInputClick}
      >
        <span className="text-gray-700">
          {tempStartDate && tempEndDate
            ? `${formatDateForDisplay(tempStartDate)} - ${formatDateForDisplay(tempEndDate)}`
            : placeholder
          }
        </span>
        <span className="text-gray-400">📅</span>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Date Inputs Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-96">
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700 text-center">
              เลือกช่วงวันที่
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={formatDateForInput(tempStartDate)}
                  onChange={handleStartDateChange}
                  min={minDate ? formatDateForInput(minDate) : undefined}
                  max={maxDate ? formatDateForInput(maxDate) : undefined}
                  className="input w-full"
                  disabled={disabled}
                />
              </div>

              {/* End Date Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={formatDateForInput(tempEndDate)}
                  onChange={handleEndDateChange}
                  min={tempStartDate ? formatDateForInput(tempStartDate) : (minDate ? formatDateForInput(minDate) : undefined)}
                  max={maxDate ? formatDateForInput(maxDate) : undefined}
                  className="input w-full"
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={clearDates}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                disabled={disabled}
              >
                ล้างค่า
              </button>
              <button
                onClick={() => {
                  if (tempStartDate && tempEndDate && !validationError) {
                    onStartDateChange(tempStartDate);
                    onEndDateChange(tempEndDate);
                    setIsOpen(false);
                  }
                }}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!tempStartDate || !tempEndDate || !!validationError || disabled}
              >
                ตกลง
              </button>
            </div>

            {/* Usage Hint */}
            <div className="text-xs text-gray-500 text-center">
              💡 เลือกวันที่เริ่มต้นแล้วเลือกวันที่สิ้นสุด
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NativeDateRangePicker;
