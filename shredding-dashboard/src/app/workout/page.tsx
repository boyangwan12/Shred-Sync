'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ExerciseCard, { type ExerciseSetData } from '@/components/workout/ExerciseCard';
import ExercisePicker from '@/components/workout/ExercisePicker';
import SaveIndicator from '@/components/workout/SaveIndicator';
import WorkoutCalendar from '@/components/workout/WorkoutCalendar';
import OverloadTable from '@/components/workout/OverloadTable';
import CycleDayComparison from '@/components/workout/CycleDayComparison';
import { totalWeight } from '@/lib/weight';

interface WorkoutExercise {
  exerciseId: number;
  exerciseName: string;
  equipment: string | null;
  sortOrder: number;
  notes: string;
  sets: ExerciseSetData[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptySet(setNumber = 1): ExerciseSetData {
  return {
    setNumber,
    weightLbs: '',
    reps: '',
    isPerSide: false,
    isWarmup: false,
    notes: null,
  };
}

async function suggestPlanFromHistory(
  exerciseId: number,
  currentDate: string,
  equipment: string | null,
  signal?: AbortSignal,
): Promise<{ notes: string; sets: ExerciseSetData[] }> {
  try {
    const res = await fetch(`/api/exercises/${exerciseId}/history?limit=5`, {
      signal,
    });
    if (!res.ok) return { notes: '', sets: [emptySet()] };
    const history: Array<{
      date: string;
      dayType: string;
      sets: Array<{
        weightLbs: number | null;
        reps: number | null;
        rpe: number | null;
        isPerSide: boolean;
        isWarmup: boolean;
      }>;
    }> = await res.json();

    const prior = history.find((h) => h.date !== currentDate);
    if (!prior) return { notes: '', sets: [emptySet()] };

    const working = prior.sets.filter((s) => !s.isWarmup);
    if (working.length === 0) return { notes: '', sets: [emptySet()] };

    // Prefer the heaviest set in the hypertrophy rep range (reps >= 6)
    // to avoid anchoring on a peak single/double. Fall back to overall heaviest.
    const byWeightDesc = (
      a: { weightLbs: number | null; reps: number | null },
      b: { weightLbs: number | null; reps: number | null },
    ) => {
      const wa = a.weightLbs ?? -1;
      const wb = b.weightLbs ?? -1;
      if (wb !== wa) return wb - wa;
      return (b.reps ?? 0) - (a.reps ?? 0);
    };
    const inRange = working.filter((s) => (s.reps ?? 0) >= 6);
    const pool = inRange.length > 0 ? inRange : working;
    const top = [...pool].sort(byWeightDesc)[0];

    const isBW = equipment === 'bodyweight' || top.weightLbs == null;
    const topReps = top.reps ?? 8;
    // Dumbbell weights are per-hand by convention; don't carry over isPerSide flag
    const perSide = equipment === 'dumbbell' ? false : (top.isPerSide ?? false);
    const dateLabel = prior.date.slice(5).replace('-', '/');
    const round5 = (v: number) => Math.max(Math.round(v / 5) * 5, 5);
    // If last top set was RPE >=9 (near failure), skip the +1 rep overload attempt.
    // Match-only prescription respects a recovery-fatigue signal.
    const nearFailure = typeof top.rpe === 'number' && top.rpe >= 9;

    const sets: ExerciseSetData[] = [];

    if (isBW) {
      sets.push({
        setNumber: 1,
        weightLbs: '',
        reps: Math.max(topReps - 3, 5),
        isPerSide: perSide,
        isWarmup: true,
        notes: 'BW warmup',
      });
      sets.push({
        setNumber: 2,
        weightLbs: '',
        reps: topReps,
        isPerSide: perSide,
        isWarmup: false,
        notes: `match ${dateLabel}`,
      });
      sets.push({
        setNumber: 3,
        weightLbs: '',
        reps: topReps,
        isPerSide: perSide,
        isWarmup: false,
        notes: null,
      });
      sets.push({
        setNumber: 4,
        weightLbs: '',
        reps: nearFailure ? topReps : topReps + 1,
        isPerSide: perSide,
        isWarmup: false,
        notes: nearFailure
          ? 'match (last session RPE 9+ — no overload)'
          : '+1 rep target',
      });
      return {
        notes: nearFailure
          ? `Based on ${dateLabel} session (BW × ${topReps}, ${working.length} working sets). Last top set was RPE 9+ — match-only, no overload.`
          : `Based on ${dateLabel} session (BW × ${topReps}, ${working.length} working sets). +1 rep target on final set.`,
        sets,
      };
    }

    const topW = top.weightLbs!;
    const backOff = round5(topW * 0.85);
    // Warmup ramp scales with absolute load to avoid absurd ultra-light or
    // too-close-to-top warmup sets:
    //   <80 lb   → single 70% warmup (skip 40% — it's trivial)
    //   80–179   → 40% + 70% (standard two-step)
    //   ≥180 lb  → 40% + 55% + 70% (three-step for heavy compounds)
    const useFullRamp = topW >= 80;
    const useHeavyRamp = topW >= 180;

    let setNum = 1;

    if (useFullRamp) {
      sets.push({
        setNumber: setNum++,
        weightLbs: round5(topW * 0.4),
        reps: topReps + 4,
        isPerSide: perSide,
        isWarmup: true,
        notes: 'warmup',
      });
    }
    if (useHeavyRamp) {
      sets.push({
        setNumber: setNum++,
        weightLbs: round5(topW * 0.55),
        reps: topReps + 2,
        isPerSide: perSide,
        isWarmup: true,
        notes: 'warmup (heavy compound — 3-step ramp)',
      });
    }
    sets.push({
      setNumber: setNum++,
      weightLbs: round5(topW * 0.7),
      reps: Math.max(topReps - 2, 4),
      isPerSide: perSide,
      isWarmup: true,
      notes: 'warmup',
    });
    sets.push({
      setNumber: setNum++,
      weightLbs: topW,
      reps: topReps,
      isPerSide: perSide,
      isWarmup: false,
      notes: `match ${dateLabel}`,
    });
    sets.push({
      setNumber: setNum++,
      weightLbs: topW,
      reps: topReps,
      isPerSide: perSide,
      isWarmup: false,
      notes: null,
    });
    sets.push({
      setNumber: setNum++,
      weightLbs: topW,
      reps: nearFailure ? topReps : topReps + 1,
      isPerSide: perSide,
      isWarmup: false,
      notes: nearFailure
        ? 'match (last session RPE 9+ — no overload)'
        : '+1 rep target, RPE 8 cap',
    });
    sets.push({
      setNumber: setNum++,
      weightLbs: backOff,
      reps: topReps + 2,
      isPerSide: perSide,
      isWarmup: false,
      notes: 'back-off AMRAP',
    });

    return {
      notes: nearFailure
        ? `Based on ${dateLabel} session (top: ${topW}×${topReps}, ${working.length} working sets). Last top set was RPE 9+ — match-only, focus on cleaner reps.`
        : `Based on ${dateLabel} session (top: ${topW}×${topReps}, ${working.length} working sets). Warmup ramp + match + overload attempt + back-off.`,
      sets,
    };
  } catch {
    return { notes: '', sets: [emptySet()] };
  }
}

export default function WorkoutPage() {
  const [date, setDate] = useState(todayString);
  const [dayType, setDayType] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loadError, setLoadError] = useState('');
  const [workoutDays, setWorkoutDays] = useState<Array<{ date: string; dayType: string }>>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;

  // Track current date in a ref so async handlers never capture a stale value
  const dateRef = useRef(date);
  dateRef.current = date;

  // Abort in-flight suggestion fetches when date changes or component unmounts
  const suggestAbortRef = useRef<AbortController | null>(null);

  // Track whether we've loaded initial data (to avoid saving on mount)
  const hasLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Fetch workout on date change
  const fetchWorkout = useCallback(async (dateStr: string) => {
    isInitialLoadRef.current = true;
    setLoadError('');
    try {
      const res = await fetch(`/api/workout/${dateStr}`);
      if (res.status === 404) {
        // No workout for this date — start blank
        setDayType(null);
        setExercises([]);
        hasLoadedRef.current = true;
        isInitialLoadRef.current = false;
        return;
      }
      if (!res.ok) throw new Error('Failed to load workout');

      const data = await res.json();
      setDayType(data.dailyLog?.dayType ?? null);

      const loaded: WorkoutExercise[] = (data.exercises ?? []).map(
        (we: {
          exerciseId: number;
          exercise: { name: string; equipment: string | null };
          sortOrder: number;
          notes: string | null;
          sets: {
            setNumber: number;
            weightLbs: number | null;
            reps: number | null;
            isPerSide: boolean;
            isWarmup: boolean;
            notes: string | null;
          }[];
        }) => ({
          exerciseId: we.exerciseId,
          exerciseName: we.exercise.name,
          equipment: we.exercise.equipment ?? null,
          sortOrder: we.sortOrder,
          notes: we.notes ?? '',
          sets: we.sets.map((s) => ({
            setNumber: s.setNumber,
            weightLbs: s.weightLbs ?? '',
            reps: s.reps ?? '',
            isPerSide: s.isPerSide,
            isWarmup: s.isWarmup,
            notes: s.notes ?? null,
          })),
        })
      );
      setExercises(loaded);
      hasLoadedRef.current = true;
      isInitialLoadRef.current = false;
    } catch {
      setLoadError('Could not load workout data.');
      hasLoadedRef.current = true;
      isInitialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    hasLoadedRef.current = false;
    // Cancel any pending suggestion fetch so it doesn't apply to the new date
    suggestAbortRef.current?.abort();
    // Cancel any pending auto-save targeted at the old date
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchWorkout(date);
  }, [date, fetchWorkout]);

  // Fetch workout days for calendar
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/workout/stats');
        if (res.ok) {
          const data = await res.json();
          setWorkoutDays(data);
        }
      } catch {
        // silently fail — calendar just won't show dots
      }
    }
    fetchStats();
  }, []);

  // Auto-save with 1.5s debounce
  const saveWorkout = useCallback(async (dateStr: string, exs: WorkoutExercise[]) => {
    setSaveStatus('saving');
    try {
      const payload = {
        exercises: exs.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          sortOrder: i,
          notes: ex.notes || null,
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            weightLbs: s.weightLbs === '' ? null : s.weightLbs,
            reps: s.reps === '' ? null : s.reps,
            isWarmup: s.isWarmup,
            isPerSide: s.isPerSide,
            notes: s.notes ?? null,
          })),
        })),
      };

      const res = await fetch(`/api/workout/${dateStr}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, []);

  // Trigger debounced save when exercises change (but not on initial load)
  useEffect(() => {
    if (!hasLoadedRef.current || isInitialLoadRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveWorkout(date, exercisesRef.current);
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [exercises, date, saveWorkout]);

  // Calculate total session volume (includes per-side doubling + bar weight)
  const totalVolume = exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((exTotal, s) => {
      if (s.isWarmup) return exTotal;
      const tw = totalWeight(s.weightLbs, s.isPerSide, ex.equipment);
      const r = typeof s.reps === 'number' ? s.reps : 0;
      if (tw === null) return exTotal;
      return exTotal + tw * r;
    }, 0);
  }, 0);

  async function handleAddExercise(
    exerciseId: number,
    exerciseName: string,
    equipment: string | null,
  ) {
    // Capture date at call time and track it — bail if date changes mid-fetch
    const capturedDate = dateRef.current;
    const capturedSwapIndex = swapIndex;

    // Cancel any in-flight suggestion fetch
    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;

    const suggestion = await suggestPlanFromHistory(
      exerciseId,
      capturedDate,
      equipment,
      controller.signal,
    );

    // Bail if date changed while we were fetching — user moved on
    if (capturedDate !== dateRef.current) return;
    // Also bail if the fetch was aborted
    if (controller.signal.aborted) return;

    if (capturedSwapIndex !== null) {
      setExercises((prev) =>
        prev.map((ex, i) =>
          i === capturedSwapIndex
            ? {
                ...ex,
                exerciseId,
                exerciseName,
                equipment,
                notes: suggestion.notes,
                sets: suggestion.sets,
              }
            : ex,
        ),
      );
      setSwapIndex(null);
      return;
    }
    setExercises((prev) => [
      ...prev,
      {
        exerciseId,
        exerciseName,
        equipment,
        sortOrder: prev.length,
        notes: suggestion.notes,
        sets: suggestion.sets,
      },
    ]);
  }

  function handleSwapExercise(index: number) {
    setSwapIndex(index);
    setPickerOpen(true);
  }

  function handleUpdateExerciseSets(index: number, sets: ExerciseSetData[]) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, sets } : ex))
    );
  }

  function handleRemoveExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  const DAY_TYPE_COLORS: Record<string, string> = {
    push: 'var(--red)',
    pull: 'var(--blue)',
    legs: 'var(--teal)',
    rest: 'var(--muted)',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Workout</h1>
          {dayType && (
            <span
              className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{
                color: DAY_TYPE_COLORS[dayType] ?? 'var(--muted)',
                backgroundColor: `${DAY_TYPE_COLORS[dayType] ?? 'var(--muted)'}20`,
              }}
            >
              {dayType}
            </span>
          )}
        </div>

        {/* Total volume */}
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wide">Volume</div>
          <div className="text-xl font-bold text-[var(--foreground)] tabular-nums">
            {totalVolume > 0 ? totalVolume.toLocaleString() : '—'}
          </div>
          {totalVolume > 0 && (
            <div className="text-xs text-[var(--muted)]">lbs</div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-6">
        <WorkoutCalendar
          selectedDate={date}
          onDateSelect={setDate}
          workoutDays={workoutDays}
        />
      </div>

      {/* Load error */}
      {loadError && (
        <div className="mb-4 text-sm text-[var(--amber)] bg-[var(--amber)]/10 border border-[var(--amber)]/30 rounded px-4 py-3">
          {loadError}
        </div>
      )}

      {/* Exercise cards */}
      <div className="space-y-4">
        {exercises.map((ex, index) => (
          <ExerciseCard
            key={`${ex.exerciseId}-${index}`}
            exerciseId={ex.exerciseId}
            exerciseName={ex.exerciseName}
            equipment={ex.equipment}
            notes={ex.notes}
            sets={ex.sets}
            currentDate={date}
            onUpdate={(sets) => handleUpdateExerciseSets(index, sets)}
            onRemove={() => handleRemoveExercise(index)}
            onSwap={() => handleSwapExercise(index)}
          />
        ))}
      </div>

      {/* Empty state */}
      {exercises.length === 0 && !loadError && (
        <div className="text-center py-16 text-[var(--muted)]">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
          <p className="text-sm">No exercises yet.</p>
          <p className="text-xs mt-1">Tap the button below to add one.</p>
        </div>
      )}

      {/* Add exercise button */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full mt-6 py-4 rounded-lg bg-[var(--teal)] text-white font-semibold text-base transition-opacity hover:opacity-90 active:opacity-80"
        style={{ minHeight: '52px' }}
      >
        + Add Exercise
      </button>

      {/* Progressive Overload section */}
      <details className="group mt-8">
        <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-[var(--foreground)] py-3 border-t border-[var(--border)]">
          <svg
            className="w-4 h-4 text-[var(--muted)] transition-transform group-open:rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {'Progressive Overload 渐进超负荷'}
        </summary>
        <div className="pt-2 pb-4 space-y-4">
          <OverloadTable />
          {dayType && dayType !== 'rest' && <CycleDayComparison dayType={dayType} />}
        </div>
      </details>

      {/* Exercise picker modal */}
      <ExercisePicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setSwapIndex(null);
        }}
        onSelect={handleAddExercise}
      />

      {/* Save indicator */}
      <SaveIndicator status={saveStatus} />
    </div>
  );
}
