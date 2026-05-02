import { prisma } from '../src/lib/db';

const DATE = '2026-04-29';

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
  { name: 'Salmon raw with skin', quantity: '190g raw', grams: 190, calories: 400, proteinG: 38, carbsG: 0, fatG: 25, notes: 'Frozen, thaw' },
  { name: 'Pork shoulder strips (raw)', quantity: '290g raw', grams: 290, calories: 640, proteinG: 58, carbsG: 0, fatG: 44, notes: 'T&T 梅頭肉絲 boneless' },
  { name: 'Shrimp (raw)', quantity: '200g raw', grams: 200, calories: 160, proteinG: 35, carbsG: 0, fatG: 2, notes: 'Kirkland frozen' },
  { name: 'Sweet potato (raw)', quantity: '470g raw', grams: 470, calories: 405, proteinG: 8, carbsG: 94, fatG: 0, notes: 'Split: ~150g pre-workout @ 4 PM, ~320g dinner' },
  { name: 'Whole eggs', quantity: '2 eggs', grams: 100, calories: 140, proteinG: 12, carbsG: 0, fatG: 10 },
  { name: '菠菜 (spinach)', quantity: '100g', grams: 100, calories: 23, proteinG: 3, carbsG: 4, fatG: 0 },
  { name: '豆苗 (pea shoots)', quantity: '100g', grams: 100, calories: 30, proteinG: 3, carbsG: 5, fatG: 1 },
];

async function main() {
  console.log(`=== Log Apr 29 (push day) food ===`);
  const sumP = ITEMS.reduce((s, i) => s + i.proteinG, 0);
  const sumC = ITEMS.reduce((s, i) => s + i.carbsG, 0);
  const sumF = ITEMS.reduce((s, i) => s + i.fatG, 0);
  const sumCal = ITEMS.reduce((s, i) => s + i.calories, 0);
  console.log(`Totals: ${sumCal} kcal / ${sumP}P / ${sumC}C / ${sumF}F`);
  console.log(`Target: 1800 kcal / 153P / 100C / 88F`);
  console.log(`Delta:  ${sumCal - 1800} kcal / ${sumP - 153}P / ${sumC - 100}C / ${sumF - 88}F\n`);

  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: { caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88, dayType: 'push', carbType: 'low' },
    create: { date: DATE, dayType: 'push', carbType: 'low', caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88 },
  });

  await prisma.foodPlanItem.deleteMany({ where: { dailyLogId: dailyLog.id } });
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    await prisma.foodPlanItem.create({
      data: { dailyLogId: dailyLog.id, sortOrder: i, meal: null, name: it.name, quantity: it.quantity, grams: it.grams, calories: it.calories, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, notes: it.notes ?? null },
    });
  }
  console.log(`Wrote ${ITEMS.length} food_plan_items for ${DATE}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
