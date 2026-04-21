'use client';

import { useState } from 'react';
import type { CortisolSignal, BandBoundaries, Verdict } from '@/lib/cortisol';

interface Derivation {
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
}

interface Props {
  date: string;
  score: number;
  verdict: Verdict;
  stackedReds: number;
  bandBoundaries: BandBoundaries;
  signals: CortisolSignal[];
  derivation: Derivation;
  baselineWindow: { from: string; to: string };
}

const FLAG_COLOR: Record<string, string> = {
  ok: 'var(--teal)',
  yellow: 'var(--amber)',
  red: 'var(--red)',
  unknown: 'var(--muted)',
};

const SIGNAL_LABEL: Record<string, string> = {
  hrv: 'HRV (RMSSD)',
  tst: 'Total Sleep Time',
  rhr: 'Resting HR',
  ea: 'Energy Availability',
  deepFraction: 'Deep-sleep fraction',
};

function fmtMin(m: number | null): string {
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

function fmtPct(v: number | null, digits = 1): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

function fmtNum(v: number | null, suffix = '', digits = 0): string {
  if (v == null) return '—';
  return `${v.toFixed(digits)}${suffix}`;
}

function signalFlagExplanation(s: CortisolSignal): string {
  if (s.flag === 'unknown') {
    if (s.value == null) return 'no data — signal is "unknown" and does not count toward the verdict';
    if (s.baseline == null) return 'baseline not yet established (need ≥4 prior days) — signal is "unknown" and does not count';
    return 'insufficient context — signal is "unknown"';
  }
  if (s.name === 'hrv') {
    if (s.flag === 'red') return `Δ ${fmtPct(s.delta)} is ≤ −20% — peer-reviewed red threshold (Kiviniemi / PMC11204851). Sustained-red rule then checks yesterday.`;
    if (s.flag === 'yellow') return `Δ ${fmtPct(s.delta)} is < −7.5% (but not ≤ −20%) — yellow`;
    return `Δ ${fmtPct(s.delta)} is within the on-target band (>−7.5%)`;
  }
  if (s.name === 'tst') {
    if (s.flag === 'red') return `${fmtMin(s.value)} is ≤ 5.5h — red (Spiegel 1997: evening cortisol +37% after 4h-in-bed nights)`;
    if (s.flag === 'yellow') return `${fmtMin(s.value)} is < 6.0h — yellow`;
    return `${fmtMin(s.value)} is ≥ 6.0h — on target`;
  }
  if (s.name === 'rhr') {
    if (s.flag === 'red') return `+${fmtNum(s.delta, ' bpm')} vs baseline — red (+8 bpm ceiling, Meeusen 2013)`;
    if (s.flag === 'yellow') return `+${fmtNum(s.delta, ' bpm')} vs baseline — yellow (+5 bpm yellow line)`;
    return `delta +${fmtNum(s.delta, ' bpm')} is within the normal <+5 bpm band`;
  }
  if (s.name === 'ea') {
    if (s.flag === 'red') return `${fmtNum(s.value, ' kcal/kg FFM', 1)} is ≤ 20 — red (LEA threshold, PMC10388605)`;
    if (s.flag === 'yellow') return `${fmtNum(s.value, ' kcal/kg FFM', 1)} is < 30 — yellow`;
    return `${fmtNum(s.value, ' kcal/kg FFM', 1)} is ≥ 30 — on target`;
  }
  if (s.name === 'deepFraction') {
    return `${fmtPct(s.value)} of total sleep — informational only (heuristic, not peer-reviewed, does not count toward verdict)`;
  }
  return '';
}

export default function CortisolDerivation(props: Props) {
  const [open, setOpen] = useState(false);
  const { signals, derivation, baselineWindow, score, verdict, stackedReds, bandBoundaries } = props;
  const counted = signals.filter(s => s.counted);
  const countedReds = counted.filter(s => s.flag === 'red').length;
  const countedYellows = counted.filter(s => s.flag === 'yellow').length;
  const band =
    score < bandBoundaries.amber[0]
      ? 'teal'
      : score < bandBoundaries.red[0]
      ? 'amber'
      : 'red';

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--teal)] text-left"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        How we got to this verdict
      </button>

      {open && (
        <div className="flex flex-col gap-5 pt-2">
          {/* Step 1: raw inputs */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Step 1 · Today&apos;s inputs
            </h4>
            {derivation.rawInputs ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <Input label="HRV" value={fmtNum(derivation.rawInputs.hrvMs, ' ms', 1)} />
                <Input label="Sleep" value={fmtMin(derivation.rawInputs.sleepMinutes)} />
                <Input label="Deep sleep" value={fmtMin(derivation.rawInputs.deepSleepMinutes)} />
                <Input label="Sleep BPM" value={fmtNum(derivation.rawInputs.sleepBpm)} />
                <Input label="Waking BPM" value={fmtNum(derivation.rawInputs.wakingBpm)} />
                <Input label="Cal eaten" value={fmtNum(derivation.rawInputs.caloriesActual)} />
                <Input label="Active cal" value={fmtNum(derivation.rawInputs.workoutActiveCal)} />
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                No daily log for {props.date}. Upload AutoSleep + log this day to get a real reading.
              </p>
            )}
          </div>

          {/* Step 2: baseline */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Step 2 · Rolling baseline ({baselineWindow.from} → {baselineWindow.to})
            </h4>
            <p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">
              Each metric&apos;s own 7-day trailing average, computed server-side from prior DailyLogs. Requires ≥4
              non-null days; otherwise the signal is marked &quot;unknown&quot;.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <Input
                label={`HRV (n=${derivation.baselinePoints.hrv})`}
                value={fmtNum(derivation.baseline?.hrvMsAvg7 ?? null, ' ms', 1)}
              />
              <Input
                label={`Sleep (n=${derivation.baselinePoints.tst})`}
                value={fmtMin(derivation.baseline?.sleepMinutesAvg7 ?? null)}
              />
              <Input
                label={`Resting HR (n=${derivation.baselinePoints.rhr})`}
                value={fmtNum(derivation.baseline?.wakingBpmAvg7 ?? null, ' bpm', 1)}
              />
            </div>
          </div>

          {/* Step 3: per-signal flag derivation */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Step 3 · Each signal → its flag
            </h4>
            <ul className="flex flex-col gap-2 text-sm">
              {signals.map(s => (
                <li
                  key={s.name}
                  className="flex gap-3 items-start border-l-2 pl-3 py-0.5"
                  style={{ borderColor: FLAG_COLOR[s.flag] }}
                >
                  <span
                    className="flex-shrink-0 mt-0.5 text-[10px] uppercase tracking-wider font-bold min-w-[52px]"
                    style={{ color: FLAG_COLOR[s.flag] }}
                  >
                    {s.flag}
                  </span>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-[var(--foreground)]">
                      <strong>{SIGNAL_LABEL[s.name]}</strong>
                      {!s.counted && (
                        <span className="ml-2 text-[9px] uppercase text-[var(--muted)]">
                          informational
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--muted)] leading-relaxed">
                      {signalFlagExplanation(s)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Step 4: sustained-red gate */}
          {counted.some(s => s.name === 'hrv' && s.flag !== 'unknown') && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                Step 4 · Sustained-red gate (HRV only)
              </h4>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                HRV single-day red can be noise, so a raw red is <em>confirmed</em> only if yesterday&apos;s HRV
                was also ≤ −20% (Kiviniemi 2-of-3 rule). Yesterday&apos;s HRV delta was{' '}
                <strong className="text-[var(--foreground)]">
                  {derivation.yesterdayHrvDelta == null ? 'unknown' : fmtPct(derivation.yesterdayHrvDelta)}
                </strong>
                . The final HRV flag shown above reflects this gate.
              </p>
            </div>
          )}

          {/* Step 5: score & band */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Step 5 · Score & band
            </h4>
            <div className="text-sm text-[var(--muted)] leading-relaxed">
              <p className="font-mono text-xs mb-2 bg-[var(--background)] rounded px-2 py-1.5 inline-block">
                score = clamp(0, 10, 2 × reds + yellows) = 2 × {countedReds} + {countedYellows} ={' '}
                <strong className="text-[var(--foreground)]">{score}</strong>
              </p>
              <p>
                Band intervals{' '}
                <span className="text-[var(--teal)]">[0,3) teal</span> ·{' '}
                <span className="text-[var(--amber)]">[3,6) amber</span> ·{' '}
                <span className="text-[var(--red)]">[6,10] red</span>. Score {score} lands in the{' '}
                <strong style={{ color: band === 'teal' ? 'var(--teal)' : band === 'amber' ? 'var(--amber)' : 'var(--red)' }}>
                  {band}
                </strong>{' '}
                band.
              </p>
            </div>
          </div>

          {/* Step 6: verdict rule */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Step 6 · Verdict tier
            </h4>
            <div className="text-sm text-[var(--muted)] leading-relaxed">
              <ul className="flex flex-col gap-1 mb-2">
                <li>
                  <span className="text-[var(--teal)]">stay</span> — 0 counted reds
                </li>
                <li>
                  <span className="text-[var(--amber)]">notice</span> — exactly 1 counted red
                </li>
                <li>
                  <span className="text-[var(--red)]">adjust</span> — ≥ 2 counted reds (stacked)
                </li>
              </ul>
              <p>
                Today: <strong className="text-[var(--foreground)]">{stackedReds} counted red{stackedReds === 1 ? '' : 's'}</strong>
                {' → '}
                <strong style={{ color: FLAG_COLOR[verdict === 'stay' ? 'ok' : verdict === 'notice' ? 'yellow' : 'red'] }}>
                  {verdict}
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Input({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">{value}</span>
    </div>
  );
}
