'use client';

interface ScoreInputProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}

export default function ScoreInput({ label, value, onChange, disabled }: ScoreInputProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-[var(--foreground)] min-w-[120px]">{label}</label>
      {disabled ? (
        <span className="text-sm text-[var(--muted)] italic">N/A</span>
      ) : (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-9 h-9 rounded-full border-2 text-sm font-medium transition-colors ${
                n <= value
                  ? 'bg-[var(--teal)] border-[var(--teal)] text-white'
                  : 'bg-transparent border-[var(--muted)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]'
              }`}
              aria-label={`${label} score ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
