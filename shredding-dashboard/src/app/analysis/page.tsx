'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CycleAnalysis } from '@/lib/cycleAnalysis';
import type { NarrativeAnalysis, NarrativeSection, Tone } from '@/lib/narrativeAnalysis';
import CycleTimeline from '@/components/CycleTimeline';
import CycleGlycogenChart from '@/components/CycleGlycogenChart';

const TONE_STYLE: Record<Tone, { bar: string; label: string; text: string }> = {
  positive: { bar: 'var(--teal)', label: 'good', text: 'var(--teal)' },
  neutral: { bar: 'var(--muted)', label: 'info', text: 'var(--muted)' },
  warning: { bar: 'var(--amber)', label: 'watch', text: 'var(--amber)' },
  critical: { bar: 'var(--red)', label: 'fix', text: 'var(--red)' },
};

const GRADE_COLORS: Record<string, string> = {
  A: 'var(--teal)',
  B: 'var(--teal)',
  C: 'var(--amber)',
  D: 'var(--red)',
  incomplete: 'var(--muted)',
};

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    parts.push(
      <strong key={key++} className="text-[var(--foreground)] font-semibold">
        {match[1]}
      </strong>
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function SectionBlock({ section }: { section: NarrativeSection }) {
  const style = TONE_STYLE[section.tone];
  return (
    <section className="border-l-2 pl-5 py-1" style={{ borderColor: style.bar }}>
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">{section.title}</h3>
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: style.text }}
        >
          {style.label}
        </span>
      </div>
      <div className="flex flex-col gap-3 text-[15px] text-[var(--muted)] leading-relaxed">
        {section.body.map((p, i) => <p key={i}>{renderInline(p)}</p>)}
        {section.bullets && section.bullets.length > 0 && (
          <ul className="flex flex-col gap-1.5 pl-1 text-sm">
            {section.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--muted)] flex-shrink-0">·</span>
                <span>{renderInline(b)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

type CycleAnalysisWithCortisol = CycleAnalysis & {
  cortisolVerdict?: 'stay' | 'notice' | 'adjust';
  cortisolStackedReds?: number;
};

export default function AnalysisPage() {
  const [date, setDate] = useState<string>(todayString);
  const [cycle, setCycle] = useState<CycleAnalysisWithCortisol | null>(null);
  const [narrative, setNarrative] = useState<NarrativeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDaily, setShowDaily] = useState(false);

  const fetchAll = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const [cycleRes, narrativeRes] = await Promise.all([
        fetch(`/api/cycle-analysis?date=${d}&includeCortisol=true`),
        fetch(`/api/narrative-analysis?date=${d}`),
      ]);
      if (!cycleRes.ok) throw new Error(`Failed to load cycle analysis`);
      const cycleJson: CycleAnalysisWithCortisol = await cycleRes.json();
      const narrativeJson: NarrativeAnalysis | null = narrativeRes.ok ? await narrativeRes.json() : null;
      setCycle(cycleJson);
      setNarrative(narrativeJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(date);
  }, [date, fetchAll]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Analysis</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            How this cycle is running — glycogen, water, fat oxidation in plain terms.
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

      {!loading && !error && cycle && (
        <>
          {/* Current cycle header */}
          <section className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Cycle {cycle.currentCycle.cycleNumber}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {cycle.currentCycle.startDate ?? '—'} · Rest → Push → Pull → Legs
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Grade</span>
              <span
                className="text-3xl font-bold"
                style={{ color: GRADE_COLORS[cycle.grade.letter] ?? 'var(--muted)' }}
              >
                {cycle.grade.letter === 'incomplete' ? '—' : cycle.grade.letter}
              </span>
            </div>
          </section>

          {/* Timeline cards */}
          <CycleTimeline days={cycle.currentCycle.days} />

          {/* Glycogen curve */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
                Glycogen curve
              </h3>
              {cycle.previousCycle && (
                <span className="text-xs text-[var(--muted)]">
                  Dashed = Cycle {cycle.previousCycle.cycleNumber}
                </span>
              )}
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
              <CycleGlycogenChart
                current={cycle.glycogenSeries.current}
                previous={cycle.glycogenSeries.previous}
              />
            </div>
          </section>

          {/* Grade breakdown */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
              Cycle grade breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Carb targets', text: cycle.grade.carbTargetsHit },
                { label: 'V-shape', text: cycle.grade.vShapeFormed },
                { label: 'Refeed timing', text: cycle.grade.refeedTimed },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex flex-col gap-1.5"
                >
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    {item.label}
                  </span>
                  <span className="text-sm text-[var(--foreground)] leading-snug">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Coaching paragraph */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
              What&apos;s happening
            </h3>
            <p className="text-[15px] text-[var(--muted)] leading-relaxed">
              {cycle.coaching}
            </p>
          </section>

          {/* Weight breakdown */}
          {cycle.weightBreakdown.explanation && (
            <section
              className="rounded-xl border px-5 py-4"
              style={{
                borderColor: cycle.weightBreakdown.flagTrend ? 'var(--red)' : 'var(--border)',
                backgroundColor: cycle.weightBreakdown.flagTrend
                  ? 'color-mix(in srgb, var(--red) 8%, transparent)'
                  : 'var(--surface)',
              }}
            >
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
                Weight, read honestly
              </h3>
              {cycle.weightBreakdown.scaleWeight != null && cycle.weightBreakdown.estimatedLeanWeight != null && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Scale</span>
                    <span className="text-xl font-bold text-[var(--foreground)] tabular-nums">
                      {cycle.weightBreakdown.scaleWeight.toFixed(1)}
                      <span className="text-sm text-[var(--muted)] ml-1">lb</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Glycogen water</span>
                    <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--blue)' }}>
                      −{(cycle.weightBreakdown.glycogenWaterLbs ?? 0).toFixed(1)}
                      <span className="text-sm text-[var(--muted)] ml-1">lb</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Actual body</span>
                    <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--teal)' }}>
                      ~{cycle.weightBreakdown.estimatedLeanWeight.toFixed(1)}
                      <span className="text-sm text-[var(--muted)] ml-1">lb</span>
                    </span>
                  </div>
                </div>
              )}
              <p className="text-[14px] text-[var(--muted)] leading-relaxed">
                {renderInline(cycle.weightBreakdown.explanation)}
              </p>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed mt-2 pt-2 border-t border-[var(--border)]">
                {cycle.weightBreakdown.trendMessage}
              </p>
              {cycle.cortisolVerdict === 'adjust' && (
                <p className="text-[13px] text-[var(--amber)] leading-relaxed mt-2 pt-2 border-t border-[var(--border)]">
                  Water retention today may include aldosterone-driven retention, not just glycogen water.
                </p>
              )}
            </section>
          )}

          {/* Daily detail toggle */}
          {narrative && narrative.hasTodayLog && (
            <section className="border-t border-[var(--border)] pt-6">
              <button
                type="button"
                onClick={() => setShowDaily(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--teal)] transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showDaily ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Daily detail for {narrative.date}
              </button>
              {showDaily && (
                <div className="mt-6 flex flex-col gap-6">
                  {narrative.sections.map((s) => (
                    <SectionBlock key={s.id} section={s} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
