/**
 * Fix Apr 7: day_type was stored as push/low but the actual workout was a
 * legs/high deadlift session (from pre-shred Transition phase, logged in the
 * old "Daily Log" database in Notion: 33b3a0cfb8d08196b057f3cd9a4212ac).
 *
 * Actions:
 *   1. Update daily_logs for 2026-04-07:
 *        day_type: push → legs
 *        carb_type: low → high
 *        calories_target: 2100 → 2200
 *        carbs_target: 100 → 250
 *        fat_target: 121 → 65
 *      (actuals are untouched; they were what he actually ate.)
 *   2. Insert 5 exercises / 22 sets logged that day.
 *
 * After this runs, follow with:  npx tsx scripts/backfill-glycogen.ts
 *
 * Usage:  npx tsx scripts/fix-apr7.ts
 *         add --dry-run to preview without writing.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-07';

type SetSpec = {
  weight: number | null;
  reps: number;
  warmup?: boolean;
  perSide?: boolean;
  notes?: string;
};

const EXERCISES: Array<{
  name: string;
  category: string;
  sourceLabel: string;
  sets: SetSpec[];
}> = [
  {
    name: 'Deadlift',
    category: 'legs',
    sourceLabel: 'Deadlift',
    sets: [
      { weight: 0, reps: 10, warmup: true, notes: 'empty bar' },
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 70, reps: 8, perSide: true, notes: '一边25+45' },
      { weight: 70, reps: 8, perSide: true, notes: '一边25+45' },
      { weight: 70, reps: 8, perSide: true, notes: '一边25+45' },
      { weight: 75, reps: 8, perSide: true, notes: '一边30+45' },
    ],
  },
  {
    name: 'Romanian Deadlift',
    category: 'legs',
    sourceLabel: 'RDL',
    sets: [
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 35, reps: 8, perSide: true },
      { weight: 35, reps: 8, perSide: true },
      { weight: 35, reps: 8, perSide: true },
      { weight: 35, reps: 8, perSide: true },
    ],
  },
  {
    name: 'Seated Leg Curl',
    category: 'legs',
    sourceLabel: 'Leg curl for back side of legs',
    sets: [
      { weight: 80, reps: 7, warmup: true },
      { weight: 65, reps: 8 },
      { weight: 65, reps: 8 },
      { weight: 65, reps: 7 },
    ],
  },
  {
    name: 'Hip Abduction',
    category: 'legs',
    sourceLabel: 'Hip Abduction',
    sets: [
      { weight: 85, reps: 8, warmup: true },
      { weight: 115, reps: 8 },
      { weight: 115, reps: 8 },
      { weight: 160, reps: 8 },
    ],
  },
  {
    name: 'Hip Adduction',
    category: 'legs',
    sourceLabel: 'Hip Adduction',
    sets: [
      { weight: 115, reps: 8, warmup: true },
      { weight: 145, reps: 8 },
      { weight: 145, reps: 8 },
    ],
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Fix Apr 7 (${DATE}) ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) {
    console.error(`daily_log for ${DATE} not found. Aborting.`);
    process.exit(1);
  }

  console.log('Current:');
  console.log(`  day_type=${dailyLog.dayType}  carb_type=${dailyLog.carbType}`);
  console.log(
    `  cal_target=${dailyLog.caloriesTarget}  carbs_target=${dailyLog.carbsTarget}` +
      `  fat_target=${dailyLog.fatTarget}`,
  );
  console.log('After update:');
  console.log('  day_type=legs  carb_type=high');
  console.log('  cal_target=2200  carbs_target=250  fat_target=65');

  const totalSets = EXERCISES.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = EXERCISES.reduce(
    (s, e) => s + e.sets.filter((x) => !x.warmup).length,
    0,
  );
  console.log(`\nExercises to insert: ${EXERCISES.length}, total sets ${totalSets}, working ${workingSets}\n`);

  if (dryRun) {
    console.log('Dry run — no writes performed.');
    return;
  }

  // 1. Update daily_log macros/day_type
  await prisma.dailyLog.update({
    where: { date: DATE },
    data: {
      dayType: 'legs',
      carbType: 'high',
      caloriesTarget: 2200,
      carbsTarget: 250,
      fatTarget: 65,
    },
  });
  console.log('Updated daily_logs row.');

  // 2. Replace workout_exercises for this day
  await prisma.workoutExercise.deleteMany({ where: { dailyLogId: dailyLog.id } });

  for (let i = 0; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];
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
        notes: ex.sourceLabel,
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
  console.log(`Inserted ${EXERCISES.length} exercises.`);
  console.log('\nNext: npx tsx scripts/backfill-glycogen.ts');
}

main()
  .catch((e) => {
    console.error('Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
