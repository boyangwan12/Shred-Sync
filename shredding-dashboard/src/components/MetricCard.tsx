'use client';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: string;
}

export default function MetricCard({ label, value, delta, deltaColor }: MetricCardProps) {
  return (
    <div className="bg-[var(--surface)] rounded-lg p-4 flex flex-col gap-1">
      <span className="text-[12px] text-[var(--muted)] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[22px] font-bold text-[var(--foreground)]">
        {value}
      </span>
      {delta && (
        <span
          className="text-[11px] font-medium"
          style={{ color: deltaColor ?? 'var(--muted)' }}
        >
          {delta}
        </span>
      )}
    </div>
  );
}
