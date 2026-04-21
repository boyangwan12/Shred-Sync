'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import CortisolDial from '@/components/CortisolDial';
import StressPathway from '@/components/StressPathway';
import CortisolSignalTable from '@/components/CortisolSignalTable';
import CortisolExplainer from '@/components/CortisolExplainer';
import CortisolDerivation from '@/components/CortisolDerivation';
import type { CortisolSignal, Recommendation, Verdict, BandBoundaries } from '@/lib/cortisol';

interface CortisolResponse {
  date: string;
  score: number;
  verdict: Verdict;
  stackedReds: number;
  bandBoundaries: BandBoundaries;
  signals: CortisolSignal[];
  recommendations: Recommendation[];
  baselineWindow: { from: string; to: string };
  derivation: {
    rawInputs: {
      hrvMs: number | null;
      sleepMinutes: number | null;
      deepSleepMinutes: number | null;
      sleepBpm: number | null;
      wakingBpm: number | null;
      caloriesActual: number | null;
      workoutActiveCal: number | null;
    } | null;
    baseline: {
      hrvMsAvg7: number | null;
      sleepMinutesAvg7: number | null;
      wakingBpmAvg7: number | null;
    } | null;
    baselinePoints: { hrv: number; tst: number; rhr: number };
    yesterdayHrvDelta: number | null;
  };
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SIGNAL_PRETTY: Record<CortisolSignal['name'], string> = {
  hrv: 'HRV',
  tst: 'sleep duration',
  rhr: 'resting HR',
  ea: 'energy availability',
  deepFraction: 'deep-sleep fraction',
};

const CATEGORY_LABEL: Record<Recommendation['category'], string> = {
  diet: 'Diet',
  workout: 'Workout',
  cycle: 'Cycle',
  recovery: 'Recovery',
};

export default function CortisolPage() {
  const [date, setDate] = useState<string>(todayString);
  const [data, setData] = useState<CortisolResponse | null>(null);
  const [adjacentEmpty, setAdjacentEmpty] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCortisol = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      // Main + two adjacent dates (for empty-state check per AC-U2)
      const prev = new Date(d + 'T00:00:00Z');
      prev.setUTCDate(prev.getUTCDate() - 1);
      const next = new Date(d + 'T00:00:00Z');
      next.setUTCDate(next.getUTCDate() + 1);
      const prevStr = prev.toISOString().split('T')[0];
      const nextStr = next.toISOString().split('T')[0];

      const [mainRes, prevRes, nextRes] = await Promise.all([
        fetch(`/api/cortisol?date=${d}`),
        fetch(`/api/cortisol?date=${prevStr}`),
        fetch(`/api/cortisol?date=${nextStr}`),
      ]);
      if (!mainRes.ok) throw new Error('Failed to load cortisol');
      const main: CortisolResponse = await mainRes.json();
      setData(main);

      // Determine empty-state: today + both adjacent have no counted signal with real data
      const hasData = (r: CortisolResponse) => r.signals.some(s => s.counted && s.value != null);
      const prevJson: CortisolResponse | null = prevRes.ok ? await prevRes.json() : null;
      const nextJson: CortisolResponse | null = nextRes.ok ? await nextRes.json() : null;
      const targetEmpty = !hasData(main);
      const prevEmpty = !prevJson || !hasData(prevJson);
      const nextEmpty = !nextJson || !hasData(nextJson);
      setAdjacentEmpty(targetEmpty && prevEmpty && nextEmpty);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCortisol(date);
  }, [date, fetchCortisol]);

  const noticeName: string | null =
    data && data.verdict === 'notice'
      ? (() => {
          const r = data.signals.find(s => s.counted && s.flag === 'red');
          return r ? SIGNAL_PRETTY[r.name] : null;
        })()
      : null;

  const recsByCategory = (cat: Recommendation['category']) =>
    (data?.recommendations ?? []).filter(r => r.category === cat);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Cortisol</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Daily HPA-axis load from HRV, sleep, resting HR, and energy availability.
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--teal)] focus:outline-none"
        />
      </header>

      {loading && <p className="text-[var(--muted)] text-sm">Loading…</p>}
      {error && <p className="text-[var(--red)] text-sm">{error}</p>}

      {!loading && !error && data && (
        <>
          {adjacentEmpty ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col items-center gap-3 text-center">
              <p className="text-[var(--foreground)] font-semibold">Import AutoSleep CSV</p>
              <p className="text-sm text-[var(--muted)] max-w-md">
                No sleep or HRV data for this date or either adjacent day. Upload a recent AutoSleep export to
                enable the cortisol panel.
              </p>
              <Link
                href="/sleep-import"
                className="mt-2 px-4 py-2 rounded bg-[var(--teal)] text-white text-sm font-medium"
              >
                Go to import page →
              </Link>
            </div>
          ) : (
            <>
              {/* Dial + Pathway */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
                <CortisolDial score={data.score} bandBoundaries={data.bandBoundaries} />
                <StressPathway signals={data.signals} />
              </section>

              {/* Verdict block */}
              <section>
                {data.verdict === 'stay' && (
                  <div className="rounded-lg border border-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)] px-5 py-4">
                    <p className="text-[var(--foreground)] font-semibold">Stay the course</p>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      No stacked red signals today. Follow your planned cycle day.
                    </p>
                  </div>
                )}
                {data.verdict === 'notice' && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--amber)] bg-[color-mix(in_srgb,var(--amber)_10%,transparent)] px-4 py-1.5 text-sm text-[var(--amber)]">
                    Notice — {noticeName ?? 'a signal'} is elevated today.
                  </div>
                )}
                {data.verdict === 'adjust' && (
                  <div className="flex flex-col gap-4 rounded-lg border border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_8%,transparent)] px-5 py-4">
                    <div>
                      <p className="text-[var(--red)] font-semibold uppercase tracking-wider text-xs">Adjust — here&apos;s why</p>
                      <p className="text-[var(--foreground)] text-sm mt-1">
                        {data.stackedReds} signals stacked red. Consider today&apos;s adjustments:
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(['diet', 'workout', 'cycle', 'recovery'] as const).map(cat => {
                        const items = recsByCategory(cat);
                        if (items.length === 0) return null;
                        return (
                          <div
                            key={cat}
                            className="rounded border border-[var(--border)] bg-[var(--surface)] p-3"
                          >
                            <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                              {CATEGORY_LABEL[cat]}
                            </h4>
                            <ul className="flex flex-col gap-1.5 text-sm text-[var(--foreground)]">
                              {items.map((r, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-[var(--red)] flex-shrink-0">·</span>
                                  <span>{r.text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Signal table */}
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Signals</h3>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <CortisolSignalTable signals={data.signals} />
                </div>
              </section>

              {/* Derivation */}
              <CortisolDerivation
                date={data.date}
                score={data.score}
                verdict={data.verdict}
                stackedReds={data.stackedReds}
                bandBoundaries={data.bandBoundaries}
                signals={data.signals}
                derivation={data.derivation}
                baselineWindow={data.baselineWindow}
              />

              {/* Explainer */}
              <CortisolExplainer />
            </>
          )}
        </>
      )}
    </div>
  );
}
