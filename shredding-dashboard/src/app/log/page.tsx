'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ScoreInput from '@/components/ScoreInput';
import { MACRO_TARGETS, DayType } from '@/constants/targets';

const DAY_TYPES: DayType[] = ['rest', 'push', 'pull', 'legs'];

const DAY_TYPE_LABELS: Record<DayType, string> = {
  rest: 'Rest',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

const inputClass =
  'w-full bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-[var(--foreground)] focus:border-[var(--teal)] focus:outline-none';

function DeltaDisplay({ actual, target }: { actual: number | ''; target: number | null }) {
  if (actual === '' || target === null) return null;
  const diff = Number(actual) - target;
  if (diff === 0) return <span className="text-sm text-[var(--muted)]">on target</span>;
  if (diff > 0) return <span className="text-sm text-[var(--red)]">+{diff} over</span>;
  return <span className="text-sm text-[var(--teal)]">{diff} under</span>;
}

export default function LogPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Section 1 — Day info
  const [date, setDate] = useState('2026-04-11');
  const [dayType, setDayType] = useState<DayType | null>(null);

  // Section 2 — Body metrics
  const [weightLbs, setWeightLbs] = useState<number | ''>('');
  const [morningHr, setMorningHr] = useState<number | ''>('');

  // Section 3 — Nutrition actuals
  const [caloriesActual, setCaloriesActual] = useState<number | ''>('');
  const [proteinActual, setProteinActual] = useState<number | ''>('');
  const [carbsActual, setCarbsActual] = useState<number | ''>('');
  const [fatActual, setFatActual] = useState<number | ''>('');

  // Section 4 — Subjective scores
  const [energyScore, setEnergyScore] = useState(0);
  const [satietyScore, setSatietyScore] = useState(0);
  const [pumpScore, setPumpScore] = useState(0);

  // Section 5 — Apple Watch data
  const [workoutDurationMin, setWorkoutDurationMin] = useState<number | ''>('');
  const [workoutActiveCal, setWorkoutActiveCal] = useState<number | ''>('');
  const [workoutTotalCal, setWorkoutTotalCal] = useState<number | ''>('');
  const [workoutAvgHr, setWorkoutAvgHr] = useState<number | ''>('');
  const [workoutMaxHr, setWorkoutMaxHr] = useState<number | ''>('');
  const [dailyTotalCalBurned, setDailyTotalCalBurned] = useState<number | ''>('');

  // Section 6 — Notes
  const [notes, setNotes] = useState('');

  const targets = dayType ? MACRO_TARGETS[dayType] : null;
  const isRestDay = dayType === 'rest';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dayType) {
      setError('Please select a day type.');
      return;
    }
    setError('');
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      date,
      dayType,
    };

    if (weightLbs !== '') payload.weightLbs = Number(weightLbs);
    if (morningHr !== '') payload.morningHr = Number(morningHr);
    if (caloriesActual !== '') payload.caloriesActual = Number(caloriesActual);
    if (proteinActual !== '') payload.proteinActual = Number(proteinActual);
    if (carbsActual !== '') payload.carbsActual = Number(carbsActual);
    if (fatActual !== '') payload.fatActual = Number(fatActual);
    if (energyScore > 0) payload.energyScore = energyScore;
    if (satietyScore > 0) payload.satietyScore = satietyScore;
    if (!isRestDay && pumpScore > 0) payload.pumpScore = pumpScore;
    if (workoutDurationMin !== '') payload.workoutDurationMin = Number(workoutDurationMin);
    if (workoutActiveCal !== '') payload.workoutActiveCal = Number(workoutActiveCal);
    if (workoutTotalCal !== '') payload.workoutTotalCal = Number(workoutTotalCal);
    if (workoutAvgHr !== '') payload.workoutAvgHr = Number(workoutAvgHr);
    if (workoutMaxHr !== '') payload.workoutMaxHr = Number(workoutMaxHr);
    if (dailyTotalCalBurned !== '') payload.dailyTotalCalBurned = Number(dailyTotalCalBurned);
    if (notes.trim()) payload.notes = notes.trim();

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save log');
      }
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  function numericInputProps(
    value: number | '',
    setter: (v: number | '') => void,
    step?: string
  ) {
    return {
      type: 'number' as const,
      className: inputClass,
      value: value === '' ? '' : value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setter(v === '' ? '' : Number(v));
      },
      step: step ?? '1',
    };
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Daily Log</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1 — Day Info */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Day Info</h2>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Date</label>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Day Type</label>
            <div className="grid grid-cols-4 gap-2">
              {DAY_TYPES.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDayType(dt)}
                  className={`py-2 px-3 rounded text-sm font-medium transition-colors border ${
                    dayType === dt
                      ? 'bg-[var(--teal)] border-[var(--teal)] text-white'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {DAY_TYPE_LABELS[dt]}
                </button>
              ))}
            </div>
            {targets && (
              <div className="mt-3 text-xs text-[var(--muted)] flex flex-wrap gap-x-4 gap-y-1">
                <span>Cal: {targets.calories}</span>
                <span>Protein: {targets.protein}g</span>
                <span>Carbs: {targets.carbs}g</span>
                <span>Fat: {targets.fat}g</span>
              </div>
            )}
          </div>
        </section>

        {/* Section 2 — Body Metrics */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Body Metrics</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Weight (lbs)</label>
              <input {...numericInputProps(weightLbs, setWeightLbs, '0.1')} />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Morning Resting HR</label>
              <input {...numericInputProps(morningHr, setMorningHr)} />
            </div>
          </div>
        </section>

        {/* Section 3 — Nutrition Actuals */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Nutrition</h2>

          <div className="space-y-3">
            {([
              { label: 'Calories', value: caloriesActual, setter: setCaloriesActual, targetKey: 'calories' as const },
              { label: 'Protein (g)', value: proteinActual, setter: setProteinActual, targetKey: 'protein' as const },
              { label: 'Carbs (g)', value: carbsActual, setter: setCarbsActual, targetKey: 'carbs' as const },
              { label: 'Fat (g)', value: fatActual, setter: setFatActual, targetKey: 'fat' as const },
            ] as const).map(({ label, value, setter, targetKey }) => (
              <div key={targetKey}>
                <label className="block text-sm text-[var(--muted)] mb-1">{label}</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input {...numericInputProps(value, setter)} />
                  </div>
                  <div className="min-w-[120px] text-right flex flex-col items-end gap-0.5">
                    {targets && (
                      <span className="text-xs text-[var(--muted)]">
                        Target: {targets[targetKey]}{targetKey !== 'calories' ? 'g' : ''}
                      </span>
                    )}
                    <DeltaDisplay actual={value} target={targets ? targets[targetKey] : null} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 — Subjective Scores */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Subjective Scores</h2>

          <div className="space-y-3">
            <ScoreInput label="Energy" value={energyScore} onChange={setEnergyScore} />
            <ScoreInput label="Satiety" value={satietyScore} onChange={setSatietyScore} />
            <ScoreInput
              label="Pump Quality"
              value={pumpScore}
              onChange={setPumpScore}
              disabled={isRestDay}
            />
          </div>
        </section>

        {/* Section 5 — Apple Watch Data */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Apple Watch Data</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Workout Duration (min)</label>
              <input {...numericInputProps(workoutDurationMin, setWorkoutDurationMin)} />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Active Cal</label>
              <input {...numericInputProps(workoutActiveCal, setWorkoutActiveCal)} />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Total Cal</label>
              <input {...numericInputProps(workoutTotalCal, setWorkoutTotalCal)} />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Avg HR</label>
              <input {...numericInputProps(workoutAvgHr, setWorkoutAvgHr)} />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Max HR</label>
              <input {...numericInputProps(workoutMaxHr, setWorkoutMaxHr)} />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Daily Total Cal Burned</label>
              <input {...numericInputProps(dailyTotalCalBurned, setDailyTotalCalBurned)} />
            </div>
          </div>
        </section>

        {/* Section 6 — Notes */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Notes</h2>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did the day go?"
          />
        </section>

        {/* Error display */}
        {error && (
          <div className="text-[var(--red)] text-sm bg-[var(--red)]/10 border border-[var(--red)]/30 rounded px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--teal)] text-white font-medium py-3 px-6 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : 'Save Daily Log'}
        </button>
      </form>
    </div>
  );
}
