'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WorkoutStat {
  date: string;
  dayType: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

const DAY_LABELS: Record<string, string> = {
  rest: 'Rest',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

export default function WorkoutSummary() {
  const [stats, setStats] = useState<WorkoutStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workout/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-4">
        <span className="text-[var(--muted)] text-sm">Loading workout data...</span>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <Link href="/workout" className="block">
        <div className="bg-[var(--surface)] rounded-lg p-4 hover:bg-[var(--surface-hover)] transition-colors">
          <span className="text-[12px] text-[var(--muted)] uppercase tracking-wider">
            Last Workout
          </span>
          <p className="text-sm text-[var(--muted)] mt-2">
            No workout data yet. Start logging workouts to see a summary.
          </p>
        </div>
      </Link>
    );
  }

  const latest = stats[stats.length - 1];
  const previous = stats.length >= 2 ? stats[stats.length - 2] : null;

  const volumeDelta = previous ? latest.totalVolume - previous.totalVolume : null;
  const volumeDeltaStr =
    volumeDelta !== null
      ? volumeDelta > 0
        ? `+${volumeDelta.toLocaleString()} lbs`
        : volumeDelta < 0
          ? `${volumeDelta.toLocaleString()} lbs`
          : 'No change'
      : null;
  const volumeDeltaColor =
    volumeDelta !== null
      ? volumeDelta > 0
        ? 'var(--teal)'
        : volumeDelta < 0
          ? 'var(--amber)'
          : 'var(--muted)'
      : 'var(--muted)';

  const latestDate = new Date(latest.date + 'T00:00:00');
  const formattedDate = latestDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const dayLabel = DAY_LABELS[latest.dayType] || latest.dayType;

  return (
    <Link href="/workout" className="block">
      <div className="bg-[var(--surface)] rounded-lg p-4 hover:bg-[var(--surface-hover)] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[var(--muted)] uppercase tracking-wider">
            Last Workout
          </span>
          <span className="text-[11px] text-[var(--muted)]">
            {formattedDate} &middot; {dayLabel}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--muted)]">Exercises</span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              {latest.exerciseCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--muted)]">Sets</span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              {latest.setCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--muted)]">Volume</span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              {latest.totalVolume.toLocaleString()} lbs
            </span>
            {volumeDeltaStr && (
              <span
                className="text-[10px] font-medium"
                style={{ color: volumeDeltaColor }}
              >
                {volumeDeltaStr} vs prev
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
