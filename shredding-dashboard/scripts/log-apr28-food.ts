/**
 * Log Apr 28 (rest day) food list to Turso.
 * Items are inserted with meal=null (unassigned) per the user's preference
 * to NOT pre-structure meals — eats based on fridge/hunger, not Claude's plan.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-28';

type Item = {
  name: string;
  quantity: string;
  grams: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes?: string;
};

const ITEMS: Item[] = [
  {
    name: 'Pork ribs (raw, bone-in)',
    quantity: '262g raw',
    grams: 262,
    calories: 510,
    proteinG: 32,
    carbsG: 0,
    fatG: 44,
    notes: 'Use up the rest of the ribs',
  },
  {
    name: "Ocean's Albacore tuna in water",
    quantity: '1 can (133g drained)',
    grams: 133,
    calories: 170,
    proteinG: 34,
    carbsG: 0,
    fatG: 2,
    notes: 'Whole can drained',
  },
  {
    name: 'Whey protein powder',
    quantity: '1 scoop (~30g)',
    grams: 30,
    calories: 120,
    proteinG: 24,
    carbsG: 3,
    fatG: 2,
    notes: 'Estimate; varies by brand',
  },
  {
    name: 'Shrimp (raw)',
    quantity: '360g raw',
    grams: 360,
    calories: 290,
    proteinG: 63,
    carbsG: 0,
    fatG: 3,
    notes: 'Kirkland frozen — based on label per 125g',
  },
  {
    name: 'White potato (raw)',
    quantity: '340g raw',
    grams: 340,
    calories: 262,
    proteinG: 7,
    carbsG: 58,
    fatG: 0,
    notes: 'Swapped from sweet potato — fewer carbs, smaller volume',
  },
  {
    name: '娃娃菜 (baby napa cabbage)',
    quantity: '100g',
    grams: 100,
    calories: 13,
    proteinG: 1,
    carbsG: 2,
    fatG: 0,
  },
  {
    name: '豆苗菜 (pea shoots)',
    quantity: '100g',
    grams: 100,
    calories: 30,
    proteinG: 3,
    carbsG: 5,
    fatG: 1,
  },
  {
    name: '金针菇 (enoki mushrooms)',
    quantity: '100g',
    grams: 100,
    calories: 37,
    proteinG: 2,
    carbsG: 7,
    fatG: 0,
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Log Apr 28 (rest day) food ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  // Sums for sanity check
  const sumP = ITEMS.reduce((s, i) => s + i.proteinG, 0);
  const sumC = ITEMS.reduce((s, i) => s + i.carbsG, 0);
  const sumF = ITEMS.reduce((s, i) => s + i.fatG, 0);
  const sumCal = ITEMS.reduce((s, i) => s + i.calories, 0);
  console.log(`Totals: ${sumCal} kcal / ${sumP}P / ${sumC}C / ${sumF}F`);
  console.log(`Target: 1400 kcal / 153P / 75C / 55F`);
  console.log(`Delta:  ${sumCal - 1400} kcal / ${sumP - 153}P / ${sumC - 75}C / ${sumF - 55}F\n`);

  for (const it of ITEMS) {
    console.log(`  ${it.name}: ${it.quantity} → ${it.calories} kcal / ${it.proteinG}P / ${it.carbsG}C / ${it.fatG}F`);
  }

  if (dryRun) {
    console.log('\nDry run — no writes.');
    return;
  }

  // Upsert daily_log for Apr 28 — REST day, low carb, tightened targets
  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: {
      caloriesTarget: 1400,
      proteinTarget: 153,
      carbsTarget: 75,
      fatTarget: 55,
      dayType: 'rest',
      carbType: 'low',
    },
    create: {
      date: DATE,
      dayType: 'rest',
      carbType: 'low',
      caloriesTarget: 1400,
      proteinTarget: 153,
      carbsTarget: 75,
      fatTarget: 55,
    },
  });
  console.log(`\ndaily_log id=${dailyLog.id}`);

  // Wipe + reinsert food_plan_items
  await prisma.foodPlanItem.deleteMany({ where: { dailyLogId: dailyLog.id } });

  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    await prisma.foodPlanItem.create({
      data: {
        dailyLogId: dailyLog.id,
        sortOrder: i,
        meal: null, // intentionally unassigned — user decides at meal time
        name: it.name,
        quantity: it.quantity,
        grams: it.grams,
        calories: it.calories,
        proteinG: it.proteinG,
        carbsG: it.carbsG,
        fatG: it.fatG,
        notes: it.notes ?? null,
      },
    });
  }

  console.log(`\nWrote ${ITEMS.length} food_plan_items for ${DATE}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
