import { prisma } from '../src/lib/db';

async function main() {
  const result = await prisma.dailyLog.update({
    where: { date: '2026-04-29' },
    data: { weightLbs: 150.0 },
  });
  console.log(`Apr 29 weight logged: ${result.weightLbs} lb`);
}
main().finally(() => prisma.$disconnect());
