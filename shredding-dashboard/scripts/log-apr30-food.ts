import { prisma } from '../src/lib/db';

const DATE = '2026-04-30';

type Item = { name: string; quantity: string; grams: number | null; calories: number; proteinG: number; carbsG: number; fatG: number; notes?: string };

const ITEMS: Item[] = [
  { name: 'Chicken thigh boneless skinless (raw)', quantity: '285g raw', grams: 285, calories: 410, proteinG: 50, carbsG: 0, fatG: 23 },
  { name: 'Salmon raw with skin', quantity: '325g raw', grams: 325, calories: 685, proteinG: 65, carbsG: 0, fatG: 42, notes: 'Frozen, thaw' },
  { name: 'Sweet potato (raw)', quantity: '385g raw', grams: 385, calories: 333, proteinG: 6, carbsG: 77, fatG: 0, notes: 'Use the rest' },
  { name: 'Whey protein powder', quantity: '1 scoop', grams: 30, calories: 120, proteinG: 24, carbsG: 3, fatG: 2 },
  { name: 'Whole egg', quantity: '1 egg', grams: 50, calories: 70, proteinG: 6, carbsG: 0, fatG: 5 },
  { name: 'Walnuts', quantity: '15g (~5 halves)', grams: 15, calories: 100, proteinG: 2, carbsG: 2, fatG: 10, notes: 'Omega-3 ALA + magnesium for sleep recovery' },
  { name: '菠菜 (spinach)', quantity: '100g', grams: 100, calories: 23, proteinG: 3, carbsG: 4, fatG: 0 },
  { name: '香菇 (shiitake mushrooms)', quantity: '100g', grams: 100, calories: 34, proteinG: 3, carbsG: 7, fatG: 1 },
  { name: '金针菇 (enoki mushrooms)', quantity: '100g', grams: 100, calories: 37, proteinG: 3, carbsG: 7, fatG: 0 },
];

async function main() {
  const sumP = ITEMS.reduce((s, i) => s + i.proteinG, 0);
  const sumC = ITEMS.reduce((s, i) => s + i.carbsG, 0);
  const sumF = ITEMS.reduce((s, i) => s + i.fatG, 0);
  const sumCal = ITEMS.reduce((s, i) => s + i.calories, 0);
  console.log(`Apr 30 pull day food: ${sumCal} kcal / ${sumP}P / ${sumC}C / ${sumF}F`);
  console.log(`Target:                 1800 kcal / 153P / 100C / 88F`);
  console.log(`Delta:                  ${sumCal - 1800} kcal / ${sumP - 153}P / ${sumC - 100}C / ${sumF - 88}F`);

  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: { caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88, dayType: 'pull', carbType: 'low' },
    create: { date: DATE, dayType: 'pull', carbType: 'low', caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88 },
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
