'use client';

import { useState, useRef, useEffect } from 'react';

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  theme?: 'light' | 'dark';
}

type PresetKey = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'last_week' |
                 'last_14_days' | 'this_month' | 'last_30_days' | 'last_month' | 'all_time' | 'custom';

const presets: { key: PresetKey; label: string; hasSubmenu?: boolean }[] = [
  { key: 'custom', label: 'Custom' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This week (Sun – Today)', hasSubmenu: true },
  { key: 'last_7_days', label: 'Last 7 days' },
  { key: 'last_week', label: 'Last week (Sun – Sat)' },
  { key: 'last_14_days', label: 'Last 14 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_30_days', label: 'Last 30 days' },
  { key: 'last_month', label: 'Last month' },
  { key: 'all_time', label: 'All time' },
];

function getPresetRange(key: PresetKey): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    case 'this_week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek, end: today };
    }
    case 'last_7_days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start, end: today };
    }
    case 'last_week': {
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
      return { start: startOfLastWeek, end: endOfLastWeek };
    }
    case 'last_14_days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 13);
      return { start, end: today };
    }
    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: startOfMonth, end: today };
    }
    case 'last_30_days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { start, end: today };
    }
    case 'last_month': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: startOfLastMonth, end: endOfLastMonth };
    }
    case 'all_time': {
      const start = new Date(2020, 0, 1);
      return { start, end: today };
    }
    default:
      return { start: today, end: today };
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface CalendarProps {
  year: number;
  month: number;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  onDateClick: (date: Date) => void;
  onMonthChange: (delta: number) => void;
  showNavigation?: boolean;
  theme: 'light' | 'dark';
}

function Calendar({ year, month, selectedStart, selectedEnd, onDateClick, onMonthChange, showNavigation = false, theme }: CalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isStart = selectedStart && date.toDateString() === selectedStart.toDateString();
    const isEnd = selectedEnd && date.toDateString() === selectedEnd.toDateString();
    const isInRange = selectedStart && selectedEnd && date > selectedStart && date < selectedEnd;
    const isToday = date.toDateString() === new Date().toDateString();

    days.push(
      <button
        key={day}
        type="button"
        className={`calendar-day ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${isInRange ? 'in-range' : ''} ${isToday ? 'today' : ''}`}
        onClick={() => onDateClick(date)}
      >
        {day}
      </button>
    );
  }

  return (
    <div className={`calendar ${theme}`}>
      <div className="calendar-header">
        {showNavigation && (
          <button type="button" className="nav-btn" onClick={() => onMonthChange(-1)}>‹</button>
        )}
        <span className="month-name">{monthName}</span>
        {showNavigation && (
          <button type="button" className="nav-btn" onClick={() => onMonthChange(1)}>›</button>
        )}
      </div>
      <div className="calendar-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="weekday">{d}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {days}
      </div>

      <style jsx>{`
        .calendar {
          width: 280px;
        }
        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 0 16px;
        }
        .month-name {
          font-size: 14px;
          font-weight: 600;
          color: ${theme === 'light' ? '#1e293b' : '#f1f5f9'};
        }
        .nav-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          font-size: 18px;
          cursor: pointer;
        }
        .nav-btn:hover {
          background: ${theme === 'light' ? '#f1f5f9' : '#334155'};
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }
        .weekday {
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: ${theme === 'light' ? '#94a3b8' : '#64748b'};
          padding: 4px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border: none;
          background: transparent;
          border-radius: 50%;
          cursor: pointer;
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
          transition: all 0.15s ease;
        }
        .calendar-day.empty {
          cursor: default;
        }
        .calendar-day:not(.empty):hover {
          background: ${theme === 'light' ? '#f1f5f9' : '#334155'};
        }
        .calendar-day.today {
          font-weight: 600;
          color: #10b981;
        }
        .calendar-day.start,
        .calendar-day.end {
          background: #10b981 !important;
          color: white !important;
        }
        .calendar-day.in-range {
          background: ${theme === 'light' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.2)'};
          border-radius: 0;
        }
        .calendar-day.start {
          border-radius: 50% 0 0 50%;
        }
        .calendar-day.end {
          border-radius: 0 50% 50% 0;
        }
        .calendar-day.start.end {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

export default function DateRangePicker({ value, onChange, theme = 'dark' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('last_7_days');
  const [tempStart, setTempStart] = useState<Date | null>(value.start);
  const [tempEnd, setTempEnd] = useState<Date | null>(value.end);
  const [selectingStart, setSelectingStart] = useState(true);
  const [leftMonth, setLeftMonth] = useState(new Date().getMonth());
  const [leftYear, setLeftYear] = useState(new Date().getFullYear());
  const [customDaysToToday, setCustomDaysToToday] = useState('30');
  const [customDaysToYesterday, setCustomDaysToYesterday] = useState('30');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate right calendar month (next month)
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (key: PresetKey) => {
    setSelectedPreset(key);
    if (key !== 'custom') {
      const range = getPresetRange(key);
      setTempStart(range.start);
      setTempEnd(range.end);
    }
  };

  const handleDateClick = (date: Date) => {
    if (selectingStart || (tempStart && date < tempStart)) {
      setTempStart(date);
      setTempEnd(null);
      setSelectingStart(false);
      setSelectedPreset('custom');
    } else {
      setTempEnd(date);
      setSelectingStart(true);
      setSelectedPreset('custom');
    }
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = leftMonth + delta;
    let newYear = leftYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setLeftMonth(newMonth);
    setLeftYear(newYear);
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange({ start: tempStart, end: tempEnd });
      setIsOpen(false);
    }
  };

  const handleCustomDays = (days: number, toYesterday: boolean) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = toYesterday ? new Date(today.getTime() - 86400000) : today;
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    setTempStart(start);
    setTempEnd(end);
    setSelectedPreset('custom');
  };

  return (
    <div className={`date-range-picker ${theme}`} ref={dropdownRef}>
      <button
        type="button"
        className="trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="date-icon">📅</span>
        <span className="date-text">
          {formatDate(value.start)} – {formatDate(value.end)}
        </span>
        <span className="chevron">▼</span>
      </button>

      {isOpen && (
        <div className="dropdown">
          <div className="dropdown-content">
            {/* Left sidebar - Presets */}
            <div className="presets-sidebar">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`preset-btn ${selectedPreset === preset.key ? 'active' : ''}`}
                  onClick={() => handlePresetClick(preset.key)}
                >
                  {preset.label}
                  {preset.hasSubmenu && <span className="submenu-arrow">›</span>}
                </button>
              ))}

              <div className="custom-days-section">
                <div className="custom-days-row">
                  <input
                    type="number"
                    value={customDaysToToday}
                    onChange={(e) => setCustomDaysToToday(e.target.value)}
                    className="days-input"
                    min="1"
                    max="365"
                  />
                  <span className="days-label">days to<br/>today</span>
                  <button
                    type="button"
                    className="go-btn"
                    onClick={() => handleCustomDays(parseInt(customDaysToToday) || 30, false)}
                  >
                    Go
                  </button>
                </div>
                <div className="custom-days-row">
                  <input
                    type="number"
                    value={customDaysToYesterday}
                    onChange={(e) => setCustomDaysToYesterday(e.target.value)}
                    className="days-input"
                    min="1"
                    max="365"
                  />
                  <span className="days-label">days to<br/>yesterday</span>
                  <button
                    type="button"
                    className="go-btn"
                    onClick={() => handleCustomDays(parseInt(customDaysToYesterday) || 30, true)}
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="compare-row">
                <span>Compare</span>
                <button
                  type="button"
                  className={`toggle ${compareEnabled ? 'active' : ''}`}
                  onClick={() => setCompareEnabled(!compareEnabled)}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>

            {/* Right side - Calendars */}
            <div className="calendars-section">
              <div className="date-range-header">
                <span className="range-dot" />
                <span className="range-label">DATE RANGE</span>
              </div>

              <div className="date-inputs">
                <input
                  type="text"
                  value={tempStart ? formatDateInput(tempStart) : ''}
                  readOnly
                  className="date-input start"
                />
                <span className="date-separator">to</span>
                <input
                  type="text"
                  value={tempEnd ? formatDateInput(tempEnd) : ''}
                  readOnly
                  className="date-input"
                />
              </div>

              <div className="calendars-grid">
                <Calendar
                  year={leftYear}
                  month={leftMonth}
                  selectedStart={tempStart}
                  selectedEnd={tempEnd}
                  onDateClick={handleDateClick}
                  onMonthChange={handleMonthChange}
                  showNavigation
                  theme={theme}
                />
                <Calendar
                  year={rightYear}
                  month={rightMonth}
                  selectedStart={tempStart}
                  selectedEnd={tempEnd}
                  onDateClick={handleDateClick}
                  onMonthChange={() => {}}
                  theme={theme}
                />
              </div>

              <div className="actions">
                <button type="button" className="cancel-btn" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="apply-btn"
                  onClick={handleApply}
                  disabled={!tempStart || !tempEnd}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .date-range-picker {
          position: relative;
          display: inline-block;
        }

        .trigger-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: ${theme === 'light' ? '#ffffff' : '#1e293b'};
          border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
          border-radius: 8px;
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .trigger-btn:hover {
          border-color: ${theme === 'light' ? '#cbd5e1' : '#475569'};
        }

        .date-icon {
          font-size: 16px;
        }

        .chevron {
          font-size: 10px;
          color: ${theme === 'light' ? '#94a3b8' : '#64748b'};
        }

        .dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          background: ${theme === 'light' ? '#ffffff' : '#1e293b'};
          border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
          border-radius: 12px;
          box-shadow: 0 20px 60px ${theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.4)'};
          z-index: 1000;
          overflow: hidden;
        }

        .dropdown-content {
          display: flex;
        }

        .presets-sidebar {
          width: 200px;
          padding: 12px 0;
          border-right: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
        }

        .preset-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .preset-btn:hover {
          background: ${theme === 'light' ? '#f1f5f9' : '#334155'};
        }

        .preset-btn.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .submenu-arrow {
          color: ${theme === 'light' ? '#94a3b8' : '#64748b'};
        }

        .custom-days-section {
          padding: 16px;
          border-top: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
          margin-top: 8px;
        }

        .custom-days-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .days-input {
          width: 48px;
          padding: 8px;
          background: ${theme === 'light' ? '#f8fafc' : '#0f172a'};
          border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
          border-radius: 6px;
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
          font-size: 13px;
          text-align: center;
        }

        .days-label {
          flex: 1;
          font-size: 12px;
          color: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          line-height: 1.3;
        }

        .go-btn {
          padding: 6px 12px;
          background: transparent;
          border: none;
          color: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          font-size: 12px;
          cursor: pointer;
        }

        .go-btn:hover {
          color: #10b981;
        }

        .compare-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          margin-top: 8px;
        }

        .compare-row span {
          font-size: 13px;
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
        }

        .toggle {
          width: 40px;
          height: 22px;
          background: ${theme === 'light' ? '#e2e8f0' : '#334155'};
          border: none;
          border-radius: 11px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .toggle.active {
          background: #10b981;
        }

        .toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s ease;
        }

        .toggle.active .toggle-knob {
          transform: translateX(18px);
        }

        .calendars-section {
          padding: 20px;
        }

        .date-range-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .range-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .range-label {
          font-size: 11px;
          font-weight: 600;
          color: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          letter-spacing: 0.5px;
        }

        .date-inputs {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .date-input {
          padding: 10px 14px;
          background: ${theme === 'light' ? '#f8fafc' : '#0f172a'};
          border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
          border-radius: 8px;
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
          font-size: 14px;
          width: 120px;
        }

        .date-input.start {
          border-color: #10b981;
        }

        .date-separator {
          color: ${theme === 'light' ? '#94a3b8' : '#64748b'};
          font-size: 13px;
        }

        .calendars-grid {
          display: flex;
          gap: 32px;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'};
        }

        .cancel-btn {
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          font-size: 14px;
          cursor: pointer;
        }

        .cancel-btn:hover {
          color: ${theme === 'light' ? '#334155' : '#e2e8f0'};
        }

        .apply-btn {
          padding: 10px 24px;
          background: #10b981;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .apply-btn:hover {
          background: #059669;
        }

        .apply-btn:disabled {
          background: ${theme === 'light' ? '#e2e8f0' : '#334155'};
          color: ${theme === 'light' ? '#94a3b8' : '#64748b'};
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
