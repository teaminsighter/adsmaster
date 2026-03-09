'use client';

import { useState, useRef, useEffect } from 'react';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compareEnabled?: boolean;
  onCompareChange?: (enabled: boolean, range?: DateRange) => void;
}

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'last7' | 'lastWeek' | 'last14' | 'thisMonth' | 'last30' | 'lastMonth' | 'allTime' | 'custom';

const PRESETS: { key: PresetKey; label: string; hasArrow?: boolean }[] = [
  { key: 'custom', label: 'Custom' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This week (Sun – Today)', hasArrow: true },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'lastWeek', label: 'Last week (Sun – Sat)', hasArrow: true },
  { key: 'last14', label: 'Last 14 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'allTime', label: 'All time' },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function getPresetRange(key: PresetKey): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);

  switch (key) {
    case 'today':
      return { start: today, end: todayEnd };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek, end: todayEnd };
    }
    case 'last7': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start, end: todayEnd };
    }
    case 'lastWeek': {
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
      return { start: startOfLastWeek, end: endOfLastWeek };
    }
    case 'last14': {
      const start = new Date(today);
      start.setDate(today.getDate() - 13);
      return { start, end: todayEnd };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: startOfMonth, end: todayEnd };
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { start, end: todayEnd };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: startOfLastMonth, end: endOfLastMonth };
    }
    case 'allTime': {
      const start = new Date(2020, 0, 1);
      return { start, end: todayEnd };
    }
    default:
      return { start: today, end: todayEnd };
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function DateRangePicker({ value, onChange, compareEnabled, onCompareChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('last7');
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [selectingStart, setSelectingStart] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [customDaysToToday, setCustomDaysToToday] = useState('30');
  const [customDaysToYesterday, setCustomDaysToYesterday] = useState('30');
  const [compare, setCompare] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get second month (next month from viewMonth)
  const secondMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  const handlePresetClick = (key: PresetKey) => {
    setSelectedPreset(key);
    if (key !== 'custom') {
      const range = getPresetRange(key);
      setTempRange(range);
    }
  };

  const handleDayClick = (date: Date) => {
    if (selectingStart) {
      setTempRange({ start: date, end: date });
      setSelectingStart(false);
      setSelectedPreset('custom');
    } else {
      if (date < tempRange.start) {
        setTempRange({ start: date, end: tempRange.start });
      } else {
        setTempRange({ ...tempRange, end: date });
      }
      setSelectingStart(true);
      setSelectedPreset('custom');
    }
  };

  const handleApply = () => {
    onChange(tempRange);
    if (onCompareChange) {
      onCompareChange(compare);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempRange(value);
    setIsOpen(false);
  };

  const navigateMonth = (direction: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + direction, 1));
  };

  const handleCustomDays = (days: number, toYesterday: boolean) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = toYesterday ? new Date(today.getTime() - 86400000) : today;
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    setTempRange({ start, end });
    setSelectedPreset('custom');
  };

  const renderCalendar = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const firstDay = getFirstDayOfMonth(year, monthIndex);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div style={{ width: '224px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          {MONTHS[monthIndex]} {year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
          {DAYS.map((day, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '4px', fontWeight: 500 }}>
              {day}
            </div>
          ))}
          {days.map((day, i) => {
            if (day === null) return <div key={i} />;
            const date = new Date(year, monthIndex, day);
            const isStart = isSameDay(date, tempRange.start);
            const isEnd = isSameDay(date, tempRange.end);
            const inRange = isInRange(date, tempRange.start, tempRange.end);
            const isToday = isSameDay(date, today);
            const isFuture = date > today;

            return (
              <button
                key={i}
                onClick={() => !isFuture && handleDayClick(date)}
                disabled={isFuture}
                style={{
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  borderRadius: isStart || isEnd ? '50%' : '0',
                  background: isStart || isEnd
                    ? 'var(--primary)'
                    : inRange
                    ? 'var(--primary-light)'
                    : 'transparent',
                  color: isStart || isEnd
                    ? 'white'
                    : isFuture
                    ? 'var(--text-tertiary)'
                    : isToday
                    ? 'var(--primary)'
                    : 'var(--text-primary)',
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: isToday ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigateMonth(-1)}
          style={{ padding: '4px 8px' }}
        >
          ‹
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigateMonth(1)}
          style={{ padding: '4px 8px' }}
        >
          ›
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary btn-sm"
          style={{ gap: '8px', minWidth: '200px', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📅</span>
            <span>{PRESETS.find(p => p.key === selectedPreset)?.label || 'Custom'}</span>
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>▼</span>
        </button>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '6px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            border: '1px solid var(--border-default)',
          }}
        >
          {formatDate(value.start)} – {formatDate(value.end)}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding: '6px' }} title="Refresh">
          🔄
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Left: Presets */}
          <div style={{
            width: '200px',
            borderRight: '1px solid var(--border-default)',
            padding: '12px 0',
          }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset.key)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: selectedPreset === preset.key ? 'var(--primary-light)' : 'transparent',
                  color: selectedPreset === preset.key ? 'var(--primary)' : 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {preset.label}
                {preset.hasArrow && <span style={{ color: 'var(--text-tertiary)' }}>›</span>}
              </button>
            ))}

            {/* Custom days inputs */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number"
                  value={customDaysToToday}
                  onChange={(e) => setCustomDaysToToday(e.target.value)}
                  style={{
                    width: '50px',
                    padding: '4px 8px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>days to today</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', fontSize: '11px' }}
                  onClick={() => handleCustomDays(parseInt(customDaysToToday) || 30, false)}
                >
                  Go
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={customDaysToYesterday}
                  onChange={(e) => setCustomDaysToYesterday(e.target.value)}
                  style={{
                    width: '50px',
                    padding: '4px 8px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>days to yesterday</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', fontSize: '11px' }}
                  onClick={() => handleCustomDays(parseInt(customDaysToYesterday) || 30, true)}
                >
                  Go
                </button>
              </div>
            </div>

            {/* Compare toggle */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '13px' }}>Compare</span>
                <div
                  onClick={() => setCompare(!compare)}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    background: compare ? 'var(--primary)' : 'var(--bg-tertiary)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: compare ? '18px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </label>
            </div>
          </div>

          {/* Right: Calendar */}
          <div style={{ padding: '16px' }}>
            {/* Date Range Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--primary)',
              }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>DATE RANGE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                value={formatDateShort(tempRange.start)}
                readOnly
                onClick={() => setSelectingStart(true)}
                style={{
                  width: '100px',
                  padding: '8px 12px',
                  border: `2px solid ${selectingStart ? 'var(--primary)' : 'var(--border-default)'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  textAlign: 'center',
                }}
              />
              <span style={{ color: 'var(--text-tertiary)' }}>to</span>
              <input
                type="text"
                value={formatDate(tempRange.end)}
                readOnly
                onClick={() => setSelectingStart(false)}
                style={{
                  width: '120px',
                  padding: '8px 12px',
                  border: `2px solid ${!selectingStart ? 'var(--primary)' : 'var(--border-default)'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Calendars */}
            <div style={{ display: 'flex', gap: '24px' }}>
              {renderCalendar(viewMonth)}
              {renderCalendar(secondMonth)}
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-default)',
            }}>
              <button className="btn btn-ghost" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
