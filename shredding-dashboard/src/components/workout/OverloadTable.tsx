'use client';

import { useState, useEffect } from 'react';

const CATEGORY_COLORS: Record<string, string> = {
  chest: '#E24B4A',
  back: '#378ADD',
  shoulders: '#EF9F27',
  arms: '#1D9E75',
  legs: '#1D9E75',
  core: '#737373',
};

interface SessionSnapshot {
  date: string;
  dayType: string;
  topWeight: number;
  topReps: number;
  isPerSide: boolean;
  volume: number;
  est1RM: number;
  setCount: number;
}

interface Delta {
  weight: number;
  reps: number;
  volume: number;
  est1RM: number;
}

interface OverloadRow {
  exerciseId: number;
  exerciseName: string;
  category: string;
  sessionCount: number;
  lastSession: SessionSnapshot;
  previousSession: SessionSnapshot | null;
  delta: Delta | null;
  trend: 'progressing' | 'maintaining' | 'regressing' | 'insufficient_data';
  supercompensation: boolean;
}

function formatTopSet(session: SessionSnapshot): string {
  const side = session.isPerSide ? '/side' : '';
  return `${session.topWeight}${side} x ${session.topReps}`;
}

function TrendIcon({ trend }: { trend: OverloadRow['trend'] }) {
  if (trend === 'progressing') {
    return <span style={{ color: 'var(--teal)' }} title="Progressing">&#8593;</span>;
  }
  if (trend === 'maintaining') {
    return <span style={{ color: 'var(--amber)' }} title="Maintaining">&#8594;</span>;
  }
  if (trend === 'regressing') {
    return <span style={{ color: 'var(--red)' }} title="Regressing">&#8595;</span>;
  }
  return <span style={{ color: 'var(--muted)' }} title="Insufficient data">...</span>;
}

export default function OverloadTable() {
  const [rows, setRows] = useState<OverloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/exercises/overload');
        if (!res.ok) throw new Error('Failed to load overload data');
        const data = await res.json();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError('Could not load progressive overload data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--muted)]">
        Loading overload data...
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

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--muted)]">
        No exercise data yet. Complete some workouts to see trends.
      </div>
    );
  }

  const insufficientCount = rows.filter((r) => r.trend === 'insufficient_data').length;
  const showNote = insufficientCount > rows.length / 2;

  return (
    <div className="space-y-3">
      {showNote && (
        <p className="text-xs text-[var(--muted)] italic">
          Need 2+ sessions per exercise for trend data.
        </p>
      )}

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm" style={{ minWidth: 480 }}>
          <thead>
            <tr className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
              <th className="text-left py-2 pr-3 font-medium">Exercise</th>
              <th className="text-left py-2 pr-3 font-medium">Last Session</th>
              <th className="text-left py-2 pr-3 font-medium">Previous</th>
              <th className="text-right py-2 pr-3 font-medium">&#916; 1RM</th>
              <th className="text-center py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const catColor = CATEGORY_COLORS[row.category] ?? 'var(--muted)';
              const delta1RM = row.delta?.est1RM ?? null;

              let deltaColor = 'var(--muted)';
              let deltaText = '\u2014';
              if (delta1RM !== null) {
                if (delta1RM > 0) {
                  deltaColor = 'var(--teal)';
                  deltaText = `+${Math.round(delta1RM)} lbs`;
                } else if (delta1RM < 0) {
                  deltaColor = 'var(--red)';
                  deltaText = `${Math.round(delta1RM)} lbs`;
                } else {
                  deltaColor = 'var(--amber)';
                  deltaText = '0';
                }
              }

              return (
                <tr
                  key={row.exerciseId}
                  className="border-t border-[var(--border)]"
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                      <span className="text-[var(--foreground)] truncate max-w-[140px]">
                        {row.exerciseName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-[var(--foreground)] tabular-nums whitespace-nowrap">
                    {formatTopSet(row.lastSession)}
                  </td>
                  <td className="py-2 pr-3 text-[var(--muted)] tabular-nums whitespace-nowrap">
                    {row.previousSession ? formatTopSet(row.previousSession) : '\u2014'}
                  </td>
                  <td
                    className="py-2 pr-3 text-right tabular-nums whitespace-nowrap font-medium"
                    style={{ color: deltaColor }}
                  >
                    {deltaText}
                  </td>
                  <td className="py-2 text-center whitespace-nowrap">
                    <span className="text-base font-bold">
                      <TrendIcon trend={row.trend} />
                    </span>
                    {row.supercompensation && (
                      <span
                        className="ml-1 cursor-help"
                        title="超量恢复 — Supercompensation detected"
                      >
                        &#9889;
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
