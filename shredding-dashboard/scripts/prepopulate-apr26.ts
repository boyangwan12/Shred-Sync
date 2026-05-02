/**
 * Apr 26 pull day — preload + briefing.
 * HRV 75 (yellow light), deep sleep recovered (185 min), heavy push yesterday.
 * Strategy: match weight, chase +1 rep on top sets. No PR attempts.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-26';

type SetSpec = {
  weight: number | null;
  reps: number;
  warmup?: boolean;
  perSide?: boolean;
  notes?: string;
};

const PLAN: Array<{
  name: string;
  category: string;
  notes: string;
  sets: SetSpec[];
}> = [
  {
    name: 'Lat Pulldown Narrow',
    category: 'back',
    notes:
      'Apr 18 hit 180×4 PR — not today (HRV 75). Match Apr 18 mid-range volume: 140×8 working sets without the 160-180 ramp. +1 rep target on set 2.',
    sets: [
      { weight: 85, reps: 10, warmup: true },
      { weight: 140, reps: 8 },
      { weight: 140, reps: 9, notes: '+1 rep target' },
      { weight: 140, reps: 8 },
    ],
  },
  {
    name: 'MTS Lat Pulldown',
    category: 'back',
    notes:
      'Apr 18 hit 60/sd × 8 × 4. Match weight, chase +1 rep on set 2.',
    sets: [
      { weight: 50, reps: 8, warmup: true, perSide: true },
      { weight: 60, reps: 8, perSide: true },
      { weight: 60, reps: 9, perSide: true, notes: '+1 rep target' },
      { weight: 60, reps: 8, perSide: true },
    ],
  },
  {
    name: 'Seated Row Narrow',
    category: 'back',
    notes:
      'Apr 18 hit 85 × 11 (top), Apr 22 hit 85 × 9. Match the higher rep ceiling — chase 11 reps.',
    sets: [
      { weight: 60, reps: 10, warmup: true },
      { weight: 85, reps: 10 },
      { weight: 85, reps: 10 },
      { weight: 85, reps: 8 },
    ],
  },
  {
    name: 'Dumbbell Row',
    category: 'back',
    notes:
      'Apr 18: 50/sd × 7 then 55/sd × 8 × 3. Match — single 50 warmup, then 55/sd × 8 × 3 with +1 on set 2.',
    sets: [
      { weight: 50, reps: 8, warmup: true, perSide: true },
      { weight: 55, reps: 8, perSide: true },
      { weight: 55, reps: 9, perSide: true, notes: '+1 rep target' },
      { weight: 55, reps: 8, perSide: true },
    ],
  },
  {
    name: 'Cable Rear Delt',
    category: 'shoulders',
    notes:
      'Apr 22 ramp: 10w, 20×10, 25×8, 15×10 back-off. Match this exact pattern — accessory, low CNS cost.',
    sets: [
      { weight: 10, reps: 8, warmup: true },
      { weight: 20, reps: 10 },
      { weight: 25, reps: 8 },
      { weight: 15, reps: 10, notes: 'back-off' },
    ],
  },
  {
    name: 'Barbell Curl',
    category: 'arms',
    notes:
      'Apr 14 hit 50 × 8 × 2. Today: same weight, +1 rep on set 2.',
    sets: [
      { weight: 30, reps: 12, warmup: true },
      { weight: 50, reps: 8 },
      { weight: 50, reps: 9, notes: '+1 rep target' },
      { weight: 40, reps: 12, notes: 'back-off' },
    ],
  },
  {
    name: 'Cable Curl',
    category: 'arms',
    notes:
      'Apr 22 hit 35 × 6 × 2 (double-arm). Match weight, chase +1 rep.',
    sets: [
      { weight: 25, reps: 12, warmup: true },
      { weight: 35, reps: 7 },
      { weight: 35, reps: 7 },
      { weight: 25, reps: 12, notes: 'back-off' },
    ],
  },
  {
    name: 'Hanging Leg Raise',
    category: 'core',
    notes:
      'Cap session with core. BW × 10-12 × 3, no weight bumps.',
    sets: [
      { weight: null, reps: 12 },
      { weight: null, reps: 10 },
      { weight: null, reps: 10 },
    ],
  },
];

const BRIEFING = `=== Apr 26 pull day — match weight, chase reps ===

Yesterday's push (Apr 25) cost more than the HRV signal alone showed:
session volume 10,375 lbs across 24 working sets (your highest push
ever). Last night the body partially rebounded — deep sleep recovered
fully (185 min, +110 vs Apr 25), but HRV only nudged from 71 to 75.
That's yellow-light territory — same profile as yesterday morning.

Strategy is unchanged: match recent weight, chase +1 rep. No PR
attempts today. Apr 29 (next push) is the green-light candidate IF
HRV climbs back above 100.

=== The four pull days compared ===

Dimension                | Apr 10   | Apr 14   | Apr 18    | Apr 22   | Today (Apr 26)
-------------------------|----------|----------|-----------|----------|------------------
Bodyweight (morning)     | 153.3    | 152.2    | 153.2     | 152.2    | 152.9
Carb intake that day     | 90g      | 95.5g    | 80g       | 100.3g   | 100g target
Muscle glycogen entering | 81%      | 69%      | 50%       | 50%      | 72%
HRV last night           | 47ms     | 88ms     | 132ms     | 63ms     | 75ms
Deep sleep               | 112 min  | 44 min   | 132 min   | 134 min  | 185 min ← high
Sleep duration           | 5.6h     | 6.9h     | 7.2h ish  | 7.2h     | 9.0h
Prior day                | push     | push     | leg PR    | push     | push (heavy)

=== What you actually pulled ===

• Apr 10: 8 exercises, conservative (early cut, learning weights)
• Apr 14: 12 exercises (HIGH volume — 42 total sets), included 50×8×2 BB curl
• Apr 18: 8 exercises, tested PR ceiling (Lat Pulldown Narrow 180×4)
• Apr 22: 9 exercises, conservative recovery from Apr 18 + Apr 19 legs PR

Today targets the Apr 18 + Apr 22 pattern but with rep-chase instead
of weight bumps: complete pull volume across 8 exercises, ~24 working
sets, all weights matched to recent best.

=== Today's setup ===

You have:
• Best fuel of any pull day (muscle 72%, liver 66% from refeed)
• Mediocre HRV (75ms — at baseline, not crashed but not green-lit)
• Prior-session fatigue from Apr 25's heavy push
• Best sleep in 6+ days (9.0h, 185 min deep)

This is a recover-then-execute day, not a peak day. The 185 min deep
sleep tells the body wants to consolidate gains, not overload further.

=== Per-exercise rationale ===

Exercise          | Today's target          | Reference       | Why
------------------|-------------------------|-----------------|----------
Lat Pulldown Narrow | 140 × 8, 9, 8         | Apr 18: 140×8×2 + PR | Match, +1 rep set 2
MTS Lat Pulldown  | 60/sd × 8, 9, 8         | Apr 18: 60/sd × 8 × 4 | Match, +1 rep set 2
Seated Row Narrow | 85 × 10, 10, 8          | Apr 18: 85 × 11 top   | Match top-rep ceiling
Dumbbell Row      | 55/sd × 8, 9, 8         | Apr 18: 55/sd × 8 × 3 | +1 rep set 2
Cable Rear Delt   | 20×10, 25×8, 15×10      | Apr 22 exact          | Accessory, no PR
Barbell Curl      | 50 × 8, 9, 40 × 12      | Apr 14: 50×8×2        | +1 rep set 2
Cable Curl        | 35 × 7, 7 + 25 back-off | Apr 22: 35×6×2        | +1 rep
Hanging Leg Raise | BW × 12, 10, 10         | Apr 17: BW×10×3       | Match

=== Bail criteria ===

Drop weights 5–10% if any of these hit during warmup:
• Bar speed crashes on warmup-to-working transition
• Energy <2/5 by exercise 3
• Lower-back twinge on Dumbbell Row (yesterday's bench loaded
  the spine via overhead press too — be cautious here)
• Lat fatigue forcing single-rep stops on Lat Pulldown Narrow

If you bail mid-session, finish at least the rear delt + biceps
work (low CNS cost) so the day isn't a total loss.

=== Forecast ===

If you execute cleanly:
• Tomorrow's HRV: 95-110 if you eat early + low-sodium
• Apr 27 legs day: green-lit IF HRV bounces above 100
• Bench plateau: 一边75 still queued for next push (Apr 29)
• 7-day weight avg: should drop to ~152.3 by Apr 28

If HRV stays flat (~75) tomorrow:
• Take Apr 27 lighter (deload legs day, not heavy)
• Re-evaluate after another full recovery night

=== Reminder for today ===

Same rules as yesterday's diet plan:
• Last meal by 7 PM (not 9 PM like Apr 24)
• Sleep by midnight
• Hydrate during day, taper after 8 PM
• Sodium moderate (still clearing yesterday's hot pot)
`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Pre-populate Apr 26 pull day ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) {
    console.error('No daily_log for ' + DATE + '. Aborting.');
    process.exit(1);
  }

  const totalSets = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Plan: ${PLAN.length} exercises / ${totalSets} sets / ${workingSets} working\n`);
  for (const ex of PLAN) console.log(`  ${ex.name}: ${ex.sets.length} sets`);

  if (dryRun) {
    console.log('\nDry run — no writes.');
    return;
  }

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
        sets: {
          create: ex.sets.map((s, j) => ({
            setNumber: j + 1,
            weightLbs: s.weight,
            reps: s.reps,
            isWarmup: s.warmup ?? false,
            isPerSide: s.perSide ?? false,
            notes: s.notes ?? null,
          })),
        },
      },
    });
  }

  await prisma.dailyLog.update({ where: { id: dailyLog.id }, data: { notes: BRIEFING } });
  console.log(`\nWrote ${PLAN.length} exercises + briefing.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
