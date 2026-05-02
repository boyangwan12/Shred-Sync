/**
 * May 1 actual food + deadlift workout log.
 *
 * Day shape: morning 1/3 of yesterday's leftovers + 1/4 五花肉, no lunch,
 * 3:53-5:25 PM legs (deadlift) at gym, dinner with friend at restaurant.
 *
 * Apple Watch: 1h32m workout, 706 cal total (559 active), HR avg 117 / max 158.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-05-01';

type FoodItem = { name: string; quantity: string; grams: number | null; calories: number; proteinG: number; carbsG: number; fatG: number; notes?: string };

const FOODS: FoodItem[] = [
  // Morning — 1/3 of yesterday's planned leftovers (no walnuts, no whey)
  { name: 'Chicken thigh (1/3 leftover)', quantity: '~95g raw', grams: 95, calories: 137, proteinG: 17, carbsG: 0, fatG: 8 },
  { name: 'Salmon w/ skin (1/3 leftover)', quantity: '~108g raw', grams: 108, calories: 228, proteinG: 22, carbsG: 0, fatG: 14 },
  { name: 'Sweet potato (1/3 leftover)', quantity: '~128g raw', grams: 128, calories: 111, proteinG: 2, carbsG: 26, fatG: 0 },
  { name: '1/3 whole egg', quantity: '~17g', grams: 17, calories: 23, proteinG: 2, carbsG: 0, fatG: 2 },
  { name: '菠菜 (1/3 leftover)', quantity: '~33g', grams: 33, calories: 8, proteinG: 1, carbsG: 1, fatG: 0 },
  { name: '香菇 (1/3 leftover)', quantity: '~33g', grams: 33, calories: 11, proteinG: 1, carbsG: 2, fatG: 0 },
  { name: '金针菇 (1/3 leftover)', quantity: '~33g', grams: 33, calories: 12, proteinG: 1, carbsG: 2, fatG: 0 },
  { name: '青椒五花肉 (leftover 1/4 dish)', quantity: '~350g portion', grams: 350, calories: 350, proteinG: 19, carbsG: 4, fatG: 33, notes: 'Apr 30 restaurant leftover, finished today' },

  // Dinner — restaurant with friend (estimated portions)
  { name: '酱猪肘 (~1/4 of dish)', quantity: '~150g cooked meat portion', grams: 150, calories: 430, proteinG: 33, carbsG: 5, fatG: 33, notes: 'Estimated portion of braised pork knuckle' },
  { name: '酸菜水饺 (~6 dumplings)', quantity: '~180g (6 pieces)', grams: 180, calories: 360, proteinG: 18, carbsG: 30, fatG: 18, notes: 'Sour cabbage pork dumplings, estimated 6 of shared portion' },
  { name: '京酱肉丝 (~1/3 dish)', quantity: '~100g cooked', grams: 100, calories: 230, proteinG: 18, carbsG: 8, fatG: 15, notes: 'Beijing-style shredded pork with sweet bean sauce, estimated 1/3 share' },
  { name: '米饭 几口', quantity: '~50g cooked rice', grams: 50, calories: 65, proteinG: 1, carbsG: 14, fatG: 0, notes: 'A few bites of white rice' },
];

type SetSpec = { weight: number | null; reps: number; warmup?: boolean; perSide?: boolean; notes?: string };

const DEADLIFT_SETS: SetSpec[] = [
  { weight: 25, reps: 8, warmup: true, perSide: true, notes: 'warmup' },
  { weight: 70, reps: 8, perSide: true, notes: 'working set 1' },
  { weight: 95, reps: 5, perSide: true, notes: 'ramp' },
  { weight: 105, reps: 2, perSide: true, notes: 'heavy double' },
  { weight: 110, reps: 2, perSide: true, notes: 'top double — strong work given low-carb fuel' },
];

async function main() {
  console.log(`=== Log May 1 actual (food + deadlift) ===\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) { console.log('No daily_log for ' + DATE); return; }

  // Wipe and replace food items
  await prisma.foodPlanItem.deleteMany({ where: { dailyLogId: dailyLog.id } });
  for (let i = 0; i < FOODS.length; i++) {
    const it = FOODS[i];
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
  const sumP = FOODS.reduce((s, f) => s + f.proteinG, 0);
  const sumC = FOODS.reduce((s, f) => s + f.carbsG, 0);
  const sumF = FOODS.reduce((s, f) => s + f.fatG, 0);
  const sumCal = FOODS.reduce((s, f) => s + f.calories, 0);
  console.log(`Wrote ${FOODS.length} food items: ${sumCal} kcal / ${sumP}P / ${sumC}C / ${sumF}F`);

  // Wipe and replace workout — log deadlift only (user said "main exercise deadlift")
  await prisma.workoutExercise.deleteMany({ where: { dailyLogId: dailyLog.id } });
  const deadliftEx = await prisma.exercise.upsert({
    where: { name: 'Deadlift' },
    update: {},
    create: { name: 'Deadlift', category: 'legs' },
  });
  await prisma.workoutExercise.create({
    data: {
      dailyLogId: dailyLog.id,
      exerciseId: deadliftEx.id,
      sortOrder: 0,
      notes: 'Apple Watch: 1h32m, 706 cal total (559 active), HR avg 117 / max 158. Top sets 一边105×2 and 一边110×2 — strong work on low-carb fuel after Apr 30 stress.',
      sets: { create: DEADLIFT_SETS.map((s, j) => ({
        setNumber: j + 1,
        weightLbs: s.weight,
        reps: s.reps,
        isWarmup: s.warmup ?? false,
        isPerSide: s.perSide ?? false,
        notes: s.notes ?? null,
      })) },
    },
  });
  console.log(`Wrote 1 exercise (Deadlift) with ${DEADLIFT_SETS.length} sets.`);

  // Update actuals
  await prisma.dailyLog.update({
    where: { id: dailyLog.id },
    data: {
      caloriesActual: sumCal,
      proteinActual: sumP,
      carbsActual: sumC,
      fatActual: sumF,
    },
  });
  console.log(`Updated daily_log actuals: ${sumCal}/${sumP}/${sumC}/${sumF}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
