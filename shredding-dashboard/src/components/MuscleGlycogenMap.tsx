'use client';

import { useState, useMemo } from 'react';

interface PerMuscle {
  legs: number;
  back: number;
  chest: number;
  shoulders: number;
  arms: number;
  core: number;
}

interface DailyLog {
  date: string;
  dayType: string;
  carbsActual?: number | null;
  perMuscle?: PerMuscle | null;
  workoutDataMissing?: boolean;
}

interface MuscleGlycogenMapProps {
  logs: DailyLog[];
}

type MuscleKey = keyof PerMuscle;

const DAY_COLORS: Record<string, string> = {
  rest: 'var(--muted)',
  push: '#E24B4A',
  pull: '#378ADD',
  legs: '#1D9E75',
};

function pctToFill(pct: number): string {
  // 0% red -> 60% yellow -> 100% green via HSL hue 0..120
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 65%, 45%)`;
}

function pctToTextColor(pct: number): string {
  return pct < 30 ? '#fff' : '#0a0a0a';
}

export default function MuscleGlycogenMap({ logs }: MuscleGlycogenMapProps) {
  const daysWithPerMuscle = useMemo(
    () => logs.filter((l) => l.perMuscle != null),
    [logs],
  );
  const [index, setIndex] = useState(Math.max(0, daysWithPerMuscle.length - 1));
  const [hovered, setHovered] = useState<MuscleKey | null>(null);

  if (daysWithPerMuscle.length === 0) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Per-Muscle Glycogen Map
        </h3>
        <p className="text-xs text-[var(--muted)]">
          No per-muscle data yet. Log workouts so exercises can be tracked per group.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(index, daysWithPerMuscle.length - 1);
  const day = daysWithPerMuscle[safeIndex];
  const prev = safeIndex > 0 ? daysWithPerMuscle[safeIndex - 1] : null;
  const pm = day.perMuscle!;
  const prevPm = prev?.perMuscle ?? null;

  const fmt = (p: number) => `${Math.round(p)}%`;
  const delta = (k: MuscleKey): number | null => {
    if (!prevPm) return null;
    return pm[k] - prevPm[k];
  };
  const deltaStr = (k: MuscleKey): string => {
    const d = delta(k);
    if (d == null) return '';
    if (Math.abs(d) < 1) return '±0';
    return d > 0 ? `+${Math.round(d)}` : `${Math.round(d)}`;
  };

  const dayTypeLabel = day.dayType.charAt(0).toUpperCase() + day.dayType.slice(1);
  const dayColor = DAY_COLORS[day.dayType] ?? 'var(--muted)';

  return (
    <div className="bg-[var(--surface)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Per-Muscle Glycogen Map
        </h3>
        <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
          <span>0% depleted</span>
          <div
            className="h-2 w-24 rounded"
            style={{
              background: 'linear-gradient(to right, hsl(0,65%,45%), hsl(60,65%,45%), hsl(120,65%,45%))',
            }}
          />
          <span>100% full</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
        {/* Body SVG */}
        <div className="flex justify-center">
          <svg
            viewBox="0 0 240 420"
            className="w-[220px] h-[380px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Head (decorative, no muscle group) */}
            <circle cx="120" cy="32" r="22" fill="var(--surface-hover)" stroke="var(--border)" strokeWidth="1" />
            <line x1="120" y1="54" x2="120" y2="68" stroke="var(--border)" strokeWidth="2" />

            {/* Shoulders (deltoids) */}
            <g onMouseEnter={() => setHovered('shoulders')} onMouseLeave={() => setHovered(null)}>
              <path
                d="M 75 72 Q 60 70 55 95 Q 62 100 80 95 Z"
                fill={pctToFill(pm.shoulders)}
                stroke={hovered === 'shoulders' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'shoulders' ? 2 : 1}
              />
              <path
                d="M 165 72 Q 180 70 185 95 Q 178 100 160 95 Z"
                fill={pctToFill(pm.shoulders)}
                stroke={hovered === 'shoulders' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'shoulders' ? 2 : 1}
              />
            </g>

            {/* Chest (pecs) */}
            <g onMouseEnter={() => setHovered('chest')} onMouseLeave={() => setHovered(null)}>
              <path
                d="M 80 95 Q 90 92 117 98 L 117 130 Q 95 132 82 125 Z"
                fill={pctToFill(pm.chest)}
                stroke={hovered === 'chest' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'chest' ? 2 : 1}
              />
              <path
                d="M 160 95 Q 150 92 123 98 L 123 130 Q 145 132 158 125 Z"
                fill={pctToFill(pm.chest)}
                stroke={hovered === 'chest' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'chest' ? 2 : 1}
              />
            </g>

            {/* Arms (biceps/triceps combined) */}
            <g onMouseEnter={() => setHovered('arms')} onMouseLeave={() => setHovered(null)}>
              <path
                d="M 55 95 Q 50 115 55 170 Q 62 175 72 170 Q 75 130 80 100 Z"
                fill={pctToFill(pm.arms)}
                stroke={hovered === 'arms' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'arms' ? 2 : 1}
              />
              <path
                d="M 185 95 Q 190 115 185 170 Q 178 175 168 170 Q 165 130 160 100 Z"
                fill={pctToFill(pm.arms)}
                stroke={hovered === 'arms' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'arms' ? 2 : 1}
              />
            </g>

            {/* Core (abs + obliques) */}
            <g onMouseEnter={() => setHovered('core')} onMouseLeave={() => setHovered(null)}>
              <path
                d="M 82 128 L 158 128 Q 160 170 150 205 Q 120 212 90 205 Q 80 170 82 128 Z"
                fill={pctToFill(pm.core)}
                stroke={hovered === 'core' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'core' ? 2 : 1}
              />
              {/* Subtle ab line */}
              <line x1="120" y1="135" x2="120" y2="200" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
            </g>

            {/* Legs (quads + hams) */}
            <g onMouseEnter={() => setHovered('legs')} onMouseLeave={() => setHovered(null)}>
              <path
                d="M 92 208 Q 88 260 94 340 Q 102 358 115 355 Q 118 280 118 210 Z"
                fill={pctToFill(pm.legs)}
                stroke={hovered === 'legs' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'legs' ? 2 : 1}
              />
              <path
                d="M 148 208 Q 152 260 146 340 Q 138 358 125 355 Q 122 280 122 210 Z"
                fill={pctToFill(pm.legs)}
                stroke={hovered === 'legs' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'legs' ? 2 : 1}
              />
            </g>

            {/* Back indicator (since front view can't show back, draw a vertical bar on the side) */}
            <g onMouseEnter={() => setHovered('back')} onMouseLeave={() => setHovered(null)}>
              <rect
                x="205"
                y="95"
                width="22"
                height="115"
                rx="4"
                fill={pctToFill(pm.back)}
                stroke={hovered === 'back' ? 'var(--teal)' : 'var(--border)'}
                strokeWidth={hovered === 'back' ? 2 : 1}
              />
              <text
                x="216"
                y="160"
                textAnchor="middle"
                fontSize="9"
                fill={pctToTextColor(pm.back)}
                style={{ writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const }}
                transform="rotate(90 216 160)"
              >
                BACK
              </text>
            </g>

            {/* Hover label at top */}
            {hovered && (
              <g>
                <rect x="70" y="385" width="100" height="24" rx="4" fill="var(--surface-hover)" stroke="var(--border)" />
                <text
                  x="120"
                  y="401"
                  textAnchor="middle"
                  fontSize="12"
                  fill="var(--foreground)"
                  fontWeight="600"
                >
                  {hovered}: {fmt(pm[hovered])}
                  {deltaStr(hovered) && <tspan fill="var(--muted)" fontSize="10"> ({deltaStr(hovered)})</tspan>}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Muscle stat panel */}
        <div className="space-y-2">
          {(['legs', 'back', 'chest', 'shoulders', 'arms', 'core'] as MuscleKey[]).map((k) => {
            const pct = pm[k];
            const d = delta(k);
            return (
              <div
                key={k}
                className={`flex items-center justify-between rounded px-3 py-2 transition-colors ${hovered === k ? 'ring-1 ring-[var(--teal)]' : ''}`}
                style={{ backgroundColor: 'var(--surface-hover)' }}
                onMouseEnter={() => setHovered(k)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: pctToFill(pct) }}
                  />
                  <span className="text-sm font-medium text-[var(--foreground)] capitalize">
                    {k}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                    {fmt(pct)}
                  </span>
                  {d != null && Math.abs(d) >= 1 && (
                    <span
                      className="text-[11px] tabular-nums"
                      style={{
                        color: d > 0 ? 'var(--teal)' : d < 0 ? 'var(--red)' : 'var(--muted)',
                      }}
                    >
                      {deltaStr(k)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date scrubber */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--muted)]">
            {daysWithPerMuscle[0].date} → {daysWithPerMuscle[daysWithPerMuscle.length - 1].date}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--foreground)]">{day.date}</span>
            <span
              className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded"
              style={{ backgroundColor: dayColor, color: '#fff' }}
            >
              {dayTypeLabel}
            </span>
            {day.workoutDataMissing && (
              <span className="text-[11px] text-[var(--muted)] italic">
                workout not logged
              </span>
            )}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={daysWithPerMuscle.length - 1}
          value={safeIndex}
          onChange={(e) => setIndex(parseInt(e.target.value, 10))}
          className="w-full accent-[var(--teal)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--muted)]">
          <button
            type="button"
            onClick={() => setIndex(Math.max(0, safeIndex - 1))}
            className="hover:text-[var(--foreground)]"
            disabled={safeIndex === 0}
          >
            ← prev day
          </button>
          <span>
            Day {safeIndex + 1} of {daysWithPerMuscle.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex(Math.min(daysWithPerMuscle.length - 1, safeIndex + 1))}
            className="hover:text-[var(--foreground)]"
            disabled={safeIndex === daysWithPerMuscle.length - 1}
          >
            next day →
          </button>
        </div>
      </div>
    </div>
  );
}
