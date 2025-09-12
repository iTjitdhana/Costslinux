import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './DateRangePicker.css';

const SimpleDateRangePicker = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  placeholder = "เลือกช่วงวันที่",
  className = "",
  disabled = false,
  minDate = null,
  maxDate = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [validationError, setValidationError] = useState(null);
  
  const containerRef = useRef(null);

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
    } else {
      // Auto apply when both dates are valid
      if (date && tempEndDate && date <= tempEndDate) {
        onStartDateChange(date);
        onEndDateChange(tempEndDate);
        // Auto close after a short delay
        setTimeout(() => {
          setIsOpen(false);
        }, 300);
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
    } else {
      // Auto apply when both dates are valid
      if (date && tempStartDate && date >= tempStartDate) {
        onStartDateChange(tempStartDate);
        onEndDateChange(date);
        // Auto close after a short delay
        setTimeout(() => {
          setIsOpen(false);
        }, 300);
      }
    }
  };

  // Clear dates
  const clearDates = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onStartDateChange(null);
    onEndDateChange(null);
    setValidationError(null);
  };

  // Handle input click
  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
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

  // Update temp dates when props change
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Field - Single Click to Open */}
      <div 
        className="flex items-center border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50"
        onClick={handleInputClick}
      >
        <div className="flex-1 px-3 py-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-500 flex-shrink-0" />
            <span className={`text-sm ${tempStartDate && tempEndDate ? 'text-gray-900' : 'text-gray-500'}`}>
              {tempStartDate && tempEndDate 
                ? `${formatDate(tempStartDate)} - ${formatDate(tempEndDate)}`
                : placeholder
              }
            </span>
          </div>
        </div>

        {/* Clear Button */}
        {(tempStartDate || tempEndDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearDates();
            }}
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

          {/* Usage Hint */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              💡 เลือกวันที่แล้วจะใช้ทันที - ปิดปฏิทินอัตโนมัติ
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDateRangePicker;
