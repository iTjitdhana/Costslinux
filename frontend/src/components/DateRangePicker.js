import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './DateRangePicker.css';

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  placeholder = "เลือกช่วงวันที่",
  className = "",
  disabled = false,
  minDate = null,
  maxDate = null,
  autoApply = true // ใหม่: ใช้ค่าวันที่ทันทีโดยไม่ต้องกดปุ่มตกลง
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeInput, setActiveInput] = useState(null); // 'start' or 'end'
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [validationError, setValidationError] = useState(null);
  
  const containerRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Handle start date change
  const handleStartDateChange = (date) => {
    // More comprehensive date validation
    if (!date || typeof date !== 'object' || !(date instanceof Date) || isNaN(date.getTime())) {
      setTempStartDate(null);
      return;
    }
    
    setTempStartDate(date);
    setValidationError(null);
    
    // If end date exists and start date is after end date, show validation error
    if (date && tempEndDate && date > tempEndDate) {
      setValidationError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      setActiveInput('start');
    } else {
      setActiveInput(null);
      // Auto apply if enabled and both dates are valid
      if (autoApply && date && tempEndDate && date <= tempEndDate) {
        onStartDateChange(date);
        onEndDateChange(tempEndDate);
      }
    }
  };

  // Handle end date change
  const handleEndDateChange = (date) => {
    // More comprehensive date validation
    if (!date || typeof date !== 'object' || !(date instanceof Date) || isNaN(date.getTime())) {
      setTempEndDate(null);
      return;
    }
    
    setTempEndDate(date);
    setValidationError(null);
    
    // If start date exists and end date is before start date, show validation error
    if (date && tempStartDate && date < tempStartDate) {
      setValidationError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      setActiveInput('end');
    } else {
      setActiveInput(null);
      // Auto apply if enabled and both dates are valid
      if (autoApply && date && tempStartDate && date >= tempStartDate) {
        onStartDateChange(tempStartDate);
        onEndDateChange(date);
      }
    }
  };

  // Apply date selection
  const applySelection = () => {
    if (validationError) {
      return; // Don't apply if there's validation error
    }
    
    onStartDateChange(tempStartDate);
    onEndDateChange(tempEndDate);
    setIsOpen(false);
    setActiveInput(null);
  };

  // Clear dates
  const clearDates = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onStartDateChange(null);
    onEndDateChange(null);
    setValidationError(null);
    setActiveInput(null);
  };

  // Handle input click
  const handleInputClick = (inputType) => {
    if (disabled) return;
    setActiveInput(inputType);
    setIsOpen(true);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveInput(null);
        // Reset temp dates to current values
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setValidationError(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [startDate, endDate]);

  // Auto close when both dates are selected (if autoApply is enabled)
  useEffect(() => {
    if (autoApply && tempStartDate && tempEndDate && !validationError) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setActiveInput(null);
      }, 500); // Close after 0.5 seconds
      return () => clearTimeout(timer);
    }
  }, [tempStartDate, tempEndDate, validationError, autoApply]);

  // Update temp dates when props change
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Fields */}
      <div className="flex items-center border border-gray-300 rounded-md bg-white">
        {/* Start Date Input */}
        <div 
          className={`flex-1 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
            activeInput === 'start' ? 'bg-blue-50 border-blue-300' : ''
          } ${validationError && activeInput === 'start' ? 'border-red-300 bg-red-50' : ''}`}
          onClick={() => handleInputClick('start')}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-500 flex-shrink-0" />
            <span className={`text-sm ${tempStartDate ? 'text-gray-900' : 'text-gray-500'}`}>
              {tempStartDate ? formatDate(tempStartDate) : 'วันเริ่มต้น'}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="px-2 text-gray-400 text-sm">ถึง</div>

        {/* End Date Input */}
        <div 
          className={`flex-1 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
            activeInput === 'end' ? 'bg-blue-50 border-blue-300' : ''
          } ${validationError && activeInput === 'end' ? 'border-red-300 bg-red-50' : ''}`}
          onClick={() => handleInputClick('end')}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-500 flex-shrink-0" />
            <span className={`text-sm ${tempEndDate ? 'text-gray-900' : 'text-gray-500'}`}>
              {tempEndDate ? formatDate(tempEndDate) : 'วันสิ้นสุด'}
            </span>
          </div>
        </div>

        {/* Clear Button */}
        {(tempStartDate || tempEndDate) && (
          <button
            onClick={clearDates}
            className="px-2 py-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
          <div className="flex gap-4">
            {/* Combined Calendar with 2 months side by side */}
            <div className="flex-shrink-0">
              <div className="text-sm font-medium text-gray-700 mb-2 text-center">
                เลือกช่วงวันที่
              </div>
              <DatePicker
                selected={tempStartDate}
                onChange={(date) => {
                  // More comprehensive date validation
                  if (!date || typeof date !== 'object' || !(date instanceof Date) || isNaN(date.getTime())) {
                    return;
                  }
                  
                  if (!tempStartDate) {
                    // First selection - set as start date
                    handleStartDateChange(date);
                  } else if (!tempEndDate) {
                    // Second selection - set as end date
                    if (date >= tempStartDate) {
                      handleEndDateChange(date);
                    } else {
                      // If selected date is before start date, swap them
                      handleEndDateChange(tempStartDate);
                      handleStartDateChange(date);
                    }
                  } else {
                    // Reset and start over
                    handleStartDateChange(date);
                    handleEndDateChange(null);
                  }
                }}
                selectsRange
                startDate={tempStartDate}
                endDate={tempEndDate}
                minDate={minDate}
                maxDate={maxDate}
                inline
                calendarClassName="border-0"
                disabled={disabled}
                monthsShown={2}
                showMonthYearPicker={false}
                // Show current month and next month
                openToDate={new Date()}
              />
            </div>
          </div>

          {/* Action Buttons - Only show if autoApply is disabled */}
          {!autoApply && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveInput(null);
                  setTempStartDate(startDate);
                  setTempEndDate(endDate);
                  setValidationError(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                type="button"
              >
                ยกเลิก
              </button>
              <button
                onClick={applySelection}
                disabled={validationError}
                className={`px-4 py-2 text-sm rounded-md ${
                  validationError
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                type="button"
              >
                ตกลง
              </button>
            </div>
          )}

          {/* Auto apply hint */}
          {autoApply && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                💡 เลือกวันที่แล้วจะใช้ทันที - ปิดปฏิทินอัตโนมัติ
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
