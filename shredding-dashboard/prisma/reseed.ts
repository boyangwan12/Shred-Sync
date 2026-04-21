import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

function estimateGlycogen(
  today: { dayType: string; carbsActual?: number | null; carbsTarget?: number | null; workoutAvgHr?: number | null },
  yesterday: { liverGlycogenPct: number; muscleGlycogenPct: number } | null
) {
  const LIVER_MAX = 100, MUSCLE_MAX = 450;
  let liverG = ((yesterday?.liverGlycogenPct ?? 75) / 100) * LIVER_MAX;
  let muscleG = ((yesterday?.muscleGlycogenPct ?? 80) / 100) * MUSCLE_MAX;
  const carbsEaten = today.carbsActual ?? today.carbsTarget ?? 0;
  const isExerciseDay = today.dayType !== 'rest';

  // Overnight drain — scales with liver fullness (Boden 1997)
  const drainRate = 28 + (liverG / LIVER_MAX) * 12;
  liverG = Math.max(0, liverG - drainRate);

  if (isExerciseDay) {
    // Exercise days: deplete FIRST, then refill (post-workout eating)
    const liverDrain: Record<string, number> = { push: 12, pull: 12, legs: 25 };
    liverG = Math.max(0, liverG - (liverDrain[today.dayType] ?? 0));
    const muscleDep: Record<string, number> = { push: 0.20, pull: 0.20, legs: 0.28 };
    const dep = muscleDep[today.dayType] || 0;
    muscleG *= (1 - dep);
    if (today.workoutAvgHr && dep > 0) {
      const f = Math.min(today.workoutAvgHr / 120, 1.5);
      muscleG *= (1 - (dep * (f - 1) * 0.5));
    }
    // Post-workout refill — muscle gets 60% (GLUT4 translocation, PMC507408)
    let available = carbsEaten;
    const lr = Math.min(available * 0.30, LIVER_MAX - liverG);
    liverG += lr; available -= lr;
    muscleG += Math.min(available * 0.60, MUSCLE_MAX - muscleG);
  } else {
    // Rest days: liver 35%, muscle 20% (Ferrannini 2001)
    let available = carbsEaten;
    const lr = Math.min(available * 0.35, LIVER_MAX - liverG);
    liverG += lr; available -= lr;
    muscleG += Math.min(available * 0.20, MUSCLE_MAX - muscleG);
  }

  // Fat burning — inverse of glycogen + insulin dampening from carb intake
  const avg = ((liverG / LIVER_MAX) + (muscleG / MUSCLE_MAX)) / 2 * 100;
  let fat = 20 + (100 - avg) * 0.7;
  if (isExerciseDay) fat += 8;
  const insulinDamp = Math.min(carbsEaten / 150, 1.0) * 0.4;
  fat = fat * (1 - insulinDamp);
  fat = Math.min(Math.round(fat), 85);
  fat = Math.max(fat, 15);

  return {
    liverGlycogenPct: Math.max(0, Math.round((liverG / LIVER_MAX) * 100)),
    muscleGlycogenPct: Math.max(0, Math.round((muscleG / MUSCLE_MAX) * 100)),
    fatBurningPct: fat,
  };
}

const seedData = [
  // Apr 7: Pre-cycle workout day (baseline)
  {
    date: '2026-04-07', dayType: 'push', carbType: 'low',
    caloriesTarget: 2100, caloriesActual: 2050,
    proteinTarget: 153, proteinActual: 150,
    carbsTarget: 100, carbsActual: 95,
    fatTarget: 121, fatActual: 118,
    morningHr: 55,
    workoutDurationMin: 65, workoutActiveCal: 410,
    workoutTotalCal: 530, workoutAvgHr: 114, workoutMaxHr: 142,
    notes: 'Pre-cycle workout (baseline day before cut started)',
  },
  // Apr 8: Rest day from Notion
  {
    date: '2026-04-08', dayType: 'rest', carbType: 'low',
    caloriesTarget: 1600, caloriesActual: 1924,
    proteinTarget: 153, proteinActual: 156,
    carbsTarget: 75, carbsActual: 101,
    fatTarget: 76, fatActual: 99.5,
    morningHr: 58, energyScore: 2, satietyScore: 5,
    dailyTotalCalBurned: 2162,
    notes: 'Rest day. Chicken legs 576g, rice 300g, avocado, walnuts 60g',
  },
  // Apr 9: Push from Notion
  {
    date: '2026-04-09', dayType: 'push', carbType: 'low',
    caloriesTarget: 2100, caloriesActual: 1916,
    proteinTarget: 153, proteinActual: 150,
    carbsTarget: 100, carbsActual: 95,
    fatTarget: 121, fatActual: 104,
    morningHr: 67, energyScore: 3, satietyScore: 5,
    workoutDurationMin: 76, workoutActiveCal: 452,
    workoutTotalCal: 574, workoutAvgHr: 117, workoutMaxHr: 146,
    notes: 'Push day. Bench press, chest machine incline, DB incline, fly, smith narrow press, cable triceps',
  },
  // Apr 10: Pull from Notion
  {
    date: '2026-04-10', dayType: 'pull', carbType: 'low',
    caloriesTarget: 2100, caloriesActual: 1911,
    proteinTarget: 153, proteinActual: 139.4,
    carbsTarget: 100, carbsActual: 90,
    fatTarget: 121, fatActual: 110,
    weightLbs: 153.3, morningHr: 66, energyScore: 4, satietyScore: 3,
    workoutDurationMin: 84, workoutActiveCal: 619,
    workoutTotalCal: 753, workoutAvgHr: 122, workoutMaxHr: 162,
    notes: 'Pull day. MTS row, lat pulldown, seated row, straight arm pulldown, barbell curl, cable curl, rear delt, cable crunch',
  },
  // Apr 11: Legs from Notion
  {
    date: '2026-04-11', dayType: 'legs', carbType: 'high',
    caloriesTarget: 2200, caloriesActual: 2230,
    proteinTarget: 153, proteinActual: 164,
    carbsTarget: 250, carbsActual: 258,
    fatTarget: 65, fatActual: 60.2,
    weightLbs: 152.4, morningHr: 58,
    workoutDurationMin: 75, workoutActiveCal: 375,
    workoutTotalCal: 494, workoutAvgHr: 110, workoutMaxHr: 146,
    notes: 'Leg day. Squat 90lb/side x4-5, leg press 3x45/side x8-9, single leg ext 50x8, shoulder press, cable raises',
  },
  // Apr 12: Tomorrow prediction (rest day, using target macros)
  {
    date: '2026-04-12', dayType: 'rest', carbType: 'low',
    caloriesTarget: 1600, caloriesActual: 1600,
    proteinTarget: 153, proteinActual: 153,
    carbsTarget: 75, carbsActual: 75,
    fatTarget: 76, fatActual: 76,
    notes: 'Predicted rest day (targets only)',
  },
];

async function main() {
  console.log('Clearing old data and reseeding...');
  await prisma.dailyLog.deleteMany();
  await prisma.weeklyCheckin.deleteMany();

  let prev: { liverGlycogenPct: number; muscleGlycogenPct: number } | null = null;
  for (const data of seedData) {
    const glycogen = estimateGlycogen(data, prev);
    await prisma.dailyLog.create({ data: { ...data, ...glycogen } });
    prev = glycogen;
    console.log(`  ${data.date} (${data.dayType}) — liver:${glycogen.liverGlycogenPct}% muscle:${glycogen.muscleGlycogenPct}% fatburn:${glycogen.fatBurningPct}%`);
  }
  console.log('Done! 6 days seeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
