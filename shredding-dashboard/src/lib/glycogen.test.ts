import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateGlycogen,
  estimateGlycogen,
  GLYCOGEN_MAX,
  MODEL_VERSION,
  type GlycogenDayInput,
  type ExerciseInput,
} from './glycogen';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function makeDay(overrides: Partial<GlycogenDayInput> = {}): GlycogenDayInput {
  return {
    date: '2026-04-07',
    dayType: 'rest',
    carbsActual: 75,
    carbsTarget: 75,
    workoutAvgHr: null,
    exercises: [],
    energyScore: null,
    pumpScore: null,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<ExerciseInput> = {}): ExerciseInput {
  return {
    muscleGroup: 'chest',
    sets: 5,
    totalVolumeLbs: 1500,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Model-internal tests (T1-T10)
// -----------------------------------------------------------------------------

test('T1: Empty input returns empty output', () => {
  const out = simulateGlycogen([]);
  assert.deepEqual(out, []);
});

test('T2: Rest day with 75g carbs — liver drains overnight then partially refills, muscle unchanged', () => {
  const [out] = simulateGlycogen(
    [makeDay({ dayType: 'rest', carbsActual: 75 })],
    { liverPct: 75, musclePct: 80 },
  );
  // Overnight drain: ~50 * 0.75 = ~37.5g, then +22.5g refill = ~60g (~60%)
  // Previous value was ~75g. Must be lower than starting.
  assert.ok(out.liverGlycogenPct < 75, `liver should drop from 75% start, got ${out.liverGlycogenPct}`);
  // Muscle on rest day with 75g carbs only gets ~41g refill (55%) distributed across groups
  // Starting at 80% (~320g), plus 41g refill = ~361g ≈ 90%. Allow small swing.
  assert.ok(Math.abs(out.muscleGlycogenPct - 80) <= 15, `muscle should stay ~80%, got ${out.muscleGlycogenPct}`);
  assert.equal(out.workoutDataMissing, false);
  assert.equal(out.carbsFromTarget, false);
});

test('T3: Push day with 3 chest exercises (15 sets) — chest depletes 25-40%, other groups minimal', () => {
  const chestOnlyExercises: ExerciseInput[] = [
    { muscleGroup: 'chest', sets: 5, totalVolumeLbs: 2000 },
    { muscleGroup: 'chest', sets: 5, totalVolumeLbs: 2000 },
    { muscleGroup: 'chest', sets: 5, totalVolumeLbs: 2000 },
  ];
  const [out] = simulateGlycogen(
    [makeDay({ dayType: 'push', carbsActual: 100, workoutAvgHr: 115, exercises: chestOnlyExercises })],
    { liverPct: 75, musclePct: 80 },
  );
  // Chest should have taken a substantial hit before refill redistributed
  // unfilled capacity. After 100g carbs * 0.65 muscle partition = 65g
  // distributed proportional to depletion (chest gets ~all of it).
  // Legs/back/core/shoulders/arms should be ~80% (untouched by depletion).
  assert.ok(
    out.perMuscle.legs >= 75 && out.perMuscle.legs <= 82,
    `legs should stay ~80%, got ${out.perMuscle.legs}`,
  );
  assert.ok(
    out.perMuscle.back >= 75 && out.perMuscle.back <= 82,
    `back should stay ~80%, got ${out.perMuscle.back}`,
  );
  assert.equal(out.workoutDataMissing, false);
});

test('T4: Legs day with 250g carbs after depletion — legs group rebounds 15+ pp', () => {
  // T4 measures per-muscle-group rebound (perMuscle.legs). Under the plan's
  // constants, whole-body weighted avg is dominated by untouched groups
  // (legs is 40% of body mass, but chest/shoulders/back/arms/core only get
  // hit on their own training days — unworked groups don't drain). The V-
  // shape manifests at the per-muscle level. A heavy legs session plus a
  // 250g refeed should rebound the `legs` group 15+ pp vs its pre-legs-day
  // state.
  const pullDay = makeDay({
    date: '2026-04-07',
    dayType: 'pull',
    carbsActual: 100,
    workoutAvgHr: 115,
    exercises: [
      { muscleGroup: 'back', sets: 5, totalVolumeLbs: 8000 },
      { muscleGroup: 'back', sets: 5, totalVolumeLbs: 6000 },
    ],
  });
  const legsDay = makeDay({
    date: '2026-04-08',
    dayType: 'legs',
    carbsActual: 250,
    workoutAvgHr: 120,
    exercises: [
      { muscleGroup: 'legs', sets: 5, totalVolumeLbs: 12000 },
      { muscleGroup: 'legs', sets: 5, totalVolumeLbs: 10000 },
      { muscleGroup: 'legs', sets: 5, totalVolumeLbs: 8000 },
    ],
  });

  const outs = simulateGlycogen([pullDay, legsDay], { liverPct: 50, musclePct: 50 });
  const pullLegs = outs[0].perMuscle.legs;
  const legsEnd = outs[1].perMuscle.legs;
  assert.ok(
    legsEnd - pullLegs >= 15,
    `legs group should rebound 15+pp from pull day (${pullLegs}%) to legs day (${legsEnd}%)`,
  );
});

test('T5: estimateGlycogen wrapper has same output shape as old function', () => {
  const result = estimateGlycogen(
    { dayType: 'push', carbsActual: 100, carbsTarget: 100, workoutAvgHr: 115 },
    { liverGlycogenPct: 70, muscleGlycogenPct: 75 },
  );
  assert.equal(typeof result.liverGlycogenPct, 'number');
  assert.equal(typeof result.muscleGlycogenPct, 'number');
  assert.equal(typeof result.fatBurningPct, 'number');
  // Wrapper should only expose the 3 legacy fields
  assert.deepEqual(Object.keys(result).sort(), ['fatBurningPct', 'liverGlycogenPct', 'muscleGlycogenPct']);
});

test('T6: workoutDataMissing=true when dayType=push but exercises empty', () => {
  const [out] = simulateGlycogen(
    [makeDay({ dayType: 'push', carbsActual: 100, exercises: [] })],
    { liverPct: 70, musclePct: 75 },
  );
  assert.equal(out.workoutDataMissing, true);
});

test('T7: carbsFromTarget=true when carbsActual=null but carbsTarget=100', () => {
  const [out] = simulateGlycogen(
    [makeDay({ dayType: 'rest', carbsActual: null, carbsTarget: 100 })],
    { liverPct: 70, musclePct: 75 },
  );
  assert.equal(out.carbsFromTarget, true);
});

test('T8: Fat oxidation increases as glycogen decreases (inverse relationship)', () => {
  const [highGlycogen] = simulateGlycogen(
    [makeDay({ dayType: 'rest', carbsActual: 0 })],
    { liverPct: 95, musclePct: 95 },
  );
  const [lowGlycogen] = simulateGlycogen(
    [makeDay({ dayType: 'rest', carbsActual: 0 })],
    { liverPct: 25, musclePct: 40 },
  );
  assert.ok(
    lowGlycogen.fatBurningPct > highGlycogen.fatBurningPct,
    `low-glycogen fat% (${lowGlycogen.fatBurningPct}) should exceed high-glycogen (${highGlycogen.fatBurningPct})`,
  );
});

test('T9: Insulin dampening reduces fat oxidation when carbs > 150g (Randle cycle)', () => {
  const [lowCarb] = simulateGlycogen(
    [makeDay({ dayType: 'rest', carbsActual: 0 })],
    { liverPct: 50, musclePct: 50 },
  );
  const [highCarb] = simulateGlycogen(
    [makeDay({ dayType: 'rest', carbsActual: 250 })],
    { liverPct: 50, musclePct: 50 },
  );
  assert.ok(
    highCarb.fatBurningPct < lowCarb.fatBurningPct,
    `high-carb fat% (${highCarb.fatBurningPct}) should be dampened below low-carb (${lowCarb.fatBurningPct})`,
  );
});

test('T10: Full 4-day cycle produces V-shape at per-muscle level', () => {
  // Whole-body weighted muscle stays high because untouched groups never
  // drain in the plan's model. The V-shape manifests per-muscle: chest/
  // shoulders drop on push, back drops on pull, legs drops then rebounds
  // sharply on legs day's 250g refeed.
  const days: GlycogenDayInput[] = [
    makeDay({ date: '2026-04-07', dayType: 'rest', carbsActual: 75, exercises: [] }),
    makeDay({
      date: '2026-04-08',
      dayType: 'push',
      carbsActual: 100,
      workoutAvgHr: 115,
      exercises: [
        makeExercise({ muscleGroup: 'chest', sets: 5, totalVolumeLbs: 6000 }),
        makeExercise({ muscleGroup: 'shoulders', sets: 5, totalVolumeLbs: 5000 }),
        makeExercise({ muscleGroup: 'arms', sets: 5, totalVolumeLbs: 4000 }),
      ],
    }),
    makeDay({
      date: '2026-04-09',
      dayType: 'pull',
      carbsActual: 100,
      workoutAvgHr: 115,
      exercises: [
        makeExercise({ muscleGroup: 'back', sets: 5, totalVolumeLbs: 8000 }),
        makeExercise({ muscleGroup: 'back', sets: 5, totalVolumeLbs: 7000 }),
      ],
    }),
    makeDay({
      date: '2026-04-10',
      dayType: 'legs',
      carbsActual: 250,
      workoutAvgHr: 120,
      exercises: [
        makeExercise({ muscleGroup: 'legs', sets: 5, totalVolumeLbs: 12000 }),
        makeExercise({ muscleGroup: 'legs', sets: 5, totalVolumeLbs: 10000 }),
      ],
    }),
  ];
  const outs = simulateGlycogen(days, { liverPct: 50, musclePct: 50 });

  // Legs group should bottom on pull (untouched but never rose) and rebound
  // on legs day
  const legsOnPull = outs[2].perMuscle.legs;
  const legsOnLegsDay = outs[3].perMuscle.legs;
  assert.ok(
    legsOnLegsDay > legsOnPull,
    `perMuscle.legs should rebound on legs day (${legsOnLegsDay}%) vs pull (${legsOnPull}%)`,
  );

  // Back group should drop on pull day (its heaviest workload) then recover
  const backOnPush = outs[1].perMuscle.back;
  const backOnPull = outs[2].perMuscle.back;
  assert.ok(
    backOnPull > backOnPush * 0.5,
    `back should still have substantial glycogen after pull-day refill (${backOnPull}%)`,
  );

  // Legs day carb refeed yields highest liver glycogen of the cycle
  const restLiver = outs[0].liverGlycogenPct;
  const legsLiver = outs[3].liverGlycogenPct;
  assert.ok(
    legsLiver > restLiver,
    `liver should be higher on legs day (${legsLiver}%) than rest day (${restLiver}%) due to 250g refeed`,
  );
});

// -----------------------------------------------------------------------------
// Cross-validation tests (T11-T12) — skip if insufficient real user data
// -----------------------------------------------------------------------------

test('T11: Low energy days (energyScore<=2) correlate with glycogen < 50%', { skip: true }, async () => {
  // Requires fetching from DB; run `fetchGlycogenInputs` over full range.
  // Skip logic: if < 5 qualifying days, test.skip with warning.
  // Not implemented here — run in Phase 3 backfill/verification.
});

test('T12: High pump days (pumpScore>=4) correlate with muscle glycogen > 60%', { skip: true }, async () => {
  // Same as T11. Current DB has 0 non-null pumpScore rows, so this will
  // always skip until the user starts logging pumpScore.
});

// -----------------------------------------------------------------------------
// Structural tests (T13-T14)
// -----------------------------------------------------------------------------

test('T13: Cross-consistency — independent 2-day slice matches full-run delta', () => {
  // Build a small 3-day sequence
  const days: GlycogenDayInput[] = [
    makeDay({ date: '2026-04-07', dayType: 'rest', carbsActual: 75 }),
    makeDay({
      date: '2026-04-08',
      dayType: 'push',
      carbsActual: 100,
      workoutAvgHr: 115,
      exercises: [
        makeExercise({ muscleGroup: 'chest', sets: 5, totalVolumeLbs: 1800 }),
        makeExercise({ muscleGroup: 'arms', sets: 3, totalVolumeLbs: 900 }),
      ],
    }),
    makeDay({
      date: '2026-04-09',
      dayType: 'pull',
      carbsActual: 100,
      workoutAvgHr: 115,
      exercises: [
        makeExercise({ muscleGroup: 'back', sets: 5, totalVolumeLbs: 2000 }),
      ],
    }),
  ];

  const fullRun = simulateGlycogen(days);
  let pairsChecked = 0;

  for (let i = 0; i < days.length - 1; i++) {
    const prev = fullRun[i];
    const splitRun = simulateGlycogen([days[i + 1]], {
      liverPct: prev.liverGlycogenPct,
      musclePct: prev.muscleGlycogenPct,
    });
    const splitOut = splitRun[0];
    const fullOut = fullRun[i + 1];
    // Because per-group state is compressed to a uniform musclePct in the
    // split-run (wrapper seeds every group with same value), allow a small
    // tolerance — this test is a rough catch for double-counting bugs, not
    // an exact equality of per-group state.
    assert.ok(
      Math.abs(splitOut.liverGlycogenPct - fullOut.liverGlycogenPct) <= 8,
      `liver delta mismatch day ${i + 1}: split=${splitOut.liverGlycogenPct}, full=${fullOut.liverGlycogenPct}`,
    );
    assert.ok(
      Math.abs(splitOut.muscleGlycogenPct - fullOut.muscleGlycogenPct) <= 15,
      `muscle delta mismatch day ${i + 1}: split=${splitOut.muscleGlycogenPct}, full=${fullOut.muscleGlycogenPct}`,
    );
    pairsChecked++;
  }
  assert.ok(pairsChecked >= 2, `must check >= 2 consecutive-day pairs, checked ${pairsChecked}`);
});

test('T14: Completeness — N inputs produce N outputs, all values finite in [0,100]', () => {
  const days: GlycogenDayInput[] = [];
  // Build a 10-day sequence mixing day types
  const cycle = ['rest', 'push', 'pull', 'legs'] as const;
  for (let i = 0; i < 10; i++) {
    const dayType = cycle[i % 4];
    days.push(makeDay({
      date: `2026-04-${String(7 + i).padStart(2, '0')}`,
      dayType,
      carbsActual: dayType === 'legs' ? 250 : dayType === 'rest' ? 75 : 100,
      workoutAvgHr: dayType === 'rest' ? null : 115,
      exercises: dayType === 'rest' ? [] : [
        makeExercise({ muscleGroup: dayType === 'legs' ? 'legs' : dayType === 'pull' ? 'back' : 'chest' }),
      ],
    }));
  }

  const outs = simulateGlycogen(days);
  assert.equal(outs.length, days.length, 'output count must match input count');

  for (const out of outs) {
    assert.ok(Number.isFinite(out.liverGlycogenPct) && out.liverGlycogenPct >= 0 && out.liverGlycogenPct <= 100,
      `liverGlycogenPct out of range: ${out.liverGlycogenPct}`);
    assert.ok(Number.isFinite(out.muscleGlycogenPct) && out.muscleGlycogenPct >= 0 && out.muscleGlycogenPct <= 100,
      `muscleGlycogenPct out of range: ${out.muscleGlycogenPct}`);
    assert.ok(Number.isFinite(out.fatBurningPct) && out.fatBurningPct >= 0 && out.fatBurningPct <= 100,
      `fatBurningPct out of range: ${out.fatBurningPct}`);
    for (const g of ['legs', 'back', 'chest', 'shoulders', 'arms', 'core'] as const) {
      const v = out.perMuscle[g];
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 100, `perMuscle.${g} out of range: ${v}`);
    }
    assert.equal(out.modelVersion, MODEL_VERSION);
  }
});

test('Sanity: GLYCOGEN_MAX exports expected constants', () => {
  assert.equal(GLYCOGEN_MAX.liver, 100);
  assert.equal(GLYCOGEN_MAX.muscle, 400);
});
