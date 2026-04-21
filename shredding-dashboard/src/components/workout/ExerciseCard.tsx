'use client';

import { useState, useEffect } from 'react';
import SetRow, { type SetData } from './SetRow';
import { totalWeight } from '@/lib/weight';

export interface ExerciseSetData {
  setNumber: number;
  weightLbs: number | '';
  reps: number | '';
  isPerSide: boolean;
  isWarmup: boolean;
  notes?: string | null;
}

interface LastSessionRef {
  date: string;
  dayType: string;
  topWeight: number | null;
  topReps: number | null;
  setCount: number;
}

interface ExerciseCardProps {
  exerciseId: number;
  exerciseName: string;
  equipment: string | null;
  notes?: string | null;
  sets: ExerciseSetData[];
  currentDate: string;
  onUpdate: (sets: ExerciseSetData[]) => void;
  onRemove: () => void;
  onSwap?: () => void;
}

export default function ExerciseCard({
  exerciseId,
  exerciseName,
  equipment,
  notes,
  sets,
  currentDate,
  onUpdate,
  onRemove,
  onSwap,
}: ExerciseCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [lastSession, setLastSession] = useState<LastSessionRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLastSession(null);
    async function fetchLast() {
      try {
        const res = await fetch(`/api/exercises/${exerciseId}/history?limit=10`);
        if (!res.ok) return;
        const history: Array<{
          date: string;
          dayType: string;
          sets: Array<{ weightLbs: number | null; reps: number | null; isWarmup: boolean }>;
        }> = await res.json();
        const prior = history.find((h) => h.date !== currentDate);
        if (!prior) return;
        const workingSets = prior.sets.filter((s) => !s.isWarmup);
        if (workingSets.length === 0) return;
        const top = [...workingSets].sort((a, b) => {
          const wa = a.weightLbs ?? -1;
          const wb = b.weightLbs ?? -1;
          if (wb !== wa) return wb - wa;
          return (b.reps ?? 0) - (a.reps ?? 0);
        })[0];
        if (cancelled) return;
        setLastSession({
          date: prior.date,
          dayType: prior.dayType,
          topWeight: top.weightLbs,
          topReps: top.reps,
          setCount: workingSets.length,
        });
      } catch {
        // silently fail — analysis panel just won't show last session
      }
    }
    fetchLast();
    return () => {
      cancelled = true;
    };
  }, [exerciseId, currentDate]);

  function handleSetChange(index: number, data: Partial<SetData>) {
    const updated = sets.map((s, i) => (i === index ? { ...s, ...data } : s));
    onUpdate(updated);
  }

  function handleRemoveSet(index: number) {
    const updated = sets
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, setNumber: i + 1 }));
    onUpdate(updated);
  }

  function handleAddSet() {
    const lastSet = sets[sets.length - 1];
    const newSet: ExerciseSetData = {
      setNumber: sets.length + 1,
      weightLbs: lastSet ? lastSet.weightLbs : '',
      reps: '',
      isPerSide: lastSet ? lastSet.isPerSide : false,
      isWarmup: false,
    };
    onUpdate([...sets, newSet]);
  }

  // Calculate exercise volume (total weight x reps, incl. per-side and bar)
  const exerciseVolume = sets.reduce((total, s) => {
    if (s.isWarmup) return total;
    const tw = totalWeight(s.weightLbs, s.isPerSide, equipment);
    const r = typeof s.reps === 'number' ? s.reps : 0;
    if (tw === null) return total;
    return total + tw * r;
  }, 0);

  return (
    <div
      data-testid="exercise-card"
      data-exercise={exerciseName}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden"
    >
      {/* Header — tap to collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(!collapsed); }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-[var(--muted)] transition-transform flex-shrink-0 ${
              collapsed ? '-rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {onSwap ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwap();
              }}
              className="font-medium text-[var(--foreground)] truncate text-left hover:text-[var(--teal)] transition-colors"
              title="Tap to swap exercise"
            >
              {exerciseName}
            </button>
          ) : (
            <span className="font-medium text-[var(--foreground)] truncate">
              {exerciseName}
            </span>
          )}
          <span className="text-xs text-[var(--muted)] flex-shrink-0">
            {sets.length} {sets.length === 1 ? 'set' : 'sets'}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {exerciseVolume > 0 && (
            <span className="text-xs text-[var(--muted)]">
              {exerciseVolume.toLocaleString()} lbs
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--red)] transition-colors rounded"
            title="Remove exercise"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sets list */}
      {!collapsed && (
        <div className="px-4 pb-3">
          {/* Analysis panel — reasoning + previous session reference */}
          {(notes || lastSession) && (
            <div className="mb-3 p-3 rounded-md bg-[var(--background)] border border-[var(--border)] space-y-1.5">
              {lastSession && (
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="text-[var(--muted)] uppercase tracking-wide text-[10px] font-semibold">
                    Last
                  </span>
                  <span className="text-[var(--foreground)] tabular-nums">
                    {lastSession.date.slice(5).replace('-', '/')}
                    {' · '}
                    {lastSession.topWeight != null ? lastSession.topWeight : 'BW'}
                    {lastSession.topReps != null ? `×${lastSession.topReps}` : ''}
                    {' '}
                    <span className="text-[var(--muted)]">
                      ({lastSession.setCount} {lastSession.setCount === 1 ? 'set' : 'sets'})
                    </span>
                  </span>
                </div>
              )}
              {notes && (
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="text-[var(--muted)] uppercase tracking-wide text-[10px] font-semibold flex-shrink-0">
                    Plan
                  </span>
                  <span className="text-[var(--foreground)] leading-snug">{notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Column labels */}
          {sets.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] uppercase tracking-wider pb-1 px-0">
              <span className="w-8 text-center">Set</span>
              <span className="flex-1 text-center">Weight</span>
              <span className="flex-1 text-center">Reps</span>
              <span className="w-14 text-center">Total</span>
              <span className="w-[42px]" />
              <span className="w-8" />
            </div>
          )}

          {sets.map((set, index) => (
            <SetRow
              key={index}
              setNumber={set.setNumber}
              weightLbs={set.weightLbs}
              reps={set.reps}
              isPerSide={set.isPerSide}
              isWarmup={set.isWarmup}
              notes={set.notes ?? null}
              equipment={equipment}
              onChange={(data) => handleSetChange(index, data)}
              onRemove={() => handleRemoveSet(index)}
            />
          ))}

          {/* Add set button */}
          <button
            type="button"
            onClick={handleAddSet}
            className="w-full mt-2 py-2 rounded border border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors"
            style={{ minHeight: '44px' }}
          >
            + Add Set
          </button>
        </div>
      )}
    </div>
  );
}
