'use client';

import type { CycleDay } from '@/lib/cycleAnalysis';

const DAY_COLORS: Record<string, string> = {
  rest: 'var(--amber)',
  push: 'var(--red)',
  pull: 'var(--blue)',
  legs: 'var(--teal)',
};

function MiniBar({ label, pct, color }: { label: string; pct: number | null; color: string }) {
  if (pct == null) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <div className="h-1.5 rounded bg-[var(--border)]" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <span className="text-[9px] tabular-nums text-[var(--muted)]">{pct}%</span>
      </div>
      <div className="h-1.5 rounded bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded transition-all"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function CycleTimeline({ days }: { days: CycleDay[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {days.map((d) => {
        const color = DAY_COLORS[d.dayType] ?? 'var(--muted)';
        const isActive = d.isToday;
        const faded = d.isFuture && !d.isLogged;

        return (
          <div
            key={d.dayType}
            className={`rounded-lg border px-3 py-3 flex flex-col gap-2 relative transition-opacity ${
              faded ? 'opacity-50' : ''
            }`}
            style={{
              borderColor: isActive ? color : 'var(--border)',
              backgroundColor: isActive
                ? `color-mix(in srgb, ${color} 10%, transparent)`
                : 'var(--surface)',
              boxShadow: isActive ? `0 0 0 1px ${color}` : 'none',
            }}
          >
            {/* Header: day + date + current indicator */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color }}
                >
                  {d.dayType}
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  Day {d.dayNumber} {d.date ? `· ${d.date.slice(5)}` : ''}
                </div>
              </div>
              {isActive && (
                <span
                  className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                  style={{ color, backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
                >
                  Today
                </span>
              )}
            </div>

            {/* Carbs */}
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Carbs
              </span>
              <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                {d.carbs.actual != null ? `${d.carbs.actual}` : '—'}
                <span className="text-[var(--muted)] text-xs">/{d.carbs.target}g</span>
              </span>
            </div>

            {/* Glycogen bars */}
            <div className="flex flex-col gap-1.5">
              <MiniBar label="Liver" pct={d.liverGlycogenPct} color="var(--teal)" />
              <MiniBar label="Muscle" pct={d.muscleGlycogenPct} color="var(--blue)" />
            </div>

            {/* Fat burning */}
            {d.fatBurningPct != null && (
              <div className="flex items-baseline justify-between pt-1 border-t border-[var(--border)]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Fat burn
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--amber)' }}>
                  {d.fatBurningPct}%
                </span>
              </div>
            )}

            {/* Workout */}
            <div className="text-[11px] text-[var(--muted)] leading-tight">
              {d.workout}
            </div>

            {/* Insight */}
            <div className="text-[11px] text-[var(--foreground)] leading-snug mt-1 pt-2 border-t border-[var(--border)]">
              {d.insight}
            </div>
          </div>
        );
      })}
    </div>
  );
}
