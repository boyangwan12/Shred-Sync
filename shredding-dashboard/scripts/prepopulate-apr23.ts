/**
 * Pre-populate Apr 23's workout page with the deadlift + posterior chain plan
 * and the progression rationale. Exercise notes carry the reasoning for each
 * lift so it's visible as you train.
 *
 * Plan logic: CNS fresh (HRV 124), fuel low (muscle glycogen 42%). Match
 * previous top weights, chase +1 rep. Reset RDL after Apr 15 regression. Only
 * accessories (Back Extension, Hip Adduction) get +15 lb bumps since they
 * showed clean progression.
 *
 * Usage:  npx tsx scripts/prepopulate-apr23.ts
 *         add --dry-run to preview without writing.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-23';

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
    name: 'Deadlift',
    category: 'legs',
    notes:
      'Match Apr 15 weight (一边70), chase +1 rep across all sets. Apr 15 hit 5,5,6,6 — target 6,6,6,6. CNS fresh (HRV 124) but fuel low (42% muscle), so weight not load. RPE 7–8, no singles.',
    sets: [
      { weight: 0, reps: 8, warmup: true, notes: 'empty bar' },
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 50, reps: 5, warmup: true, perSide: true },
      { weight: 70, reps: 6, perSide: true },
      { weight: 70, reps: 6, perSide: true },
      { weight: 70, reps: 6, perSide: true },
      { weight: 70, reps: 6, perSide: true },
    ],
  },
  {
    name: 'Romanian Deadlift',
    category: 'legs',
    notes:
      'Reset to Apr 7 weight (一边35). Apr 15 regressed to 一边25 — anomaly, not ceiling. Slow eccentric, feel the hamstring stretch.',
    sets: [
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 35, reps: 8, perSide: true },
      { weight: 35, reps: 8, perSide: true },
      { weight: 35, reps: 8, perSide: true },
      { weight: 35, reps: 8, perSide: true },
    ],
  },
  {
    name: 'Hip Thrust',
    category: 'legs',
    notes:
      'Apr 15 top was 一边90 × 5. Target +1 rep at same weight. Back-off set at 75/side for glute pump.',
    sets: [
      { weight: 45, reps: 8, warmup: true, perSide: true },
      { weight: 90, reps: 6, perSide: true },
      { weight: 90, reps: 6, perSide: true },
      { weight: 75, reps: 10, perSide: true, notes: 'back-off' },
    ],
  },
  {
    name: 'Seated Leg Curl',
    category: 'legs',
    notes:
      'Apr 15 was 100 × 8,8,8,8 — stuck at rep ceiling. +1 rep target on first two sets. 1s pause at peak contraction.',
    sets: [
      { weight: 100, reps: 9 },
      { weight: 100, reps: 9 },
      { weight: 100, reps: 8 },
    ],
  },
  {
    name: 'Back Extension Machine',
    category: 'back',
    notes:
      'Clean progression line (115 → 145 → 160). Accessory machine = low systemic cost, weight bump allowed. +15 lb top set.',
    sets: [
      { weight: 160, reps: 10 },
      { weight: 175, reps: 8, notes: 'new top' },
      { weight: 175, reps: 8 },
    ],
  },
  {
    name: 'Hip Adduction',
    category: 'legs',
    notes:
      'Apr 19 hit 160 × 8. Accessory machine, glycogen-independent. +15 lb top set.',
    sets: [
      { weight: 160, reps: 10 },
      { weight: 175, reps: 8, notes: 'new top' },
    ],
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Pre-populate Apr 23 plan ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) {
    console.error(`daily_log for ${DATE} not found. Aborting.`);
    process.exit(1);
  }

  const existing = await prisma.workoutExercise.count({ where: { dailyLogId: dailyLog.id } });
  console.log(`Existing exercises: ${existing}`);

  const totalSets = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Plan: ${PLAN.length} exercises / ${totalSets} total sets / ${workingSets} working\n`);

  for (const ex of PLAN) {
    console.log(`  ${ex.name}: ${ex.sets.length} sets`);
  }

  if (dryRun) {
    console.log('\nDry run — no writes performed.');
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

  console.log(`\nWrote ${PLAN.length} exercises. Refresh the workout page to see the plan.`);
}

main()
  .catch((e) => {
    console.error('Pre-populate failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
