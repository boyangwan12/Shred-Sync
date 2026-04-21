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

export default function WorkoutPage() {
  const [date, setDate] = useState(todayString);
  const [dayType, setDayType] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loadError, setLoadError] = useState('');
  const [workoutDays, setWorkoutDays] = useState<Array<{ date: string; dayType: string }>>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;

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

  function handleAddExercise(
    exerciseId: number,
    exerciseName: string,
    equipment: string | null,
  ) {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId,
        exerciseName,
        equipment,
        sortOrder: prev.length,
        notes: '',
        sets: [
          {
            setNumber: 1,
            weightLbs: '',
            reps: '',
            isPerSide: false,
            isWarmup: false,
          },
        ],
      },
    ]);
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
            exerciseName={ex.exerciseName}
            equipment={ex.equipment}
            sets={ex.sets}
            onUpdate={(sets) => handleUpdateExerciseSets(index, sets)}
            onRemove={() => handleRemoveExercise(index)}
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
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />

      {/* Save indicator */}
      <SaveIndicator status={saveStatus} />
    </div>
  );
}
