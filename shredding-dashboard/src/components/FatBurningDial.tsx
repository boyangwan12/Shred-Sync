'use client';

interface FatBurningDialProps {
  value: number;
}

function getDialColor(value: number): string {
  if (value > 60) return 'var(--teal)';
  if (value >= 30) return 'var(--amber)';
  return 'var(--muted)';
}

function getDialLabel(value: number): string {
  if (value > 60) return 'High';
  if (value >= 30) return 'Moderate';
  return 'Low';
}

export default function FatBurningDial({ value }: FatBurningDialProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = getDialColor(clamped);
  const levelLabel = getDialLabel(clamped);

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
          Fat oxidation rate
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color,
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          }}
        >
          {levelLabel}
        </span>
      </div>
      {/* Track */}
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{
          height: 20,
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Fill */}
        <div
          className="absolute top-0 left-0 bottom-0 rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            opacity: 0.85,
            transition: 'width 0.6s ease, background-color 0.4s ease',
          }}
        />
        {/* Shimmer overlay */}
        <div
          className="absolute top-0 left-0 bottom-0 pointer-events-none rounded-full"
          style={{
            width: `${clamped}%`,
            background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      {/* Value */}
      <span className="text-sm font-bold" style={{ color }}>
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
