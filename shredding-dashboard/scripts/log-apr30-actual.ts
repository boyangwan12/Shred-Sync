/**
 * Apr 30 actual food log — replaces the planned 9 items with what was eaten:
 *  - Morning: 1/3 of planned 9-item breakfast/lunch
 *  - 4:20 PM: restaurant meal with friend
 *  - Post 9 PM gym: protein shake + lychee boba tea
 *
 * Total intake: ~2120 kcal / 165P / 123C / 107F (vs planned 1812/162/100/83).
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-30';

type Item = { name: string; quantity: string; grams: number | null; calories: number; proteinG: number; carbsG: number; fatG: number; notes?: string };

const ITEMS: Item[] = [
  // Morning — 1/3 of planned 9 items
  {
    name: '上午餐 (1/3 of planned 9-item meal)',
    quantity: '~1/3 portion',
    grams: null,
    calories: 605,
    proteinG: 55,
    carbsG: 33,
    fatG: 28,
    notes: 'Chicken thigh 95g + salmon 108g + sweet potato 128g + whey 1/3 + egg 1/3 + walnuts 5g + spinach/香菇/金针菇 33g each. User ate 1/3 of full planned meal.',
  },
  // 4:20 PM restaurant meal
  {
    name: '青椒五花肉 (1/4 of large dish)',
    quantity: '1/4 dish (~350g portion)',
    grams: 350,
    calories: 350,
    proteinG: 19,
    carbsG: 4,
    fatG: 33,
    notes: 'Restaurant green pepper + pork belly stir-fry. High saturated fat + sodium.',
  },
  {
    name: '炒饼丝 (1/4 of large dish)',
    quantity: '1/4 dish (~250g portion)',
    grams: 250,
    calories: 325,
    proteinG: 9,
    carbsG: 33,
    fatG: 13,
    notes: 'Stir-fried flour pancake strips with cabbage and meat. Starchy carbs.',
  },
  {
    name: '烤牛蛙 (一只)',
    quantity: '1 whole bullfrog',
    grams: 150,
    calories: 200,
    proteinG: 30,
    carbsG: 0,
    fatG: 8,
    notes: 'Lean protein, slight oil from grilling.',
  },
  {
    name: '鸡脆骨 (3 串)',
    quantity: '3 skewers',
    grams: 100,
    calories: 120,
    proteinG: 20,
    carbsG: 0,
    fatG: 5,
    notes: 'Chicken cartilage skewers — collagen + protein.',
  },
  {
    name: '包油羊腰子 (1 串)',
    quantity: '1 skewer',
    grams: 70,
    calories: 200,
    proteinG: 8,
    carbsG: 0,
    fatG: 18,
    notes: 'Lamb kidney with fat wrap.',
  },
  // Post 9 PM gym
  {
    name: '乳清蛋白粉 (post-gym)',
    quantity: '1 scoop',
    grams: 30,
    calories: 120,
    proteinG: 24,
    carbsG: 3,
    fatG: 2,
    notes: 'Post-gym protein.',
  },
  {
    name: '荔枝水果茶 + 珍珠 (boba)',
    quantity: '1 cup',
    grams: 500,
    calories: 200,
    proteinG: 0,
    carbsG: 50,
    fatG: 0,
    notes: '0-cal sugar but 50g carbs from boba pearls + lychee fruit/tea.',
  },
];

async function main() {
  const sumP = ITEMS.reduce((s, i) => s + i.proteinG, 0);
  const sumC = ITEMS.reduce((s, i) => s + i.carbsG, 0);
  const sumF = ITEMS.reduce((s, i) => s + i.fatG, 0);
  const sumCal = ITEMS.reduce((s, i) => s + i.calories, 0);

  console.log(`Apr 30 ACTUAL food: ${sumCal} kcal / ${sumP}P / ${sumC}C / ${sumF}F`);
  console.log(`Plan was:             1800 kcal / 153P / 100C / 88F`);
  console.log(`Delta from plan:      ${sumCal - 1800} kcal / ${sumP - 153}P / ${sumC - 100}C / ${sumF - 88}F\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) { console.log('No daily_log'); return; }

  // Wipe old planned items
  const deleteResult = await prisma.foodPlanItem.deleteMany({ where: { dailyLogId: dailyLog.id } });
  console.log(`Deleted ${deleteResult.count} old planned items.`);

  // Insert new actual items
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    await prisma.foodPlanItem.create({
      data: {
        dailyLogId: dailyLog.id,
        sortOrder: i,
        meal: null,
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
  console.log(`Wrote ${ITEMS.length} actual food_plan_items.`);

  // Update daily_log actuals
  await prisma.dailyLog.update({
    where: { id: dailyLog.id },
    data: {
      caloriesActual: sumCal,
      proteinActual: sumP,
      carbsActual: sumC,
      fatActual: sumF,
    },
  });
  console.log(`Updated daily_log actuals: ${sumCal} / ${sumP} / ${sumC} / ${sumF}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
