import { prisma } from '../src/lib/db';

async function main() {
  const result = await prisma.dailyLog.update({
    where: { date: '2026-04-28' },
    data: {
      weightLbs: 151.3,
      morningHr: 51,
    },
  });
  console.log('Apr 28 morning weight + HR logged:');
  console.log(`  weightLbs: ${result.weightLbs}`);
  console.log(`  morningHr: ${result.morningHr}`);
  console.log(`  hrvMs: ${result.hrvMs} (from sleep CSV)`);
  console.log(`  sleepMinutes: ${result.sleepMinutes} (from sleep CSV)`);
  console.log(`  deepSleepMinutes: ${result.deepSleepMinutes} (from sleep CSV)`);
}

main().finally(() => prisma.$disconnect());
