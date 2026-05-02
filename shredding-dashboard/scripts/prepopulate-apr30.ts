/**
 * Apr 30 pull day preload + briefing.
 *
 * Recovery context: Apr 28 emotional + work stress, Apr 28 night sleep
 * 5h49m / bedtime 2:45 AM, Apr 29 morning HRV 57 (RED). Apr 29 was push
 * RED-deload. Tonight's sleep determines tomorrow's signal.
 *
 * Exercise rotation: alternated 4 of 6 movements vs Apr 26 to avoid
 * pattern fatigue. Lat Pulldown Narrow → Wide. Seated Row Narrow → MTS Row.
 * Straight-Arm Pulldown → Cable Lat Rotation. Cable Crunch → Hanging Leg Raise.
 * Cable Rear Delt and Barbell Curl kept (settled patterns).
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-30';

type SetSpec = { weight: number | null; reps: number; warmup?: boolean; perSide?: boolean; notes?: string };

const PLAN: Array<{ name: string; category: string; notes: string; sets: SetSpec[] }> = [
  {
    name: 'Lat Pulldown Wide',
    category: 'back',
    notes: 'Rotated from Lat Pulldown Narrow (Apr 26). Apr 14 working: 100 × 8 × 3. Match — wider grip = different lat angle, fresher stimulus.',
    sets: [
      { weight: 60, reps: 10, warmup: true },
      { weight: 100, reps: 8, notes: 'match Apr 14' },
      { weight: 100, reps: 8 },
      { weight: 100, reps: 8 },
    ],
  },
  {
    name: 'MTS Row',
    category: 'back',
    notes: 'Rotated from Seated Row Narrow (Apr 26). Apr 22 working: 70 × 8 × 3 cleanly. Match — different cable path, hits mid-traps differently.',
    sets: [
      { weight: 50, reps: 10, warmup: true },
      { weight: 70, reps: 8, notes: 'match Apr 22' },
      { weight: 70, reps: 8 },
      { weight: 70, reps: 8 },
    ],
  },
  {
    name: 'Cable Lat Rotation',
    category: 'back',
    notes: 'Rotated from Cable Straight-Arm Pulldown (Apr 26). Apr 22: 25 × 8 × 4 cleanly. Match — same lat-isolation function, different cable angle.',
    sets: [
      { weight: 25, reps: 8 },
      { weight: 25, reps: 8 },
      { weight: 25, reps: 8 },
      { weight: 25, reps: 8 },
    ],
  },
  {
    name: 'Cable Rear Delt',
    category: 'shoulders',
    notes: 'Keep — settled pattern. Apr 26 ramp: 25/30/35 × 10. Match.',
    sets: [
      { weight: 10, reps: 8, warmup: true },
      { weight: 25, reps: 10 },
      { weight: 30, reps: 10 },
      { weight: 35, reps: 10, notes: 'match Apr 26 top' },
    ],
  },
  {
    name: 'Barbell Curl',
    category: 'arms',
    notes: 'Keep — match Apr 26: 50 × 8, 9, 40 × 12 back-off. No PR push, recovery state.',
    sets: [
      { weight: 30, reps: 12, warmup: true },
      { weight: 50, reps: 8 },
      { weight: 50, reps: 9 },
      { weight: 40, reps: 12, notes: 'back-off' },
    ],
  },
  {
    name: 'Hanging Leg Raise',
    category: 'core',
    notes: 'Rotated from Cable Crunch (Apr 26). Apr 14: BW × 8 × 3. Match — different core stimulus, hits hip flexors + lower abs vs spine flexion.',
    sets: [
      { weight: null, reps: 10 },
      { weight: null, reps: 10 },
      { weight: null, reps: 10 },
    ],
  },
];

const BRIEFING = `=== Apr 30 pull day — rotated, recovery-state aware ===

Coming off:
- Apr 28 emotional + work stress, late bedtime 2:45 AM
- Apr 29 morning HRV 57 (RED), sleep only 5h 49m
- Apr 29 push RED-deload session (volume cut 38%)
- Tonight's sleep is the swing variable for tomorrow's HRV

Tomorrow's morning data decides the day:
  HRV ≥90 + sleep ≥7h    → recovered, execute as written
  HRV 70-89              → still yellow, match-only (no rep PRs)
  HRV <70                → second consecutive RED → trigger full
                           deload week, reduce all loads 20%

=== Why exercises rotated ===

After 5 pull sessions in 4 weeks, repeating the exact same exercises
creates pattern fatigue + neglects movement variety. Rotated 4 of 6
movements while keeping the two settled patterns (Cable Rear Delt
and Barbell Curl). Each rotation hits the same muscle group via a
slightly different angle:

  Lat Pulldown Narrow → Wide
    Same lats, but wider grip emphasizes outer fibers + teres major

  Seated Row Narrow → MTS Row
    Same mid-back, but machine path constrains rotation,
    different mid-trap activation

  Cable Straight-Arm Pulldown → Cable Lat Rotation
    Same lat-isolation function, different cable angle
    (cross-body vs straight-down)

  Cable Crunch → Hanging Leg Raise
    Cable Crunch = spine flexion under load
    Hanging Leg Raise = hip flexion + lower abs + grip endurance
    Different stimulus, same core development goal

This is mesocycle variation, not chaos. Same patterns, fresh expressions.

=== Loads (all match — no progressions queued) ===

Lat Pulldown Wide          100 × 8 × 3                  (match Apr 14)
MTS Row                    70 × 8 × 3                   (match Apr 22)
Cable Lat Rotation         25 × 8 × 4                   (match Apr 22)
Cable Rear Delt            25/30/35 × 10 ramp           (match Apr 26)
Barbell Curl               50 × 8, 9 + 40 × 12 back-off (match Apr 26)
Hanging Leg Raise          BW × 10 × 3                  (match Apr 14 +2 rep)

Total: 6 exercises, 17 working sets. ~30% lower volume than Apr 26's
8-exercise session — appropriate for recovery-state-uncertain day.

=== Bail criteria ===

Drop or stop if:
- First Lat Pulldown working set bar speed crashes
- Lower back twinge on MTS Row (lower-back fatigue from yesterday's
  shoulder press is possible)
- Energy <2/5 by exercise 4
- Any sharp joint pain — stop immediately

If you bail mid-session: finish at least Cable Rear Delt + Barbell
Curl (low CNS cost, full muscle hit). Skip the rest.

=== Predictions for tomorrow morning ===

Apr 30 weight forecast:    149.5-150.0 lb
                           (continued cut momentum, today's RED deload
                           burned ~150 kcal less than full push, but the
                           cut deficit holds)

Apr 30 HRV forecast:       85-110 ms (if sleep is clean tonight)
                           OR 60-80 ms (if sleep onset fails again)

Apr 30 sleep forecast:     7.5-8h IF you commit to ≤11 PM bedtime
                           tonight. Last night's 5h 49m at 2:45 AM was
                           the failure mode to avoid.

Apr 30 deep sleep:         110-150 min (rebound from tonight's clean sleep)

Apr 30 day type:           pull (this day)

These predictions go in the falsifiable accuracy ledger.

=== What sleep tonight needs ===

Last night's bedtime 2:45 AM was emotional ruminating, not insomnia.
Tonight, the practical interventions:

- Eat dinner finished by 7:30 PM (already locked in plan)
- 9-9:30 PM: stop screens, dim lights
- 10-10:30 PM: hot shower → drops core temp afterward, signals sleep
- If thoughts about yesterday's fight loop: write 3 sentences in a
  notebook to externalize them
- 11 PM: bed, lights out
- If you're awake at 11:30, get up and read paper for 15 min — don't
  fight sleep on the bed

If you fall asleep clean by 11 PM tonight, expect HRV to bounce to
85-110 by morning. If sleep fails again, the protocol triggers
full-week deload starting Apr 30.

=== Tone for tomorrow ===

Pull day tomorrow isn't punishment OR escape. It's clean execution at
established weights with rotated movements for variety. Match all
loads — no PRs, no progressions. Total volume is moderate (~17 working
sets), well under your peak (Apr 18: 24 sets at HRV 132 green-light).

The cut is ahead of plan. Trust the rotation, trust the recovery
process, don't try to make today's RED day "up" for itself.
`;

async function main() {
  console.log(`=== Pre-populate Apr 30 pull day (rotated) ===\n`);

  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: { dayType: 'pull', carbType: 'low', caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88 },
    create: { date: DATE, dayType: 'pull', carbType: 'low', caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88 },
  });

  const totalSets = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Plan: ${PLAN.length} exercises / ${totalSets} sets / ${workingSets} working`);
  for (const ex of PLAN) console.log(`  ${ex.name}: ${ex.sets.length} sets`);

  await prisma.workoutExercise.deleteMany({ where: { dailyLogId: dailyLog.id } });
  for (let i = 0; i < PLAN.length; i++) {
    const ex = PLAN[i];
    const exerciseRow = await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: { name: ex.name, category: ex.category },
    });
    await prisma.workoutExercise.create({
      data: {
        dailyLogId: dailyLog.id,
        exerciseId: exerciseRow.id,
        sortOrder: i,
        notes: ex.notes,
        sets: { create: ex.sets.map((s, j) => ({
          setNumber: j + 1,
          weightLbs: s.weight,
          reps: s.reps,
          isWarmup: s.warmup ?? false,
          isPerSide: s.perSide ?? false,
          notes: s.notes ?? null,
        })) },
      },
    });
  }

  await prisma.dailyLog.update({ where: { id: dailyLog.id }, data: { notes: BRIEFING } });
  console.log(`\nWrote ${PLAN.length} exercises + briefing (${BRIEFING.length} chars).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
