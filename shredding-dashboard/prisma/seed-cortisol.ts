/**
 * Cortisol test fixture — writes a 14-day history so:
 * - a clear 2-day sustained-red HRV fixture fires on target date
 * - stacked-red day produces verdict=adjust with multiple categories
 *
 * Usage (requires DailyLog rows pre-existing from main seed.ts for those dates —
 * this script UPDATES existing rows, inserts new ones with carbType="low" dayType="rest" where missing).
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

type Row = {
  date: string;
  hrvMs: number | null;
  hrvMsAvg7: number | null;
  sleepMinutes: number | null;
  sleepMinutesAvg7: number | null;
  deepSleepMinutes: number | null;
  deepSleepMinutesAvg7: number | null;
  sleepBpm: number | null;
  sleepBpmAvg7: number | null;
  wakingBpm: number | null;
  wakingBpmAvg7: number | null;
  caloriesActual?: number | null;
  workoutActiveCal?: number | null;
  dayType?: 'rest' | 'push' | 'pull' | 'legs';
};

// 14-day synthetic history ending 2026-04-13. Target day is the last row.
// Days 1-10 are "normal". Days 11-12 establish baseline. Day 13 (yesterday) and
// Day 14 (target) both trip HRV + RHR + TST reds — sustained & stacked.
const FIXTURES: Row[] = [
  { date: '2026-03-31', hrvMs: 70, hrvMsAvg7: 70, sleepMinutes: 420, sleepMinutesAvg7: 415, deepSleepMinutes: 70, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 50, wakingBpmAvg7: 50, caloriesActual: 2000 },
  { date: '2026-04-01', hrvMs: 72, hrvMsAvg7: 70, sleepMinutes: 410, sleepMinutesAvg7: 415, deepSleepMinutes: 65, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 51, wakingBpmAvg7: 50, caloriesActual: 1950 },
  { date: '2026-04-02', hrvMs: 68, hrvMsAvg7: 70, sleepMinutes: 400, sleepMinutesAvg7: 415, deepSleepMinutes: 62, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 51, wakingBpmAvg7: 50, caloriesActual: 1980 },
  { date: '2026-04-03', hrvMs: 71, hrvMsAvg7: 70, sleepMinutes: 420, sleepMinutesAvg7: 415, deepSleepMinutes: 66, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 50, wakingBpmAvg7: 50, caloriesActual: 2100 },
  { date: '2026-04-04', hrvMs: 73, hrvMsAvg7: 70, sleepMinutes: 430, sleepMinutesAvg7: 415, deepSleepMinutes: 68, deepSleepMinutesAvg7: 65, sleepBpm: 54, sleepBpmAvg7: 55, wakingBpm: 49, wakingBpmAvg7: 50, caloriesActual: 2050 },
  { date: '2026-04-05', hrvMs: 69, hrvMsAvg7: 70, sleepMinutes: 400, sleepMinutesAvg7: 415, deepSleepMinutes: 60, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 51, wakingBpmAvg7: 50, caloriesActual: 1900 },
  { date: '2026-04-06', hrvMs: 70, hrvMsAvg7: 70, sleepMinutes: 415, sleepMinutesAvg7: 415, deepSleepMinutes: 65, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 50, wakingBpmAvg7: 50, caloriesActual: 2000 },
  { date: '2026-04-07', hrvMs: 71, hrvMsAvg7: 70, sleepMinutes: 420, sleepMinutesAvg7: 415, deepSleepMinutes: 66, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 50, wakingBpmAvg7: 50, caloriesActual: 2050 },
  { date: '2026-04-08', hrvMs: 70, hrvMsAvg7: 70, sleepMinutes: 410, sleepMinutesAvg7: 415, deepSleepMinutes: 64, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 50, wakingBpmAvg7: 50, caloriesActual: 2000 },
  { date: '2026-04-09', hrvMs: 72, hrvMsAvg7: 70, sleepMinutes: 405, sleepMinutesAvg7: 415, deepSleepMinutes: 62, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 51, wakingBpmAvg7: 50, caloriesActual: 2100 },
  { date: '2026-04-10', hrvMs: 69, hrvMsAvg7: 70, sleepMinutes: 400, sleepMinutesAvg7: 415, deepSleepMinutes: 60, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 51, wakingBpmAvg7: 50, caloriesActual: 1900 },
  { date: '2026-04-11', hrvMs: 70, hrvMsAvg7: 70, sleepMinutes: 420, sleepMinutesAvg7: 415, deepSleepMinutes: 65, deepSleepMinutesAvg7: 65, sleepBpm: 55, sleepBpmAvg7: 55, wakingBpm: 50, wakingBpmAvg7: 50, caloriesActual: 2050 },
  // Day 13 — yesterday: triple red (HRV -25%, RHR +10, TST <=330). Establishes sustained.
  { date: '2026-04-12', hrvMs: 52, hrvMsAvg7: 70, sleepMinutes: 320, sleepMinutesAvg7: 415, deepSleepMinutes: 50, deepSleepMinutesAvg7: 65, sleepBpm: 58, sleepBpmAvg7: 55, wakingBpm: 60, wakingBpmAvg7: 50, caloriesActual: 1800, workoutActiveCal: 600 },
  // Day 14 — TARGET: triple red sustained
  { date: '2026-04-13', hrvMs: 52, hrvMsAvg7: 70, sleepMinutes: 320, sleepMinutesAvg7: 415, deepSleepMinutes: 48, deepSleepMinutesAvg7: 65, sleepBpm: 59, sleepBpmAvg7: 55, wakingBpm: 61, wakingBpmAvg7: 50, caloriesActual: 1750, workoutActiveCal: 650 },
];

async function main() {
  console.log('Seeding cortisol fixture data...');
  for (const row of FIXTURES) {
    const existing = await prisma.dailyLog.findUnique({ where: { date: row.date } });
    const sleepData = {
      hrvMs: row.hrvMs,
      hrvMsAvg7: row.hrvMsAvg7,
      sleepMinutes: row.sleepMinutes,
      sleepMinutesAvg7: row.sleepMinutesAvg7,
      deepSleepMinutes: row.deepSleepMinutes,
      deepSleepMinutesAvg7: row.deepSleepMinutesAvg7,
      sleepBpm: row.sleepBpm,
      sleepBpmAvg7: row.sleepBpmAvg7,
      wakingBpm: row.wakingBpm,
      wakingBpmAvg7: row.wakingBpmAvg7,
      ...(row.caloriesActual !== undefined ? { caloriesActual: row.caloriesActual } : {}),
      ...(row.workoutActiveCal !== undefined ? { workoutActiveCal: row.workoutActiveCal } : {}),
    };
    if (existing) {
      await prisma.dailyLog.update({ where: { date: row.date }, data: sleepData });
      console.log(`  UPDATE ${row.date}`);
    } else {
      await prisma.dailyLog.create({
        data: {
          date: row.date,
          dayType: row.dayType ?? 'rest',
          carbType: 'low',
          ...sleepData,
        },
      });
      console.log(`  CREATE ${row.date}`);
    }
  }
  console.log('Cortisol seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
