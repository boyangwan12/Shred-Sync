/**
 * Cortisol signal + verdict engine.
 *
 * Pure functions. The entire sustained-red gate + band-boundary rule + verdict tier
 * lives in `buildCortisolVerdict` — single auditable surface.
 *
 * Research sources for thresholds:
 * - HRV delta: Kiviniemi / PMC11204851
 * - TST: Spiegel 1997 / PMC8813037
 * - RHR delta: Meeusen 2013 / PMID 23247672
 * - Energy availability: PMC10388605
 * - Deep-sleep fraction: informational heuristic (not peer-reviewed) — counted: false
 */

import { USER_PROFILE } from '@/constants/targets';

// ---------- Types ----------

export type SignalName = 'hrv' | 'tst' | 'rhr' | 'ea' | 'deepFraction';
export type Flag = 'ok' | 'yellow' | 'red' | 'unknown';
export type Verdict = 'stay' | 'notice' | 'adjust';
export type RecommendationCategory = 'diet' | 'workout' | 'cycle' | 'recovery';

export interface CortisolSignal {
  name: SignalName;
  value: number | null;
  baseline: number | null;
  delta: number | null;    // relative (hrv) or absolute (rhr) delta, or null
  threshold: { yellow: number | null; red: number | null };
  flag: Flag;
  counted: boolean;
}

export interface Recommendation {
  category: RecommendationCategory;
  text: string;
  triggerSignals: SignalName[];
}

export interface BandBoundaries {
  teal: [number, number];
  amber: [number, number];
  red: [number, number];
  inclusivity: 'half-open-right';
}

export interface CortisolVerdict {
  score: number;
  verdict: Verdict;
  stackedReds: number;
  signals: CortisolSignal[];
  recommendations: Recommendation[];
  bandBoundaries: BandBoundaries;
}

export interface DailyLogInput {
  date: string;
  hrvMs: number | null;
  sleepMinutes: number | null;
  deepSleepMinutes: number | null;
  sleepBpm: number | null;
  wakingBpm: number | null;
  caloriesActual: number | null;
  workoutActiveCal: number | null;
}

export interface BaselineInput {
  hrvMsAvg7: number | null;
  sleepMinutesAvg7: number | null;
  wakingBpmAvg7: number | null;
}

// ---------- Constants ----------

export const THRESHOLDS = {
  // HRV relative delta (negative = worse than baseline)
  hrv: { yellow: -0.075, red: -0.20 }, // source: Kiviniemi / PMC11204851
  // Total sleep time (minutes)
  tst: { yellow: 360, red: 330 },      // source: Spiegel 1997 / PMC8813037
  // Waking HR delta (absolute bpm, positive = elevated)
  rhr: { yellow: 5, red: 8 },          // source: Meeusen 2013 / PMID 23247672
  // Energy availability kcal/kg FFM
  ea:  { yellow: 30, red: 20 },        // source: PMC10388605
  // Deep-sleep fraction (informational only)
  deepFraction: { yellow: 0.13, red: 0.10 },
} as const;

// FFM (kg) for EA calculation — derived from USER_PROFILE
const FFM_KG = USER_PROFILE.lbm / 2.2046;

const BAND_BOUNDARIES: BandBoundaries = {
  teal: [0, 3],
  amber: [3, 6],
  red: [6, 10],
  inclusivity: 'half-open-right',
};

// ---------- Rolling baseline ----------

export function computeRollingBaseline(
  history: DailyLogInput[],
  targetDate: string,
): BaselineInput {
  // Last 7 DailyLog entries strictly before targetDate (exclusive of today)
  const prior = history
    .filter(h => h.date < targetDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const pickMean = (key: 'hrvMs' | 'sleepMinutes' | 'wakingBpm'): number | null => {
    const vals = prior.map(p => p[key]).filter((v): v is number => v !== null && v !== undefined);
    if (vals.length < 4) return null;
    const sum = vals.reduce((s, v) => s + v, 0);
    return sum / vals.length;
  };

  return {
    hrvMsAvg7: pickMean('hrvMs'),
    sleepMinutesAvg7: pickMean('sleepMinutes'),
    wakingBpmAvg7: pickMean('wakingBpm'),
  };
}

// ---------- Signal computation (raw / pre-gate) ----------

function flagHrv(delta: number): Flag {
  if (delta > THRESHOLDS.hrv.yellow) return 'ok';
  if (delta > THRESHOLDS.hrv.red) return 'yellow'; // (-0.20, -0.075]
  return 'red';                                    // <= -0.20
}
function flagTst(minutes: number): Flag {
  if (minutes >= THRESHOLDS.tst.yellow) return 'ok';
  if (minutes > THRESHOLDS.tst.red) return 'yellow'; // (330, 360)
  return 'red';                                      // <= 330
}
function flagRhr(delta: number): Flag {
  if (delta < THRESHOLDS.rhr.yellow) return 'ok';    // < 5
  if (delta < THRESHOLDS.rhr.red) return 'yellow';   // [5, 8)
  return 'red';                                      // >= 8
}
function flagEa(ea: number): Flag {
  if (ea >= THRESHOLDS.ea.yellow) return 'ok';
  if (ea > THRESHOLDS.ea.red) return 'yellow';       // (20, 30)
  return 'red';                                      // <= 20
}
function flagDeep(frac: number): Flag {
  if (frac >= THRESHOLDS.deepFraction.yellow) return 'ok';    // >= 0.13
  if (frac >= THRESHOLDS.deepFraction.red) return 'yellow';   // [0.10, 0.13)
  return 'red';                                               // < 0.10
}

export function computeCortisolSignals(
  log: DailyLogInput | null | undefined,
  baseline: BaselineInput,
): CortisolSignal[] {
  // HRV
  let hrv: CortisolSignal;
  if (log?.hrvMs != null && baseline.hrvMsAvg7 != null && baseline.hrvMsAvg7 > 0) {
    const delta = (log.hrvMs - baseline.hrvMsAvg7) / baseline.hrvMsAvg7;
    hrv = {
      name: 'hrv',
      value: log.hrvMs,
      baseline: baseline.hrvMsAvg7,
      delta,
      threshold: { yellow: THRESHOLDS.hrv.yellow, red: THRESHOLDS.hrv.red },
      flag: flagHrv(delta),
      counted: true,
    };
  } else {
    hrv = {
      name: 'hrv',
      value: log?.hrvMs ?? null,
      baseline: baseline.hrvMsAvg7,
      delta: null,
      threshold: { yellow: THRESHOLDS.hrv.yellow, red: THRESHOLDS.hrv.red },
      flag: 'unknown',
      counted: true,
    };
  }

  // TST
  let tst: CortisolSignal;
  if (log?.sleepMinutes != null) {
    tst = {
      name: 'tst',
      value: log.sleepMinutes,
      baseline: baseline.sleepMinutesAvg7,
      delta: null,
      threshold: { yellow: THRESHOLDS.tst.yellow, red: THRESHOLDS.tst.red },
      flag: flagTst(log.sleepMinutes),
      counted: true,
    };
  } else {
    tst = {
      name: 'tst',
      value: null,
      baseline: baseline.sleepMinutesAvg7,
      delta: null,
      threshold: { yellow: THRESHOLDS.tst.yellow, red: THRESHOLDS.tst.red },
      flag: 'unknown',
      counted: true,
    };
  }

  // RHR (waking BPM proxy)
  let rhr: CortisolSignal;
  if (log?.wakingBpm != null && baseline.wakingBpmAvg7 != null) {
    const delta = log.wakingBpm - baseline.wakingBpmAvg7;
    rhr = {
      name: 'rhr',
      value: log.wakingBpm,
      baseline: baseline.wakingBpmAvg7,
      delta,
      threshold: { yellow: THRESHOLDS.rhr.yellow, red: THRESHOLDS.rhr.red },
      flag: flagRhr(delta),
      counted: true,
    };
  } else {
    rhr = {
      name: 'rhr',
      value: log?.wakingBpm ?? null,
      baseline: baseline.wakingBpmAvg7,
      delta: null,
      threshold: { yellow: THRESHOLDS.rhr.yellow, red: THRESHOLDS.rhr.red },
      flag: 'unknown',
      counted: true,
    };
  }

  // Energy availability
  let ea: CortisolSignal;
  if (log?.caloriesActual != null) {
    const active = log.workoutActiveCal ?? 0;
    const eaVal = (log.caloriesActual - active) / FFM_KG;
    ea = {
      name: 'ea',
      value: eaVal,
      baseline: null,
      delta: null,
      threshold: { yellow: THRESHOLDS.ea.yellow, red: THRESHOLDS.ea.red },
      flag: flagEa(eaVal),
      counted: true,
    };
  } else {
    ea = {
      name: 'ea',
      value: null,
      baseline: null,
      delta: null,
      threshold: { yellow: THRESHOLDS.ea.yellow, red: THRESHOLDS.ea.red },
      flag: 'unknown',
      counted: true,
    };
  }

  // Deep-sleep fraction (informational)
  let deepFraction: CortisolSignal;
  if (log?.deepSleepMinutes != null && log.sleepMinutes != null && log.sleepMinutes > 0) {
    const frac = log.deepSleepMinutes / log.sleepMinutes;
    deepFraction = {
      name: 'deepFraction',
      value: frac,
      baseline: null,
      delta: null,
      threshold: { yellow: THRESHOLDS.deepFraction.yellow, red: THRESHOLDS.deepFraction.red },
      flag: flagDeep(frac),
      counted: false,
    };
  } else {
    deepFraction = {
      name: 'deepFraction',
      value: null,
      baseline: null,
      delta: null,
      threshold: { yellow: THRESHOLDS.deepFraction.yellow, red: THRESHOLDS.deepFraction.red },
      flag: 'unknown',
      counted: false,
    };
  }

  return [hrv, tst, rhr, ea, deepFraction];
}

// ---------- Recommendation catalog ----------

const RECOMMENDATION_CATALOG: Record<string, Recommendation[]> = {
  'hrv,tst': [
    { category: 'recovery', text: 'Sleep earlier tonight: target 7.5h in bed, lights out by 22:30.', triggerSignals: ['hrv','tst'] },
    { category: 'workout',  text: 'Swap today\'s planned session for a deload (50% volume, RPE ≤ 7).', triggerSignals: ['hrv','tst'] },
    { category: 'diet',     text: 'Add +200 kcal from carbs today; reduce deficit until HRV recovers.', triggerSignals: ['hrv','tst'] },
  ],
  'hrv,rhr': [
    { category: 'recovery', text: '10 minutes of slow breathing (4-6 breaths/min) before bed.', triggerSignals: ['hrv','rhr'] },
    { category: 'workout',  text: 'Cut session intensity: stay aerobic, avoid max-effort lifting.', triggerSignals: ['hrv','rhr'] },
    { category: 'cycle',    text: 'Swap today\'s workout day for tomorrow\'s rest day — shift the cycle one forward.', triggerSignals: ['hrv','rhr'] },
  ],
  'rhr,tst': [
    { category: 'recovery', text: 'Prioritize sleep hygiene: dark, cool (18°C), no screens 1h before bed.', triggerSignals: ['rhr','tst'] },
    { category: 'workout',  text: 'Keep it light: walk + mobility, no heavy lifting today.', triggerSignals: ['rhr','tst'] },
  ],
  'ea,hrv': [
    { category: 'diet',     text: 'Immediate +300 kcal refeed — carbs + protein. Do not skip meals today.', triggerSignals: ['ea','hrv'] },
    { category: 'workout',  text: 'Full deload — LEA + low HRV is the classic overtraining precursor.', triggerSignals: ['ea','hrv'] },
    { category: 'recovery', text: 'Low-stress day: no HIIT, no fasting, extra sleep.', triggerSignals: ['ea','hrv'] },
  ],
  'ea,tst': [
    { category: 'diet',     text: 'Raise calories by +250 kcal; your body is running too lean and under-recovered.', triggerSignals: ['ea','tst'] },
    { category: 'recovery', text: 'Add a 20-minute nap and bank an early bedtime tonight.', triggerSignals: ['ea','tst'] },
  ],
  'hrv,rhr,tst': [
    { category: 'recovery', text: 'Full rest day — sleep, walk, breathe. Re-measure tomorrow.', triggerSignals: ['hrv','rhr','tst'] },
    { category: 'workout',  text: 'Cancel training; a triple-red is a clear overreach signal.', triggerSignals: ['hrv','rhr','tst'] },
    { category: 'diet',     text: 'Eat to maintenance today (not deficit): +400 kcal from baseline target.', triggerSignals: ['hrv','rhr','tst'] },
    { category: 'cycle',    text: 'Push the cycle back 24h — today becomes the rest day.', triggerSignals: ['hrv','rhr','tst'] },
  ],
};

export function selectRecommendations(redSignalNames: string[]): Recommendation[] {
  const key = [...redSignalNames].sort().join(',');
  const match = RECOMMENDATION_CATALOG[key];
  if (match) return match;
  return [
    { category: 'recovery', text: 'Take a deload day and re-measure tomorrow.', triggerSignals: redSignalNames as SignalName[] },
  ];
}

// ---------- Sustained-red gate (internal helper) ----------

/**
 * Apply the 2-of-3-day sustained-red rule in isolation. Exported with the
 * namespace-private double-underscore convention so tests can exercise the
 * gate directly while `buildCortisolVerdict` remains the single public verdict surface.
 */
export function __applyGate(
  todaySignals: CortisolSignal[],
  history: DailyLogInput[],
  targetDate: string,
): CortisolSignal[] {
  // Build raw flags for yesterday + day-before-yesterday per counted signal.
  // Derive baselines relative to each prior date, compute raw flags using
  // `computeCortisolSignals` on the prior log with its own prior baseline.
  const priorFlagsByDate: Record<string, Record<SignalName, Flag>> = {};

  const byDate = new Map(history.map(h => [h.date, h]));

  // Helper to compute prior day's raw flag for counted signals
  function flagsForDate(d: string): Record<SignalName, Flag> {
    const cached = priorFlagsByDate[d];
    if (cached) return cached;
    const log = byDate.get(d) ?? null;
    const baseline = computeRollingBaseline(history, d);
    const sigs = computeCortisolSignals(log, baseline);
    const map: Record<SignalName, Flag> = {
      hrv: 'unknown', tst: 'unknown', rhr: 'unknown', ea: 'unknown', deepFraction: 'unknown',
    };
    for (const s of sigs) map[s.name] = s.flag;
    priorFlagsByDate[d] = map;
    return map;
  }

  function addDays(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().split('T')[0];
  }

  const yesterday = addDays(targetDate, -1);
  const dayBefore = addDays(targetDate, -2);
  const yFlags = flagsForDate(yesterday);
  const dFlags = flagsForDate(dayBefore);

  return todaySignals.map(sig => {
    if (!sig.counted) return sig;
    if (sig.flag !== 'red') return sig;
    // Need at least one of yesterday or day-before to ALSO be red for same signal
    const confirmed = yFlags[sig.name] === 'red' || dFlags[sig.name] === 'red';
    if (confirmed) return sig;
    // Demote to yellow (unsustained)
    return { ...sig, flag: 'yellow' as Flag };
  });
}

// ---------- Verdict ----------

function computeScore(signals: CortisolSignal[]): number {
  // score = clamp(0, 10, 2*redCount + yellowCount) over COUNTED signals only.
  // With 4 counted signals, max empirical score is 8 (all red) — [6,10] still correctly bands.
  let score = 0;
  for (const s of signals) {
    if (!s.counted) continue;
    if (s.flag === 'red') score += 2;
    else if (s.flag === 'yellow') score += 1;
  }
  return Math.max(0, Math.min(10, score));
}

export function buildCortisolVerdict(
  rawSignals: CortisolSignal[],
  history: DailyLogInput[],
  targetDate: string,
): CortisolVerdict {
  const gated = __applyGate(rawSignals, history, targetDate);

  const countedReds = gated.filter(s => s.counted && s.flag === 'red');
  const stackedReds = countedReds.length;

  const score = computeScore(gated);

  let verdict: Verdict;
  let recommendations: Recommendation[] = [];
  if (stackedReds >= 2) {
    verdict = 'adjust';
    recommendations = selectRecommendations(countedReds.map(s => s.name));
  } else if (stackedReds === 1) {
    verdict = 'notice';
  } else {
    verdict = 'stay';
  }

  return {
    score,
    verdict,
    stackedReds,
    signals: gated,
    recommendations,
    bandBoundaries: BAND_BOUNDARIES,
  };
}
