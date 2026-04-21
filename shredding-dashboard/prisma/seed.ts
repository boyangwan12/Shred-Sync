import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

type DayType = 'rest' | 'push' | 'pull' | 'legs';

function estimateGlycogen(
  todayLog: { dayType: DayType; carbsActual?: number | null; carbsTarget?: number | null; workoutAvgHr?: number | null },
  yesterdayLog?: { liverGlycogenPct?: number | null; muscleGlycogenPct?: number | null } | null
) {
  const LIVER_MAX = 100;
  const MUSCLE_MAX = 400;
  const DAILY_LIVER_USAGE = 80;

  let liver = yesterdayLog?.liverGlycogenPct ?? 75;
  let muscle = yesterdayLog?.muscleGlycogenPct ?? 80;

  let liverG = (liver / 100) * LIVER_MAX;
  let muscleG = (muscle / 100) * MUSCLE_MAX;

  const carbsEaten = todayLog.carbsActual ?? todayLog.carbsTarget ?? 0;
  let availableCarbs = carbsEaten;

  const liverDeficit = LIVER_MAX - liverG;
  const liverRefill = Math.min(availableCarbs * 0.3, liverDeficit);
  liverG += liverRefill;
  availableCarbs -= liverRefill;

  const muscleDeficit = MUSCLE_MAX - muscleG;
  const muscleRefill = Math.min(availableCarbs * 0.7, muscleDeficit);
  muscleG += muscleRefill;

  liverG = Math.max(0, liverG - DAILY_LIVER_USAGE);

  const exerciseDepletion: Record<string, number> = { rest: 0, push: 0.15, pull: 0.15, legs: 0.30 };
  const depletion = exerciseDepletion[todayLog.dayType] || 0;
  muscleG = muscleG * (1 - depletion);

  if (todayLog.workoutAvgHr) {
    const intensityFactor = Math.min(todayLog.workoutAvgHr / 120, 1.3);
    muscleG = muscleG * (1 - (depletion * (intensityFactor - 1)));
  }

  const avgGlycogenPct = ((liverG / LIVER_MAX) + (muscleG / MUSCLE_MAX)) / 2 * 100;
  let fatBurning = 30;
  if (avgGlycogenPct < 60) fatBurning += (60 - avgGlycogenPct) * 0.8;
  if (todayLog.dayType !== 'rest') fatBurning += 5;
  fatBurning = Math.min(Math.round(fatBurning), 85);

  return {
    liverGlycogenPct: Math.round((liverG / LIVER_MAX) * 100),
    muscleGlycogenPct: Math.round((muscleG / MUSCLE_MAX) * 100),
    fatBurningPct: fatBurning,
  };
}

const seedData = [
  {
    date: '2026-04-08',
    dayType: 'rest' as DayType,
    carbType: 'low',
    caloriesTarget: 1600, caloriesActual: 1924,
    proteinTarget: 140, proteinActual: 156,
    carbsTarget: 90, carbsActual: 101,
    fatTarget: 110, fatActual: 99.5,
    morningHr: 58,
    energyScore: 2, satietyScore: 5,
    dailyTotalCalBurned: 2162,
  },
  {
    date: '2026-04-09',
    dayType: 'push' as DayType,
    carbType: 'low',
    caloriesTarget: 1910, caloriesActual: 1916,
    proteinTarget: 140, proteinActual: 150,
    carbsTarget: 90, carbsActual: 95,
    fatTarget: 110, fatActual: 104,
    morningHr: 67,
    energyScore: 3, satietyScore: 5,
    workoutDurationMin: 76, workoutActiveCal: 452,
    workoutTotalCal: 574, workoutAvgHr: 117,
    workoutMaxHr: 146,
  },
  {
    date: '2026-04-10',
    dayType: 'pull' as DayType,
    carbType: 'low',
    caloriesTarget: 1910, caloriesActual: 1911,
    proteinTarget: 140, proteinActual: 139.4,
    carbsTarget: 90, carbsActual: 90,
    fatTarget: 110, fatActual: 110,
    weightLbs: 153.3,
    morningHr: 66,
    energyScore: 4, satietyScore: 3,
    workoutDurationMin: 84, workoutActiveCal: 619,
    workoutTotalCal: 753, workoutAvgHr: 122,
    workoutMaxHr: 162,
  },
  {
    date: '2026-04-11',
    dayType: 'legs' as DayType,
    carbType: 'high',
    caloriesTarget: 2200, caloriesActual: 2230,
    proteinTarget: 164, proteinActual: 164,
    carbsTarget: 258, carbsActual: 258,
    fatTarget: 60, fatActual: 60.2,
    weightLbs: 152.4,
    morningHr: 58,
    workoutDurationMin: 75, workoutActiveCal: 375,
    workoutTotalCal: 494, workoutAvgHr: 110,
    workoutMaxHr: 146,
  },
];

async function main() {
  console.log('Seeding database...');
  await prisma.dailyLog.deleteMany();
  await prisma.weeklyCheckin.deleteMany();

  let previousLog: { liverGlycogenPct: number; muscleGlycogenPct: number } | null = null;

  for (const data of seedData) {
    const glycogen = estimateGlycogen(
      { dayType: data.dayType, carbsActual: data.carbsActual, carbsTarget: data.carbsTarget, workoutAvgHr: (data as any).workoutAvgHr ?? null },
      previousLog
    );

    await prisma.dailyLog.create({
      data: {
        ...data,
        liverGlycogenPct: glycogen.liverGlycogenPct,
        muscleGlycogenPct: glycogen.muscleGlycogenPct,
        fatBurningPct: glycogen.fatBurningPct,
      },
    });

    previousLog = { liverGlycogenPct: glycogen.liverGlycogenPct, muscleGlycogenPct: glycogen.muscleGlycogenPct };
    console.log(`  Seeded: ${data.date} (${data.dayType}) — liver: ${glycogen.liverGlycogenPct}%, muscle: ${glycogen.muscleGlycogenPct}%, fat burn: ${glycogen.fatBurningPct}%`);
  }

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
