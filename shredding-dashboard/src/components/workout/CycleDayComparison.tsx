'use client';

import { useState, useEffect } from 'react';

const DAY_TYPE_COLORS: Record<string, string> = {
  rest: '#EF9F27',
  push: '#E24B4A',
  pull: '#378ADD',
  legs: '#1D9E75',
};

interface TopSet {
  exercise: string;
  weight: number;
  reps: number;
  est1RM: number;
}

interface CycleData {
  cycleNumber: number;
  date: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  topSet: TopSet;
}

interface CompareResponse {
  dayType: string;
  cycles: CycleData[];
}

interface CycleDayComparisonProps {
  dayType: string;
}

export default function CycleDayComparison({ dayType }: CycleDayComparisonProps) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      setData(null);
      try {
        const res = await fetch(`/api/workout/compare?dayType=${encodeURIComponent(dayType)}`);
        if (!res.ok) throw new Error('Failed to load comparison data');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Could not load cycle comparison data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [dayType]);

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--muted)]">
        Loading cycle comparison...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-sm text-[var(--amber)] bg-[var(--amber)]/10 border border-[var(--amber)]/30 rounded px-4">
        {error}
      </div>
    );
  }

  if (!data || data.cycles.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--muted)]">
        No cycle data for {dayType} days yet.
      </div>
    );
  }

  const cycles = data.cycles;
  const pillColor = DAY_TYPE_COLORS[dayType] ?? 'var(--muted)';

  // Calculate delta between last two cycles if 2+
  let volumeDelta: number | null = null;
  let volumeDeltaPct: string | null = null;
  if (cycles.length >= 2) {
    const last = cycles[cycles.length - 1];
    const prev = cycles[cycles.length - 2];
    if (prev.totalVolume > 0) {
      volumeDelta = last.totalVolume - prev.totalVolume;
      volumeDeltaPct = ((volumeDelta / prev.totalVolume) * 100).toFixed(1);
    }
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Day type header */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
          style={{
            color: pillColor,
            backgroundColor: `${pillColor}20`,
          }}
        >
          {dayType}
        </span>
        <span className="text-xs text-[var(--muted)]">Cycle Comparison</span>
        {volumeDelta !== null && volumeDeltaPct !== null && (
          <span
            className="text-xs font-medium ml-auto tabular-nums"
            style={{
              color: volumeDelta > 0 ? 'var(--teal)' : volumeDelta < 0 ? 'var(--red)' : 'var(--amber)',
            }}
          >
            {volumeDelta > 0 ? '\u2191' : volumeDelta < 0 ? '\u2193' : '\u2192'}{' '}
            {volumeDelta > 0 ? '+' : ''}{volumeDeltaPct}% vol
          </span>
        )}
      </div>

      {/* Horizontally scrollable cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {cycles.map((cycle) => (
          <div
            key={cycle.cycleNumber}
            className="flex-shrink-0 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 snap-start"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Cycle {cycle.cycleNumber}
              </span>
              <span className="text-[10px] text-[var(--muted)]">{cycle.date}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Exercises</span>
                <span className="text-[var(--foreground)] tabular-nums">{cycle.exerciseCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Sets</span>
                <span className="text-[var(--foreground)] tabular-nums">{cycle.setCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Volume</span>
                <span className="text-[var(--foreground)] tabular-nums">
                  {cycle.totalVolume.toLocaleString()} lbs
                </span>
              </div>
            </div>

            {cycle.topSet && (
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide mb-0.5">
                  Top Set
                </div>
                <div className="text-xs text-[var(--foreground)]">
                  {cycle.topSet.exercise}
                </div>
                <div className="text-xs text-[var(--muted)] tabular-nums">
                  {cycle.topSet.weight} x {cycle.topSet.reps} &middot; est 1RM {Math.round(cycle.topSet.est1RM)}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Placeholder card when only 1 cycle */}
        {cycles.length === 1 && (
          <div
            className="flex-shrink-0 w-52 border-2 border-dashed border-[var(--border)] rounded-lg p-3 flex items-center justify-center snap-start"
          >
            <p className="text-xs text-[var(--muted)] text-center leading-relaxed">
              Next {dayType} session will appear here for comparison
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
