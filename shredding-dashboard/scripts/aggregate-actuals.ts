/**
 * Aggregate food_plan_items into daily_logs actuals for any day where
 * actuals are NULL but food items exist. Idempotent — safe to re-run.
 *
 * Usage:  npx tsx scripts/aggregate-actuals.ts
 *         add --dry-run to preview without writing.
 */

import { prisma } from '../src/lib/db';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Aggregate food_plan_items → daily_logs actuals ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  const logs = await prisma.dailyLog.findMany({
    orderBy: { date: 'asc' },
    include: { foodItems: true },
  });

  let updates = 0;
  for (const log of logs) {
    if (log.foodItems.length === 0) continue;
    const sums = log.foodItems.reduce(
      (acc, it) => ({
        kcal: acc.kcal + (it.calories ?? 0),
        protein: acc.protein + (it.proteinG ?? 0),
        carbs: acc.carbs + (it.carbsG ?? 0),
        fat: acc.fat + (it.fatG ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );

    // Round to match existing conventions (integer kcal, 1-decimal macros)
    const kcal = Math.round(sums.kcal);
    const protein = Math.round(sums.protein * 10) / 10;
    const carbs = Math.round(sums.carbs * 10) / 10;
    const fat = Math.round(sums.fat * 10) / 10;

    const needsUpdate =
      log.caloriesActual !== kcal ||
      log.proteinActual !== protein ||
      log.carbsActual !== carbs ||
      log.fatActual !== fat;

    if (!needsUpdate) continue;

    console.log(
      `  [${log.date}] ${log.caloriesActual ?? 'null'}→${kcal} kcal,` +
        ` ${log.carbsActual ?? 'null'}→${carbs}g carbs,` +
        ` ${log.proteinActual ?? 'null'}→${protein}g P,` +
        ` ${log.fatActual ?? 'null'}→${fat}g F`,
    );

    if (!dryRun) {
      await prisma.dailyLog.update({
        where: { id: log.id },
        data: {
          caloriesActual: kcal,
          proteinActual: protein,
          carbsActual: carbs,
          fatActual: fat,
        },
      });
    }
    updates++;
  }

  console.log(`\n${updates} rows ${dryRun ? 'would be' : 'were'} updated.`);
}

main()
  .catch((e) => {
    console.error('Aggregate failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
