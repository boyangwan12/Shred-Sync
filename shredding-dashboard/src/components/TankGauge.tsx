'use client';

interface TankGaugeProps {
  label: string;
  value: number;
  maxGrams: number;
  unit: string;
}

function getFillColor(value: number): string {
  if (value >= 60) return 'var(--teal)';
  if (value >= 40) return 'var(--amber)';
  return 'var(--red)';
}

export default function TankGauge({ label, value, maxGrams, unit }: TankGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillColor = getFillColor(clamped);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tank container */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 100,
          height: 200,
          border: '2px solid var(--border)',
          background: 'var(--background)',
        }}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-md"
          style={{
            height: `${clamped}%`,
            backgroundColor: fillColor,
            opacity: 0.85,
            transition: 'height 0.6s ease, background-color 0.4s ease',
          }}
        />
        {/* Gradient overlay on fill */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none rounded-b-md"
          style={{
            height: `${clamped}%`,
            background: 'linear-gradient(to top, transparent 0%, rgba(255,255,255,0.08) 100%)',
            transition: 'height 0.6s ease',
          }}
        />
        {/* Tick marks */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              bottom: `${tick}%`,
              height: 1,
              backgroundColor: 'var(--border)',
              opacity: 0.5,
            }}
          />
        ))}
        {/* Percentage label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-lg font-bold drop-shadow-md"
            style={{ color: 'var(--foreground)' }}
          >
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      {/* Label below */}
      <span className="text-xs text-[var(--muted)] text-center">
        {label} ~{maxGrams}{unit} max
      </span>
    </div>
  );
}
