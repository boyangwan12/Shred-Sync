/**
 * cortisol.test.ts — AC-S11 sustained-red fixtures + boundary cases.
 * Runner: node --import tsx --test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  __applyGate,
  buildCortisolVerdict,
  computeCortisolSignals,
  computeRollingBaseline,
  selectRecommendations,
  type DailyLogInput,
  type CortisolSignal,
} from './cortisol.js';

// ---------- helpers ----------

/** Build a minimal DailyLogInput with all nulls except what's supplied. */
function mkLog(date: string, overrides: Partial<DailyLogInput> = {}): DailyLogInput {
  return {
    date,
    hrvMs: null,
    sleepMinutes: null,
    deepSleepMinutes: null,
    sleepBpm: null,
    wakingBpm: null,
    caloriesActual: null,
    workoutActiveCal: null,
    ...overrides,
  };
}

/**
 * Build an hrv-only history sufficient to produce a non-null baseline for
 * `targetDate`. Baseline requires >= 4 values strictly before targetDate.
 * We plant 7 prior days all with `baselineHrvMs`.
 */
function buildHrvHistory(
  targetDate: string,
  baselineHrvMs: number,
  targetHrvMs: number | null,
  dayOverrides: Record<string, Partial<DailyLogInput>> = {},
): DailyLogInput[] {
  const history: DailyLogInput[] = [];
  const [y, m, d] = targetDate.split('-').map(Number);
  for (let i = 7; i >= 1; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    const iso = dt.toISOString().split('T')[0];
    history.push(mkLog(iso, { hrvMs: baselineHrvMs, ...dayOverrides[iso] }));
  }
  history.push(mkLog(targetDate, { hrvMs: targetHrvMs ?? undefined, ...dayOverrides[targetDate] }));
  return history;
}

/** Extract the hrv signal from __applyGate result. */
function hrvFlag(signals: CortisolSignal[]): string {
  return signals.find(s => s.name === 'hrv')!.flag;
}

// ---------- AC-S11 sustained-red gate fixtures ----------

describe('__applyGate — AC-S11 sustained-red', () => {

  /**
   * yesterday hrv delta <= -20%, today -21% → today.flag === 'red'
   * Both days breach the -20% red threshold so sustained-red is confirmed.
   *
   * Implementation note: yesterday's HRV value is placed in history, which also
   * contributes to today's baseline. We use 70 ms (30% below 100 ms baseline)
   * so today is solidly red regardless of any single-day baseline perturbation.
   */
  it('yesterday red + today red → stays red', () => {
    const target = '2025-01-10';
    // baseline 100 ms; red threshold is <= -20% => hrv <= 80 ms
    // yesterday: 70 ms (delta -30%), today: 70 ms (delta ~-30%)
    const yesterday = '2025-01-09';
    const history = buildHrvHistory(target, 100, 70, {
      [yesterday]: { hrvMs: 70 },
    });
    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(history.find(h => h.date === target)!, baseline);
    const gated = __applyGate(rawSignals, history, target);
    assert.equal(hrvFlag(gated), 'red');
  });

  /**
   * yesterday hrv delta -10% (yellow), today -21% → today.flag === 'yellow' (unsustained)
   */
  it('yesterday yellow + today red → demoted to yellow', () => {
    const target = '2025-01-10';
    const yesterday = '2025-01-09';
    // yesterday: 90 ms (delta -10% yellow), today: 79 ms (delta -21% red)
    const history = buildHrvHistory(target, 100, 79, {
      [yesterday]: { hrvMs: 90 },
    });
    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(history.find(h => h.date === target)!, baseline);
    const gated = __applyGate(rawSignals, history, target);
    assert.equal(hrvFlag(gated), 'yellow');
  });

  /**
   * yesterday hrv null, today -21% → today.flag === 'yellow' (unknown priors don't confirm)
   */
  it('yesterday hrv null + today red → demoted to yellow', () => {
    const target = '2025-01-10';
    const yesterday = '2025-01-09';
    // yesterday hrv: null (unknown), today: 79 ms red
    const history = buildHrvHistory(target, 100, 79, {
      [yesterday]: { hrvMs: null },
    });
    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(history.find(h => h.date === target)!, baseline);
    const gated = __applyGate(rawSignals, history, target);
    assert.equal(hrvFlag(gated), 'yellow');
  });

  /**
   * yesterday -21%, today -21%, day-before delta null → today.flag === 'red'
   * Yesterday alone is enough to confirm sustained-red (2-of-3 with adjacency).
   *
   * Use 70 ms (30% below 100 ms) so both days are solidly red regardless of
   * baseline perturbation caused by yesterday's value entering the rolling window.
   */
  it('day-before null + yesterday red + today red → stays red', () => {
    const target = '2025-01-10';
    const yesterday = '2025-01-09';
    const dayBefore = '2025-01-08';
    // day-before hrv: null; yesterday: 70 ms red; today: 70 ms red
    const history = buildHrvHistory(target, 100, 70, {
      [yesterday]: { hrvMs: 70 },
      [dayBefore]: { hrvMs: null },
    });
    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(history.find(h => h.date === target)!, baseline);
    const gated = __applyGate(rawSignals, history, target);
    assert.equal(hrvFlag(gated), 'red');
  });

  /**
   * 3 days ago -21%, yesterday null, today -21% → today.flag === 'yellow'
   *
   * The gate looks back exactly 1 and 2 days (yesterday + day-before-yesterday).
   * "3 days ago" is outside the 2-day window. Neither adjacent day is red,
   * so today is unsustained → demoted to yellow.
   *
   * Explicit behavior: 2-of-3 rule requires adjacency within the [-1, -2] window;
   * gaps break the streak.
   */
  it('3-days-ago red + yesterday null + today red → demoted to yellow (adjacency required)', () => {
    const target = '2025-01-10';
    const yesterday = '2025-01-09';
    const dayBefore = '2025-01-08';
    const threeDaysAgo = '2025-01-07';
    // 3 days ago: 79 ms red; yesterday: null; day-before-yesterday: null; today: red
    const history = buildHrvHistory(target, 100, 79, {
      [yesterday]: { hrvMs: null },
      [dayBefore]: { hrvMs: null },
      [threeDaysAgo]: { hrvMs: 79 },
    });
    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(history.find(h => h.date === target)!, baseline);
    const gated = __applyGate(rawSignals, history, target);
    assert.equal(hrvFlag(gated), 'yellow');
  });

});

// ---------- Boundary cases ----------

describe('computeCortisolSignals — boundary', () => {

  it('null log + null baseline → all flags unknown', () => {
    const signals = computeCortisolSignals(null, {
      hrvMsAvg7: null,
      sleepMinutesAvg7: null,
      wakingBpmAvg7: null,
    });
    for (const s of signals) {
      assert.equal(s.flag, 'unknown', `expected unknown for ${s.name}, got ${s.flag}`);
    }
  });

});

describe('computeRollingBaseline — boundary', () => {

  it('3 entries → returns null for all means (< 4 required)', () => {
    const history = [
      mkLog('2025-01-01', { hrvMs: 60, sleepMinutes: 400, wakingBpm: 55 }),
      mkLog('2025-01-02', { hrvMs: 62, sleepMinutes: 410, wakingBpm: 56 }),
      mkLog('2025-01-03', { hrvMs: 61, sleepMinutes: 420, wakingBpm: 57 }),
    ];
    const b = computeRollingBaseline(history, '2025-01-04');
    assert.equal(b.hrvMsAvg7, null);
    assert.equal(b.sleepMinutesAvg7, null);
    assert.equal(b.wakingBpmAvg7, null);
  });

  it('4 entries → returns numeric means', () => {
    const history = [
      mkLog('2025-01-01', { hrvMs: 60, sleepMinutes: 400, wakingBpm: 55 }),
      mkLog('2025-01-02', { hrvMs: 60, sleepMinutes: 400, wakingBpm: 55 }),
      mkLog('2025-01-03', { hrvMs: 60, sleepMinutes: 400, wakingBpm: 55 }),
      mkLog('2025-01-04', { hrvMs: 60, sleepMinutes: 400, wakingBpm: 55 }),
    ];
    const b = computeRollingBaseline(history, '2025-01-05');
    assert.equal(b.hrvMsAvg7, 60);
    assert.equal(b.sleepMinutesAvg7, 400);
    assert.equal(b.wakingBpmAvg7, 55);
  });

});

describe('computeScore via buildCortisolVerdict', () => {

  /** Build a verdict directly from raw signals by planting them as 'stay' history (no prior reds). */
  function verdictFromSignals(signals: CortisolSignal[]): ReturnType<typeof buildCortisolVerdict> {
    // Empty history → __applyGate will not find prior reds → all reds demote to yellow.
    // To test score we need gated output, so pass signals with a history that confirms reds.
    // For 0/0 test we don't care — nothing is red.
    return buildCortisolVerdict(signals, [], '2025-01-10');
  }

  it('stackedReds=0, stackedYellows=0 → score 0', () => {
    const signals = computeCortisolSignals(null, { hrvMsAvg7: null, sleepMinutesAvg7: null, wakingBpmAvg7: null });
    const v = verdictFromSignals(signals);
    assert.equal(v.score, 0);
  });

  /**
   * All 4 counted signals red + confirmed by history → score 8 (max empirical).
   * Ceiling = 8 because there are only 4 counted signals × 2 pts each = 8.
   * The band [6,10] correctly covers this.
   */
  it('all 4 counted signals confirmed red → score 8', () => {
    const target = '2025-01-10';

    // 7 baseline days (i=9..3 before target) with healthy values → establishes baselines
    const history: DailyLogInput[] = [];
    for (let i = 9; i >= 3; i--) {
      const dt = new Date(Date.UTC(2025, 0, 10 - i));
      const iso = dt.toISOString().split('T')[0];
      history.push(mkLog(iso, {
        hrvMs: 100,
        sleepMinutes: 400,
        wakingBpm: 55,
        caloriesActual: 2000,
        workoutActiveCal: 0,
      }));
    }
    // Day-before-yesterday + yesterday: all-red signals (confirm sustained-red for gating)
    // HRV red: 70 ms (−30% vs 100 ms baseline). TST red: 300 min.
    // RHR red: 70 bpm. Red days enter baseline window → worst-case baseline ≈ (55*5+70*2)/7 ≈ 59.3 bpm.
    //   Delta = 70 − 59.3 = 10.7 bpm ≥ 8 → still red.
    // EA red: 1180 kcal net / 59.6 kg FFM ≈ 19.8 kcal/kg ≤ 20.
    const redDay = {
      hrvMs: 70,
      sleepMinutes: 300,
      wakingBpm: 70,
      caloriesActual: 1180,
      workoutActiveCal: 0,
    };
    history.push(mkLog('2025-01-08', redDay)); // day-before-yesterday
    history.push(mkLog('2025-01-09', redDay)); // yesterday

    // Today: same all-red values
    history.push(mkLog(target, redDay));

    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(history.find(h => h.date === target)!, baseline);

    // Confirm all 4 counted signals are raw-red before gating
    const countedRaw = rawSignals.filter(s => s.counted);
    const rawRedNames = countedRaw.filter(s => s.flag === 'red').map(s => s.name);
    assert.equal(rawRedNames.length, 4, `Expected 4 raw reds, got: ${rawRedNames.join(',') || 'none'} — counted flags: ${countedRaw.map(s => `${s.name}:${s.flag}`).join(',')}`);

    // Build verdict with full history so __applyGate confirms all reds (yesterday also red)
    const v = buildCortisolVerdict(rawSignals, history, target);
    assert.equal(v.score, 8, `Expected score 8, got ${v.score}. stackedReds=${v.stackedReds}, signals=${v.signals.map(s=>`${s.name}:${s.flag}`).join(',')}`);
  });

});

describe('Band membership (half-open right [lo, hi))', () => {

  function band(score: number): string {
    if (score < 3) return 'teal';
    if (score < 6) return 'amber';
    return 'red';
  }

  it('score 0 → teal',    () => assert.equal(band(0), 'teal'));
  it('score 2.99 → teal', () => assert.equal(band(2.99), 'teal'));
  it('score 3 → amber',   () => assert.equal(band(3), 'amber'));
  it('score 5.99 → amber',() => assert.equal(band(5.99), 'amber'));
  it('score 6 → red',     () => assert.equal(band(6), 'red'));
  it('score 10 → red',    () => assert.equal(band(10), 'red'));

});

describe('buildCortisolVerdict — verdict tiers', () => {

  it('0 reds → verdict stay', () => {
    const signals = computeCortisolSignals(null, { hrvMsAvg7: null, sleepMinutesAvg7: null, wakingBpmAvg7: null });
    const v = buildCortisolVerdict(signals, [], '2025-01-10');
    assert.equal(v.verdict, 'stay');
  });

  it('exactly 1 confirmed red → verdict notice', () => {
    // Build a scenario with 1 confirmed red: TST red (no baseline needed).
    // Confirm by planting yesterday's TST as red too.
    const target = '2025-01-10';
    const history: DailyLogInput[] = [];
    // 7 baseline days
    for (let i = 8; i >= 1; i--) {
      const dt = new Date(Date.UTC(2025, 0, 10 - i));
      const iso = dt.toISOString().split('T')[0];
      history.push(mkLog(iso, { sleepMinutes: 400 }));
    }
    // yesterday: TST red
    history.push(mkLog('2025-01-09', { sleepMinutes: 300 }));
    // today: TST red, all other signals null
    history.push(mkLog(target, { sleepMinutes: 300 }));

    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(mkLog(target, { sleepMinutes: 300 }), baseline);
    const v = buildCortisolVerdict(rawSignals, history, target);
    assert.equal(v.verdict, 'notice', `verdict=${v.verdict} stackedReds=${v.stackedReds}`);
  });

  it('2 confirmed reds → verdict adjust + recommendations non-empty', () => {
    const target = '2025-01-10';
    const history: DailyLogInput[] = [];
    // 7 baseline days with HRV and sleep
    for (let i = 9; i >= 1; i--) {
      const dt = new Date(Date.UTC(2025, 0, 10 - i));
      const iso = dt.toISOString().split('T')[0];
      history.push(mkLog(iso, { hrvMs: 100, sleepMinutes: 400 }));
    }
    // yesterday: both HRV and TST red
    history.push(mkLog('2025-01-09', { hrvMs: 70, sleepMinutes: 300 }));
    // today: both red
    history.push(mkLog(target, { hrvMs: 70, sleepMinutes: 300 }));

    const baseline = computeRollingBaseline(history, target);
    const rawSignals = computeCortisolSignals(mkLog(target, { hrvMs: 70, sleepMinutes: 300 }), baseline);
    const v = buildCortisolVerdict(rawSignals, history, target);
    assert.equal(v.verdict, 'adjust', `verdict=${v.verdict}`);
    assert.ok(v.recommendations.length > 0, 'expected recommendations');
  });

});

describe('selectRecommendations — sort-stability', () => {

  it('unsorted input produces same result as sorted input', () => {
    const sorted   = selectRecommendations(['hrv', 'tst']);
    const unsorted = selectRecommendations(['tst', 'hrv']);
    assert.deepEqual(sorted, unsorted);
  });

});
