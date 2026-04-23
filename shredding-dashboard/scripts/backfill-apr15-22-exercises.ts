/**
 * One-time backfill: import exercise data from Notion for Apr 15, 17, 18, 19.
 * (Apr 22 was originally part of this batch but already exists in prod Turso —
 * app-logged data takes precedence, so that date is excluded.)
 * Source: Notion pages under the Daily Shred Log data source
 * (collection://33c3a0cf-b8d0-81d4-80fe-000b4006d73f).
 *
 * Idempotent: deletes any existing workout_exercises for the target dates,
 * then re-inserts. Adds any missing exercise rows.
 *
 * SKIP_DATES env var can be a comma-separated list of YYYY-MM-DD to skip,
 * e.g. SKIP_DATES=2026-04-22 to protect live-logged data.
 *
 * Usage:  npx tsx scripts/backfill-apr15-22-exercises.ts
 *         add --dry-run to preview without writing.
 */

import { prisma } from '../src/lib/db';

type SetSpec = {
  weight: number | null; // null = bodyweight
  reps: number;
  warmup?: boolean;
  perSide?: boolean;
  notes?: string;
};

type ExerciseEntry = {
  name: string;       // must exist (or be added) in exercises table
  category: string;   // for new exercises
  sourceLabel: string; // original Notion label, stored in notes
  sets: SetSpec[];
};

type DayEntry = {
  date: string;
  sourceUrl: string;
  exercises: ExerciseEntry[];
};

// ---------------------------------------------------------------------------
// Data — transcribed from Notion
// ---------------------------------------------------------------------------

const DAYS: DayEntry[] = [
  {
    date: '2026-04-15',
    sourceUrl: 'https://www.notion.so/33c3a0cfb8d080ada6cdcabf27496cfe',
    exercises: [
      {
        name: 'Deadlift',
        category: 'legs',
        sourceLabel: 'deadlifting',
        sets: [
          { weight: 25, reps: 12, warmup: true, perSide: true },
          { weight: 70, reps: 5, perSide: true },
          { weight: 70, reps: 5, perSide: true },
          { weight: 70, reps: 6, perSide: true },
          { weight: 70, reps: 6, perSide: true },
        ],
      },
      {
        name: 'Romanian Deadlift',
        category: 'legs',
        sourceLabel: 'rdl',
        sets: [
          { weight: 25, reps: 8, perSide: true },
          { weight: 25, reps: 8, perSide: true },
          { weight: 25, reps: 9, perSide: true },
          { weight: 25, reps: 8, perSide: true },
          { weight: 25, reps: 9, perSide: true },
        ],
      },
      {
        name: 'Seated Leg Curl',
        category: 'legs',
        sourceLabel: 'seated leg curl',
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      },
      {
        name: 'Hip Thrust',
        category: 'legs',
        sourceLabel: '臀推机',
        sets: [
          { weight: 45, reps: 8, warmup: true, perSide: true },
          { weight: 90, reps: 5, perSide: true },
          { weight: 45, reps: 12, perSide: true },
          { weight: 45, reps: 12, perSide: true },
        ],
      },
      {
        name: 'Cable Rear Delt',
        category: 'shoulders',
        sourceLabel: '后束交叉绳索',
        sets: [
          { weight: 7.5, reps: 8, warmup: true, perSide: true },
          { weight: 12.5, reps: 12, perSide: true },
          { weight: 12.5, reps: 12, perSide: true },
          { weight: 12.5, reps: 12, perSide: true },
        ],
      },
    ],
  },

  {
    date: '2026-04-17',
    sourceUrl: 'https://www.notion.so/3453a0cfb8d080c8adc4ff6dde600740',
    exercises: [
      {
        name: 'DB Incline',
        category: 'chest',
        sourceLabel: 'incline chest dumbbell press',
        sets: [
          { weight: 30, reps: 14, warmup: true },
          { weight: 50, reps: 10 },
          { weight: 60, reps: 8 },
          { weight: 70, reps: 6 },
          { weight: 70, reps: 5 },
          { weight: 70, reps: 5 },
          { weight: 40, reps: 8, notes: 'back-off' },
          { weight: 40, reps: 7, notes: 'back-off' },
        ],
      },
      {
        name: 'Chest Machine Incline',
        category: 'chest',
        sourceLabel: 'mrs inclined chest press',
        sets: [
          { weight: 70, reps: 8 },
          { weight: 70, reps: 7 },
          { weight: 65, reps: 7 },
          { weight: 65, reps: 7 },
        ],
      },
      {
        name: 'Dips',
        category: 'chest',
        sourceLabel: '臂屈伸',
        sets: [
          { weight: null, reps: 8 },
          { weight: null, reps: 7 },
          { weight: null, reps: 7 },
          { weight: null, reps: 7 },
        ],
      },
      {
        name: 'Cable Chest Fly',
        category: 'chest',
        sourceLabel: 'cable夹胸',
        sets: [
          { weight: 17.5, reps: 7, perSide: true },
          { weight: 17.5, reps: 7, perSide: true },
          { weight: 17.5, reps: 8, perSide: true },
          { weight: 17.5, reps: 8, perSide: true },
        ],
      },
      {
        name: 'Cable Triceps',
        category: 'arms',
        sourceLabel: 'cable三头',
        sets: [
          { weight: 35, reps: 14, warmup: true },
          { weight: 42.5, reps: 10 },
          { weight: 50, reps: 8 },
          { weight: 50, reps: 8 },
          { weight: 35, reps: 8 },
          { weight: 35, reps: 9 },
          { weight: 42.5, reps: 7 },
        ],
      },
      {
        name: 'Cable Crunch',
        category: 'core',
        sourceLabel: 'cable abs curl',
        sets: [
          { weight: 65, reps: 12 },
          { weight: 65, reps: 9 },
          { weight: 65, reps: 10 },
          { weight: 65, reps: 9 },
        ],
      },
      {
        name: 'Hanging Leg Raise',
        category: 'core',
        sourceLabel: '抬腿卷腹',
        sets: [
          { weight: null, reps: 10 },
          { weight: null, reps: 10 },
          { weight: null, reps: 10 },
        ],
      },
    ],
  },

  {
    date: '2026-04-18',
    sourceUrl: 'https://www.notion.so/3463a0cfb8d080c49a28ddfbf3e3e316',
    exercises: [
      {
        name: 'Lat Pulldown Narrow',
        category: 'back',
        sourceLabel: '高位下拉 窄 反手',
        sets: [
          { weight: 85, reps: 10 },
          { weight: 85, reps: 10 },
          { weight: 140, reps: 8 },
          { weight: 140, reps: 8 },
          { weight: 160, reps: 6 },
          { weight: 180, reps: 4 },
        ],
      },
      {
        name: 'MTS Lat Pulldown',
        category: 'back',
        sourceLabel: 'mts front pull down 单手',
        sets: [
          { weight: 50, reps: 8, perSide: true },
          { weight: 60, reps: 8, perSide: true },
          { weight: 60, reps: 8, perSide: true },
          { weight: 60, reps: 8, perSide: true },
          { weight: 60, reps: 8, perSide: true },
        ],
      },
      {
        name: 'Cable Row',
        category: 'back',
        sourceLabel: 'cable row',
        sets: [
          { weight: 40, reps: 7, perSide: true },
          { weight: 85, reps: 9 },
          { weight: 85, reps: 11 },
          { weight: 85, reps: 8 },
          { weight: 85, reps: 8 },
        ],
      },
      {
        name: 'Dumbbell Row',
        category: 'back',
        sourceLabel: 'dumbbell row 单手',
        sets: [
          { weight: 50, reps: 7, perSide: true },
          { weight: 55, reps: 8, perSide: true },
          { weight: 55, reps: 8, perSide: true },
          { weight: 55, reps: 8, perSide: true },
        ],
      },
      {
        name: 'Cable Rear Delt',
        category: 'shoulders',
        sourceLabel: '后束cable 双手',
        sets: [
          { weight: 15, reps: 8 },
          { weight: 15, reps: 9 },
          { weight: 15, reps: 8 },
          { weight: 15, reps: 8 },
        ],
      },
      {
        name: 'Cable Rear Delt',
        category: 'shoulders',
        sourceLabel: '后束cable 单手',
        sets: [
          { weight: 5, reps: 8, perSide: true },
          { weight: 10, reps: 8, perSide: true },
        ],
      },
      {
        name: 'Cable Curl',
        category: 'arms',
        sourceLabel: '二头cable 单手',
        sets: [
          { weight: 20, reps: 6, perSide: true },
          { weight: 20, reps: 6, perSide: true },
          { weight: 20, reps: 6, perSide: true },
          { weight: 20, reps: 6, perSide: true },
        ],
      },
      {
        name: 'Barbell Shrug',
        category: 'back',
        sourceLabel: '杠铃耸肩',
        sets: [
          { weight: 0, reps: 10, warmup: true, notes: '空杆' },
          { weight: 25, reps: 8, perSide: true },
          { weight: 25, reps: 8, perSide: true },
          { weight: 25, reps: 8, perSide: true },
        ],
      },
    ],
  },

  {
    date: '2026-04-19',
    sourceUrl: 'https://www.notion.so/3473a0cfb8d080aa89dcdbafc6bf3f7c',
    exercises: [
      {
        name: 'Squat',
        category: 'legs',
        sourceLabel: 'squat',
        sets: [
          { weight: 0, reps: 12, warmup: true, notes: 'empty bar' },
          { weight: 25, reps: 8, warmup: true, perSide: true },
          { weight: 90, reps: 5, perSide: true },
          { weight: 95, reps: 5, perSide: true },
          { weight: 100, reps: 3, perSide: true },
          { weight: 100, reps: 3, perSide: true },
          { weight: 70, reps: 8, perSide: true, notes: 'back-off' },
        ],
      },
      {
        name: 'Belt Squat',
        category: 'legs',
        sourceLabel: 'belt squat',
        sets: [
          { weight: 25, reps: 8, warmup: true },
          { weight: 60, reps: 8 },
        ],
      },
      {
        name: 'Leg Press',
        category: 'legs',
        sourceLabel: 'seated leg press',
        sets: [
          { weight: 150, reps: 12, warmup: true },
          { weight: 190, reps: 10 },
          { weight: 230, reps: 8 },
          { weight: 270, reps: 8 },
          { weight: 310, reps: 8 },
        ],
      },
      {
        name: 'Back Extension Machine',
        category: 'back',
        sourceLabel: 'lower back',
        sets: [
          { weight: 145, reps: 8 },
          { weight: 145, reps: 10 },
          { weight: 160, reps: 8 },
          { weight: 160, reps: 8 },
        ],
      },
      {
        name: 'Single Leg Extension',
        category: 'legs',
        sourceLabel: 'leg extension',
        sets: [
          { weight: 85, reps: 8, warmup: true },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      },
      {
        name: 'Hip Adduction',
        category: 'legs',
        sourceLabel: 'hip adduction',
        sets: [
          { weight: 145, reps: 10 },
          { weight: 145, reps: 10 },
          { weight: 160, reps: 8 },
          { weight: 160, reps: 8 },
        ],
      },
      {
        name: 'Cable Crunch',
        category: 'core',
        sourceLabel: 'cable abs',
        sets: [
          { weight: 65, reps: 10 },
          { weight: 72.5, reps: 10 },
          { weight: 72.5, reps: 10 },
          { weight: 72.5, reps: 9 },
          { weight: 72.5, reps: 10 },
        ],
      },
    ],
  },

  {
    date: '2026-04-22',
    sourceUrl: 'https://www.notion.so/34a3a0cfb8d0806a8fa4c86bc0d7dc5c',
    exercises: [
      {
        name: 'T-Bar Row',
        category: 'back',
        sourceLabel: 't bar',
        sets: [
          { weight: 70, reps: 8 },
          { weight: 70, reps: 8 },
          { weight: 70, reps: 8 },
        ],
      },
      {
        name: 'MTS Row',
        category: 'back',
        sourceLabel: 'mts row',
        sets: [
          { weight: 60, reps: 8, warmup: true },
          { weight: 70, reps: 8 },
          { weight: 70, reps: 8 },
          { weight: 70, reps: 8 },
        ],
      },
      {
        name: 'Seated Row Narrow',
        category: 'back',
        sourceLabel: 'rowing',
        sets: [
          { weight: 85, reps: 8 },
          { weight: 85, reps: 8 },
          { weight: 85, reps: 6 },
          { weight: 85, reps: 9 },
        ],
      },
      {
        name: 'Cable Lat Rotation',
        category: 'back',
        sourceLabel: 'cable 背阔肌斜下拉',
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
        sourceLabel: 'cable 后束',
        sets: [
          { weight: 10, reps: 8, warmup: true },
          { weight: 20, reps: 10 },
          { weight: 25, reps: 8 },
          { weight: 15, reps: 10 },
        ],
      },
      {
        name: 'Cable Curl',
        category: 'arms',
        sourceLabel: 'cable biceps 单手',
        sets: [
          { weight: 20, reps: 8, perSide: true },
          { weight: 20, reps: 6, perSide: true },
          { weight: 20, reps: 6, perSide: true },
        ],
      },
      {
        name: 'Cable Curl',
        category: 'arms',
        sourceLabel: 'cable biceps 双手',
        sets: [
          { weight: 35, reps: 6 },
          { weight: 35, reps: 6 },
        ],
      },
      {
        name: 'Cable Crunch',
        category: 'core',
        sourceLabel: 'cable 卷腹',
        sets: [
          { weight: 65, reps: 10 },
          { weight: 72.5, reps: 10 },
          { weight: 72.5, reps: 8 },
          { weight: 72.5, reps: 8 },
        ],
      },
      {
        name: 'Cable Crunch',
        category: 'core',
        sourceLabel: 'cable 卷腹单手',
        sets: [
          { weight: 25, reps: 8, perSide: true },
          { weight: 35, reps: 8, perSide: true },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skip = new Set(
    (process.env.SKIP_DATES ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  const days = DAYS.filter((d) => !skip.has(d.date));

  console.log('=== Apr 15–22 exercise backfill ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  if (skip.size > 0) console.log(`Skipping: ${[...skip].join(', ')}`);
  console.log(`Dates: ${days.map((d) => d.date).join(', ')}\n`);

  for (const day of days) {
    const dailyLog = await prisma.dailyLog.findUnique({ where: { date: day.date } });
    if (!dailyLog) {
      console.warn(`  [${day.date}] MISSING daily_log row — skipping.`);
      continue;
    }

    const existing = await prisma.workoutExercise.count({
      where: { dailyLogId: dailyLog.id },
    });

    const totalSets = day.exercises.reduce((s, e) => s + e.sets.length, 0);
    const workingSets = day.exercises.reduce(
      (s, e) => s + e.sets.filter((x) => !x.warmup).length,
      0,
    );
    console.log(
      `  [${day.date}] ${day.exercises.length} exercises / ${totalSets} total sets / ${workingSets} working` +
        (existing > 0 ? `  (replacing ${existing} existing)` : ''),
    );
  }

  if (dryRun) {
    console.log('\nDry run — no writes performed. Re-run without --dry-run.');
    return;
  }

  for (const day of days) {
    const dailyLog = await prisma.dailyLog.findUnique({ where: { date: day.date } });
    if (!dailyLog) continue;

    // Delete existing workout_exercises for this daily_log (cascade removes sets).
    await prisma.workoutExercise.deleteMany({ where: { dailyLogId: dailyLog.id } });

    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i];

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
    console.log(`  [${day.date}] wrote ${day.exercises.length} exercises.`);
  }

  console.log('\nBackfill complete. Next: run scripts/backfill-glycogen.ts to recompute glycogen.');
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
