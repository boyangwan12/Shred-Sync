'use client';

import { useState, useMemo } from 'react';

const DAY_TYPE_COLORS: Record<string, string> = {
  rest: '#EF9F27',
  push: '#E24B4A',
  pull: '#378ADD',
  legs: '#1D9E75',
};

const DAY_ABBRS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WorkoutDay {
  date: string;
  dayType: string;
}

interface WorkoutCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  workoutDays: WorkoutDay[];
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function WorkoutCalendar({
  selectedDate,
  onDateSelect,
  workoutDays,
}: WorkoutCalendarProps) {
  // Parse selected date to determine initial month view
  const selParts = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selParts[0] || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(
    selParts[1] != null ? selParts[1] - 1 : new Date().getMonth()
  );

  const today = todayStr();

  // Build a lookup map for workout days
  const workoutMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const wd of workoutDays) {
      map.set(wd.date, wd.dayType);
    }
    return map;
  }, [workoutDays]);

  // Calculate the grid cells for the current month view
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // getDay() returns 0=Sun. We want Mon=0, so adjust.
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const result: Array<{ day: number; dateStr: string } | null> = [];

    // Leading blanks
    for (let i = 0; i < startDow; i++) {
      result.push(null);
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) });
    }

    return result;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[var(--foreground)]">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day abbreviation headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAY_ABBRS.map((abbr) => (
          <div key={abbr} className="text-center text-[10px] text-[var(--muted)] uppercase tracking-wide py-0.5">
            {abbr}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`blank-${i}`} />;
          }

          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === today;
          const workoutType = workoutMap.get(cell.dateStr);
          const dotColor = workoutType ? DAY_TYPE_COLORS[workoutType] : undefined;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onDateSelect(cell.dateStr)}
              className="flex flex-col items-center justify-center py-1 rounded transition-colors min-h-[44px] sm:min-h-[28px]"
              style={{
                outline: isSelected ? `2px solid var(--teal)` : 'none',
                outlineOffset: -1,
                backgroundColor: isToday && !isSelected ? 'var(--surface-hover)' : 'transparent',
              }}
            >
              <span
                className="text-xs leading-none"
                style={{
                  color: isSelected ? 'var(--teal)' : isToday ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: isSelected || isToday ? 600 : 400,
                }}
              >
                {cell.day}
              </span>
              {dotColor ? (
                <span
                  className="block w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: dotColor }}
                />
              ) : (
                <span className="block w-1 h-1 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
