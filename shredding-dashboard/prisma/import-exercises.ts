import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// Exercise catalog from Notion data
const EXERCISES = [
  // Push (chest/triceps/shoulders)
  { name: 'Bench Press', category: 'chest', equipment: 'barbell' },
  { name: 'Chest Machine Incline', category: 'chest', equipment: 'machine' },
  { name: 'DB Incline', category: 'chest', equipment: 'dumbbell' },
  { name: 'Chest Fly Machine', category: 'chest', equipment: 'machine' },
  { name: 'Smith Narrow Press', category: 'chest', equipment: 'smith' },
  { name: 'Cable Triceps', category: 'arms', equipment: 'cable' },
  // Pull (back/biceps)
  { name: 'MTS Row', category: 'back', equipment: 'machine' },
  { name: 'Lat Pulldown Wide', category: 'back', equipment: 'cable' },
  { name: 'Seated Row Narrow', category: 'back', equipment: 'cable' },
  { name: 'Straight Arm Pulldown', category: 'back', equipment: 'cable' },
  { name: 'Barbell Curl', category: 'arms', equipment: 'barbell' },
  { name: 'Cable Curl', category: 'arms', equipment: 'cable' },
  { name: 'Cable Rear Delt', category: 'shoulders', equipment: 'cable' },
  { name: 'Cable Crunch', category: 'core', equipment: 'cable' },
  // Legs
  { name: 'Squat', category: 'legs', equipment: 'barbell' },
  { name: 'Leg Press', category: 'legs', equipment: 'machine' },
  { name: 'Single Leg Extension', category: 'legs', equipment: 'machine' },
  // Shoulders
  { name: 'Shoulder Press Machine', category: 'shoulders', equipment: 'machine' },
  { name: 'Cable Front Raise', category: 'shoulders', equipment: 'cable' },
  { name: 'Cable Lateral Raise', category: 'shoulders', equipment: 'cable' },
];

interface SetData {
  setNumber: number;
  weightLbs: number | null;
  reps: number | null;
  isPerSide: boolean;
  isWarmup: boolean;
  notes: string | null;
}

interface ExerciseData {
  name: string;
  sortOrder: number;
  sets: SetData[];
}

// Apr 9 - Push day (from Notion)
const APR_9_PUSH: ExerciseData[] = [
  {
    name: 'Bench Press', sortOrder: 1,
    sets: [
      { setNumber: 1, weightLbs: 45, reps: 16, isPerSide: false, isWarmup: true, notes: 'empty bar' },
      { setNumber: 2, weightLbs: 25, reps: 10, isPerSide: true, isWarmup: true, notes: null },
      { setNumber: 3, weightLbs: 45, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 55, reps: 7, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 5, weightLbs: 70, reps: 3, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 6, weightLbs: 55, reps: 6, isPerSide: true, isWarmup: false, notes: 'drop set' },
    ],
  },
  {
    name: 'Chest Machine Incline', sortOrder: 2,
    sets: [
      { setNumber: 1, weightLbs: 50, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 60, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 60, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 60, reps: 6, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'DB Incline', sortOrder: 3,
    sets: [
      { setNumber: 1, weightLbs: 40, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 40, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 40, reps: 5, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Chest Fly Machine', sortOrder: 4,
    sets: [
      { setNumber: 1, weightLbs: 70, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 70, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 70, reps: 8, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Smith Narrow Press', sortOrder: 5,
    sets: [
      { setNumber: 1, weightLbs: 0, reps: 8, isPerSide: false, isWarmup: false, notes: 'no weight' },
      { setNumber: 2, weightLbs: 0, reps: 8, isPerSide: false, isWarmup: false, notes: 'no weight' },
      { setNumber: 3, weightLbs: 10, reps: 4, isPerSide: true, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Cable Triceps', sortOrder: 6,
    sets: [
      { setNumber: 1, weightLbs: 27.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 37.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 37.5, reps: 7, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 32.5, reps: 7, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
];

// Apr 10 - Pull day (from Notion)
const APR_10_PULL: ExerciseData[] = [
  {
    name: 'MTS Row', sortOrder: 1,
    sets: [
      { setNumber: 1, weightLbs: 50, reps: 16, isPerSide: true, isWarmup: true, notes: null },
      { setNumber: 2, weightLbs: 80, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 100, reps: 6, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 110, reps: 6, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 5, weightLbs: 110, reps: 6, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Lat Pulldown Wide', sortOrder: 2,
    sets: [
      { setNumber: 1, weightLbs: 70, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 90, reps: 6, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 70, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 50, reps: 11, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Seated Row Narrow', sortOrder: 3,
    sets: [
      { setNumber: 1, weightLbs: 42.5, reps: 10, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 50, reps: 10, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 80, reps: 6, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 90, reps: 6, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Straight Arm Pulldown', sortOrder: 4,
    sets: [
      { setNumber: 1, weightLbs: 42.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 57.5, reps: 7, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 57.5, reps: 6, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 35, reps: 8, isPerSide: false, isWarmup: false, notes: 'drop set' },
    ],
  },
  {
    name: 'Barbell Curl', sortOrder: 5,
    sets: [
      { setNumber: 1, weightLbs: 30, reps: 21, isPerSide: false, isWarmup: false, notes: '21s' },
      { setNumber: 2, weightLbs: 30, reps: 21, isPerSide: false, isWarmup: false, notes: '21s' },
      { setNumber: 3, weightLbs: 30, reps: 21, isPerSide: false, isWarmup: false, notes: '21s' },
      { setNumber: 4, weightLbs: 30, reps: 21, isPerSide: false, isWarmup: false, notes: '21s' },
    ],
  },
  {
    name: 'Cable Curl', sortOrder: 6,
    sets: [
      { setNumber: 1, weightLbs: 12.5, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 12.5, reps: 6, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 7.5, reps: 9, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 7.5, reps: 8, isPerSide: true, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Cable Rear Delt', sortOrder: 7,
    sets: [
      { setNumber: 1, weightLbs: 7.5, reps: 12, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 12.5, reps: 10, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 12.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 12.5, reps: 10, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Cable Crunch', sortOrder: 8,
    sets: [
      { setNumber: 1, weightLbs: 57.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 67.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 67.5, reps: 8, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
];

// Apr 11 - Legs day (from Notion)
const APR_11_LEGS: ExerciseData[] = [
  {
    name: 'Squat', sortOrder: 1,
    sets: [
      { setNumber: 1, weightLbs: 25, reps: 12, isPerSide: true, isWarmup: true, notes: null },
      { setNumber: 2, weightLbs: 90, reps: 4, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 90, reps: 4, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 90, reps: 5, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 5, weightLbs: 90, reps: 4, isPerSide: true, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Leg Press', sortOrder: 2,
    sets: [
      { setNumber: 1, weightLbs: 135, reps: 8, isPerSide: true, isWarmup: false, notes: '3x45 per side' },
      { setNumber: 2, weightLbs: 135, reps: 9, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 135, reps: 9, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 135, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 5, weightLbs: 135, reps: 8, isPerSide: true, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Single Leg Extension', sortOrder: 3,
    sets: [
      { setNumber: 1, weightLbs: 50, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 50, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 50, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 50, reps: 8, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Shoulder Press Machine', sortOrder: 4,
    sets: [
      { setNumber: 1, weightLbs: 45, reps: 9, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 55, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 55, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 65, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 5, weightLbs: 65, reps: 8, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Cable Front Raise', sortOrder: 5,
    sets: [
      { setNumber: 1, weightLbs: 10, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 10, reps: 9, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 3, weightLbs: 10, reps: 8, isPerSide: true, isWarmup: false, notes: null },
      { setNumber: 4, weightLbs: 10, reps: 8, isPerSide: true, isWarmup: false, notes: null },
    ],
  },
  {
    name: 'Cable Lateral Raise', sortOrder: 6,
    sets: [
      { setNumber: 1, weightLbs: 10, reps: 8, isPerSide: false, isWarmup: false, notes: null },
      { setNumber: 2, weightLbs: 10, reps: 8, isPerSide: false, isWarmup: false, notes: null },
    ],
  },
];

const WORKOUTS: Record<string, ExerciseData[]> = {
  '2026-04-09': APR_9_PUSH,
  '2026-04-10': APR_10_PULL,
  '2026-04-11': APR_11_LEGS,
};

async function main() {
  console.log('Importing exercises from Notion...');

  // Clear existing exercise data
  await prisma.exerciseSet.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.exercise.deleteMany();

  // Seed exercise catalog
  for (const ex of EXERCISES) {
    await prisma.exercise.create({ data: ex });
  }
  console.log(`  Created ${EXERCISES.length} exercises`);

  // Import workouts
  for (const [date, exercises] of Object.entries(WORKOUTS)) {
    const dailyLog = await prisma.dailyLog.findUnique({ where: { date } });
    if (!dailyLog) {
      console.log(`  Skipping ${date} — no daily log found`);
      continue;
    }

    let totalVolume = 0;
    let totalSets = 0;

    for (const ex of exercises) {
      const exercise = await prisma.exercise.findUnique({ where: { name: ex.name } });
      if (!exercise) {
        console.log(`  Warning: exercise "${ex.name}" not found in catalog`);
        continue;
      }

      const we = await prisma.workoutExercise.create({
        data: {
          dailyLogId: dailyLog.id,
          exerciseId: exercise.id,
          sortOrder: ex.sortOrder,
        },
      });

      for (const set of ex.sets) {
        await prisma.exerciseSet.create({
          data: {
            workoutExerciseId: we.id,
            setNumber: set.setNumber,
            weightLbs: set.weightLbs,
            reps: set.reps,
            rpe: null,
            isWarmup: set.isWarmup,
            isPerSide: set.isPerSide,
            notes: set.notes,
          },
        });
        if (set.weightLbs && set.reps && !set.isWarmup) {
          totalVolume += set.weightLbs * set.reps;
          totalSets++;
        }
      }
    }

    console.log(`  ${date}: ${exercises.length} exercises, ${totalSets} working sets, ${Math.round(totalVolume)} lbs volume`);
  }

  console.log('Exercise import complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
