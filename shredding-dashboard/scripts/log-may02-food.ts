import { prisma } from '../src/lib/db';

const DATE = '2026-05-02';

type Item = { name: string; quantity: string; grams: number | null; calories: number; proteinG: number; carbsG: number; fatG: number; notes?: string };

const ITEMS: Item[] = [
  { name: '京酱肉丝 + 米饭混合 (leftover)', quantity: '100g mixed', grams: 100, calories: 180, proteinG: 10, carbsG: 18, fatG: 8, notes: 'Leftover from May 1 restaurant dinner' },
  { name: '酱猪肘 leftover edible', quantity: '~175g cooked meat (after deboning)', grams: 175, calories: 520, proteinG: 38, carbsG: 5, fatG: 38, notes: 'Leftover from May 1 restaurant. Total container was 481g but mostly bones. Estimated 175g edible meat+skin+fat.' },
  { name: 'Tilapia (Costco, raw)', quantity: '260g raw — 1 bag', grams: 260, calories: 250, proteinG: 52, carbsG: 0, fatG: 4, notes: 'Kirkland farmed tilapia, defrost from freezer' },
  { name: 'Whey protein', quantity: '1 scoop', grams: 30, calories: 120, proteinG: 24, carbsG: 3, fatG: 2 },
  { name: 'Sweet potato (raw)', quantity: '200g raw', grams: 200, calories: 172, proteinG: 3, carbsG: 40, fatG: 0 },
  { name: 'Shrimp (Kirkland, raw)', quantity: '80g raw', grams: 80, calories: 64, proteinG: 14, carbsG: 0, fatG: 1 },
  { name: 'Asparagus (Costco, fresh)', quantity: '100g', grams: 100, calories: 20, proteinG: 2, carbsG: 4, fatG: 0, notes: 'New from Costco run' },
  { name: 'Bimi baby broccoli (Costco)', quantity: '100g', grams: 100, calories: 35, proteinG: 3, carbsG: 7, fatG: 0, notes: 'New from Costco run' },
  { name: 'Black oyster mushrooms (Costco, organic)', quantity: '100g', grams: 100, calories: 35, proteinG: 3, carbsG: 6, fatG: 0, notes: 'Ergothioneine antioxidant — HRV recovery support' },
];

async function main() {
  const sumP = ITEMS.reduce((s, i) => s + i.proteinG, 0);
  const sumC = ITEMS.reduce((s, i) => s + i.carbsG, 0);
  const sumF = ITEMS.reduce((s, i) => s + i.fatG, 0);
  const sumCal = ITEMS.reduce((s, i) => s + i.calories, 0);
  console.log(`May 2 (rest day) plan: ${sumCal} kcal / ${sumP}P / ${sumC}C / ${sumF}F`);
  console.log(`Target:                   1400 kcal / 153P / 75C / 55F`);
  console.log(`Delta:                    ${sumCal - 1400} / ${sumP - 153}P / ${sumC - 75}C / ${sumF - 55}F\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) { console.log('No daily_log for ' + DATE); return; }

  await prisma.foodPlanItem.deleteMany({ where: { dailyLogId: dailyLog.id } });
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    await prisma.foodPlanItem.create({
      data: { dailyLogId: dailyLog.id, sortOrder: i, meal: null, name: it.name, quantity: it.quantity, grams: it.grams, calories: it.calories, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, notes: it.notes ?? null },
    });
  }

  // Set actuals to match plan (will be updated as deviations occur)
  await prisma.dailyLog.update({
    where: { id: dailyLog.id },
    data: { caloriesActual: sumCal, proteinActual: sumP, carbsActual: sumC, fatActual: sumF },
  });

  console.log(`Wrote ${ITEMS.length} food_plan_items + actuals for ${DATE}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
