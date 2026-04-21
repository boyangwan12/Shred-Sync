'use client';

import { useState, useEffect, useCallback } from 'react';
import WorkoutCalendar from '@/components/workout/WorkoutCalendar';

interface FoodItem {
  id: number;
  sortOrder: number;
  meal: string | null;
  name: string;
  quantity: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
}

interface FoodDay {
  date: string;
  dayType: string | null;
  carbType: string | null;
  targets: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  } | null;
  items: FoodItem[];
}

const MEAL_ORDER = [
  'breakfast',
  'preworkout',
  'lunch',
  'snack',
  'dinner',
  'postworkout',
];

const MEAL_LABEL: Record<string, { icon: string; label: string }> = {
  breakfast: { icon: '🍳', label: 'Breakfast' },
  preworkout: { icon: '🥤', label: 'Pre-workout' },
  lunch: { icon: '🍜', label: 'Lunch' },
  snack: { icon: '🥜', label: 'Snack' },
  dinner: { icon: '🍽️', label: 'Dinner' },
  postworkout: { icon: '🍗', label: 'Post-workout' },
};

const DAY_TYPE_COLORS: Record<string, string> = {
  rest: '#EF9F27',
  push: '#E24B4A',
  pull: '#378ADD',
  legs: '#1D9E75',
};

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function num(v: number | null | undefined, digits = 0): string {
  if (v == null) return '—';
  return digits === 0 ? Math.round(v).toString() : v.toFixed(digits);
}

function sumItems(items: FoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      proteinG: acc.proteinG + (item.proteinG ?? 0),
      carbsG: acc.carbsG + (item.carbsG ?? 0),
      fatG: acc.fatG + (item.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

// Normalize LLM-inserted meal strings so "Pre-Workout", "pre_workout",
// "pre-workout" all land in the same bucket as "preworkout".
function normalizeMeal(raw: string | null | undefined): string {
  if (!raw) return 'unassigned';
  const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (MEAL_ORDER.includes(key)) return key;
  return 'unassigned';
}

function groupByMeal(items: FoodItem[]) {
  const groups: Record<string, FoodItem[]> = {};
  for (const item of items) {
    const key = normalizeMeal(item.meal);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  const ordered = MEAL_ORDER.filter((k) => groups[k]?.length);
  if (groups.unassigned?.length) ordered.push('unassigned');
  return ordered.map((k) => ({ meal: k, items: groups[k] }));
}

export default function FoodPage() {
  const [date, setDate] = useState(todayString);
  const [day, setDay] = useState<FoodDay | null>(null);
  const [foodDays, setFoodDays] = useState<
    Array<{ date: string; dayType: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchDay = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/food/${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setDay(data);
      } else {
        setDay(null);
      }
    } catch {
      setDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDay(date);
  }, [date, fetchDay]);

  useEffect(() => {
    async function fetchDates() {
      try {
        const res = await fetch('/api/food/dates');
        if (res.ok) {
          const data = await res.json();
          setFoodDays(data);
        }
      } catch {
        // silently fail
      }
    }
    fetchDates();
  }, []);

  const groups = day ? groupByMeal(day.items) : [];
  const total = day ? sumItems(day.items) : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const targets = day?.targets;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Food</h1>
        {day?.dayType && (
          <span
            className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{
              color: DAY_TYPE_COLORS[day.dayType] ?? 'var(--muted)',
              backgroundColor: `${DAY_TYPE_COLORS[day.dayType] ?? 'var(--muted)'}20`,
            }}
          >
            {day.dayType}
            {day.carbType ? ` · ${day.carbType}` : ''}
          </span>
        )}
      </div>

      <div className="mb-6">
        <WorkoutCalendar
          selectedDate={date}
          onDateSelect={setDate}
          workoutDays={foodDays}
        />
      </div>

      {/* Targets + Totals summary */}
      {targets && (
        <div className="mb-6 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="grid grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Cal', actual: total.calories, target: targets.calories, unit: '' },
              { label: 'Protein', actual: total.proteinG, target: targets.proteinG, unit: 'g' },
              { label: 'Carbs', actual: total.carbsG, target: targets.carbsG, unit: 'g' },
              { label: 'Fat', actual: total.fatG, target: targets.fatG, unit: 'g' },
            ].map(({ label, actual, target, unit }) => {
              const pct = target ? (actual / target) * 100 : 0;
              const over = target != null && actual > target;
              return (
                <div key={label}>
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                    {label}
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    {num(actual)}
                    {unit}
                    <span className="text-[var(--muted)] font-normal text-sm"> / {target ?? '—'}{unit}</span>
                  </div>
                  {target != null && (
                    <div
                      className={`text-[11px] tabular-nums ${over ? 'text-[var(--red)]' : 'text-[var(--muted)]'}`}
                    >
                      {pct.toFixed(0)}%{over ? ' over' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-[var(--muted)] text-sm">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="text-sm">No food logged for {date}.</p>
          <p className="text-xs mt-1">Plan tomorrow&apos;s food in chat — it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ meal, items }) => {
            const m = MEAL_LABEL[meal] ?? { icon: '•', label: 'Other' };
            const sub = sumItems(items);
            return (
              <div
                key={meal}
                className="border border-[var(--border)] rounded-lg overflow-hidden"
              >
                <div className="px-4 py-2 bg-[var(--surface)] flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.icon}</span>
                    <span className="font-semibold text-[var(--foreground)]">{m.label}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] tabular-nums">
                    {num(sub.calories)} cal · {num(sub.proteinG)}P / {num(sub.carbsG)}C / {num(sub.fatG)}F
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-3 py-2 font-normal">Item</th>
                      <th className="text-left px-2 py-2 font-normal w-20">Qty</th>
                      <th className="text-right px-2 py-2 font-normal w-14">Cal</th>
                      <th className="text-right px-2 py-2 font-normal w-12">P</th>
                      <th className="text-right px-2 py-2 font-normal w-12">C</th>
                      <th className="text-right px-2 py-2 font-normal w-12">F</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--border)] last:border-b-0"
                      >
                        <td className="px-3 py-2 text-[var(--foreground)]">
                          {item.name}
                          {item.notes && (
                            <div className="text-[11px] text-[var(--muted)] italic mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-[var(--muted)] text-xs">
                          {item.quantity ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {num(item.calories)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {num(item.proteinG)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {num(item.carbsG)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {num(item.fatG)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Daily total footer */}
          <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-baseline justify-between">
            <span className="font-semibold">Daily total</span>
            <span className="tabular-nums text-[var(--foreground)]">
              {num(total.calories)} cal · {num(total.proteinG)}g P · {num(total.carbsG)}g C · {num(total.fatG)}g F
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
