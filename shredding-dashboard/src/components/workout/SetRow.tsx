'use client';

import { totalWeight } from '@/lib/weight';

export interface SetData {
  setNumber: number;
  weightLbs: number | '';
  reps: number | '';
  isPerSide: boolean;
  isWarmup: boolean;
}

interface SetRowProps {
  setNumber: number;
  weightLbs: number | '';
  reps: number | '';
  isPerSide: boolean;
  isWarmup: boolean;
  equipment: string | null;
  onChange: (data: Partial<SetData>) => void;
  onRemove: () => void;
}

export default function SetRow({
  setNumber,
  weightLbs,
  reps,
  isPerSide,
  isWarmup,
  equipment,
  onChange,
  onRemove,
}: SetRowProps) {
  const isBodyweight = equipment === 'bodyweight';
  const total = totalWeight(weightLbs, isPerSide, equipment);

  return (
    <div
      className={`flex items-center gap-2 py-2 ${
        isWarmup ? 'opacity-60' : ''
      }`}
    >
      {/* Set number */}
      <button
        type="button"
        onClick={() => onChange({ isWarmup: !isWarmup })}
        className={`flex-shrink-0 w-8 h-11 flex items-center justify-center rounded text-xs font-bold ${
          isWarmup
            ? 'bg-[var(--amber)]/20 text-[var(--amber)]'
            : 'bg-[var(--border)] text-[var(--muted)]'
        }`}
        title={isWarmup ? 'Warmup set — tap to make working set' : 'Working set — tap to make warmup'}
      >
        {isWarmup ? 'W' : setNumber}
      </button>

      {/* Weight input */}
      <div className="flex-1 min-w-0">
        <input
          type="number"
          inputMode="decimal"
          placeholder="lbs"
          value={weightLbs === '' ? '' : weightLbs}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ weightLbs: v === '' ? '' : Number(v) });
          }}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-[var(--foreground)] focus:border-[var(--teal)] focus:outline-none text-center text-base"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* Reps input */}
      <div className="flex-1 min-w-0">
        <input
          type="number"
          inputMode="numeric"
          placeholder="reps"
          value={reps === '' ? '' : reps}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ reps: v === '' ? '' : Number(v) });
          }}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-[var(--foreground)] focus:border-[var(--teal)] focus:outline-none text-center text-base"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* Total weight display */}
      <div
        className="flex-shrink-0 w-14 h-11 flex items-center justify-center text-sm font-semibold text-[var(--muted)] tabular-nums"
        title={isBodyweight ? 'Bodyweight' : 'Total weight (plates × sides + bar)'}
      >
        {isBodyweight ? 'BW' : total !== null ? total : '—'}
      </div>

      {/* Per-side toggle (hidden for bodyweight) */}
      {isBodyweight ? (
        <span className="flex-shrink-0 w-[42px]" />
      ) : (
        <button
          type="button"
          onClick={() => onChange({ isPerSide: !isPerSide })}
          className={`flex-shrink-0 px-2 h-11 rounded text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            isPerSide
              ? 'bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/40'
              : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
          }`}
          title="Per side"
        >
          /side
        </button>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 w-8 h-11 flex items-center justify-center text-[var(--muted)] hover:text-[var(--red)] transition-colors"
        title="Remove set"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
