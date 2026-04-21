'use client';

import type { CortisolSignal, Flag } from '@/lib/cortisol';

interface Props {
  signals: CortisolSignal[];
}

const LABEL: Record<CortisolSignal['name'], string> = {
  hrv: 'HRV',
  tst: 'Total sleep',
  rhr: 'Resting HR',
  ea: 'Energy availability',
  deepFraction: 'Deep-sleep fraction',
};

function flagDot(flag: Flag) {
  const color = flag === 'red'
    ? 'var(--red)'
    : flag === 'yellow'
      ? 'var(--amber)'
      : flag === 'ok'
        ? 'var(--teal)'
        : 'var(--muted)';
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ background: color }}
      aria-label={flag}
    />
  );
}

function fmtValue(s: CortisolSignal): string {
  if (s.value == null) return '—';
  if (s.name === 'hrv') return `${s.value.toFixed(0)} ms`;
  if (s.name === 'tst') return `${Math.floor(s.value / 60)}h ${Math.round(s.value % 60)}m`;
  if (s.name === 'rhr') return `${s.value.toFixed(0)} bpm`;
  if (s.name === 'ea') return `${s.value.toFixed(1)} kcal/kg`;
  if (s.name === 'deepFraction') return `${(s.value * 100).toFixed(0)}%`;
  return String(s.value);
}

function fmtBaseline(s: CortisolSignal): string {
  if (s.baseline == null) return '—';
  if (s.name === 'hrv') return `${s.baseline.toFixed(0)} ms`;
  if (s.name === 'tst') return `${Math.floor(s.baseline / 60)}h ${Math.round(s.baseline % 60)}m`;
  if (s.name === 'rhr') return `${s.baseline.toFixed(1)} bpm`;
  return String(s.baseline);
}

function fmtDelta(s: CortisolSignal): string {
  if (s.delta == null) return '—';
  if (s.name === 'hrv') return `${(s.delta * 100).toFixed(1)}%`;
  if (s.name === 'rhr') return `${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(1)} bpm`;
  return '—';
}

function fmtThreshold(s: CortisolSignal): string {
  const y = s.threshold.yellow;
  const r = s.threshold.red;
  if (y == null || r == null) return '—';
  if (s.name === 'hrv') return `y ${(y * 100).toFixed(1)}% / r ${(r * 100).toFixed(0)}%`;
  if (s.name === 'tst') return `y <${Math.floor(y / 60)}h / r ≤${(r / 60).toFixed(1)}h`;
  if (s.name === 'rhr') return `y +${y} / r +${r} bpm`;
  if (s.name === 'ea') return `y <${y} / r ≤${r} kcal/kg`;
  if (s.name === 'deepFraction') return `y <${(y * 100).toFixed(0)}% / r <${(r * 100).toFixed(0)}%`;
  return '—';
}

export default function CortisolSignalTable({ signals }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--muted)]">
            <th className="py-2 pr-3 font-medium">Signal</th>
            <th className="py-2 pr-3 font-medium">Today</th>
            <th className="py-2 pr-3 font-medium">Baseline</th>
            <th className="py-2 pr-3 font-medium">Δ</th>
            <th className="py-2 pr-3 font-medium">Threshold</th>
            <th className="py-2 pr-3 font-medium">Flag</th>
          </tr>
        </thead>
        <tbody>
          {signals.map(s => (
            <tr
              key={s.name}
              className={`border-t border-[var(--border)] ${!s.counted ? 'bg-[color-mix(in_srgb,var(--muted)_6%,transparent)]' : ''}`}
            >
              <td className="py-2 pr-3 text-[var(--foreground)]">{LABEL[s.name]}</td>
              <td className="py-2 pr-3 tabular-nums text-[var(--foreground)]">{fmtValue(s)}</td>
              <td className="py-2 pr-3 tabular-nums text-[var(--muted)]">{fmtBaseline(s)}</td>
              <td className="py-2 pr-3 tabular-nums text-[var(--muted)]">{fmtDelta(s)}</td>
              <td className="py-2 pr-3 text-[11px] text-[var(--muted)]">{fmtThreshold(s)}</td>
              <td className="py-2 pr-3">
                {s.counted ? (
                  flagDot(s.flag)
                ) : (
                  <span className="text-[10px] font-semibold tracking-wider text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">INFO</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
