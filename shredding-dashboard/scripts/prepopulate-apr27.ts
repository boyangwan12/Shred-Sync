/**
 * Apr 27 legs (squat-focused) — moderate-carb day, NOT full refeed.
 * 130g carbs target (between low 100g and high 250g) since Apr 24 already
 * delivered the metabolic refeed. Goal: support squat performance without
 * triggering another big water bounce.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-27';

type SetSpec = {
  weight: number | null;
  reps: number;
  warmup?: boolean;
  perSide?: boolean;
  notes?: string;
};

const PLAN: Array<{
  name: string;
  category: string;
  notes: string;
  sets: SetSpec[];
}> = [
  {
    name: 'Squat',
    category: 'legs',
    notes:
      'Apr 19 squat day: 一边100 × 3, 3 (top), 一边70 × 8 back-off — but on 90g carbs and you underperformed. Today on 130g carbs: chase 一边100 × 4 on first heavy set, match × 3 on second. NOT a PR day (HRV 75) but the rep gain at same weight = real progress.',
    sets: [
      { weight: 0, reps: 8, warmup: true, notes: 'empty bar' },
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 50, reps: 5, warmup: true, perSide: true },
      { weight: 90, reps: 6, perSide: true, notes: '+1 rep vs Apr 19' },
      { weight: 95, reps: 5, perSide: true, notes: 'match Apr 19' },
      { weight: 100, reps: 4, perSide: true, notes: '+1 rep target vs Apr 19s 3' },
      { weight: 100, reps: 3, perSide: true, notes: 'match Apr 19' },
      { weight: 70, reps: 10, perSide: true, notes: 'back-off, +2 reps' },
    ],
  },
  {
    name: 'Belt Squat',
    category: 'legs',
    notes:
      'Apr 19: 25 × 8, 60 × 8. Small accessory — slight progression to 50/70 today.',
    sets: [
      { weight: 50, reps: 10 },
      { weight: 70, reps: 8 },
    ],
  },
  {
    name: 'Leg Press',
    category: 'legs',
    notes:
      'Apr 19 ramped to 310 × 8 top set. Today: chase 310 × 9 (+1 rep) on top set.',
    sets: [
      { weight: 150, reps: 12, warmup: true },
      { weight: 190, reps: 10 },
      { weight: 230, reps: 10, notes: '+2 reps vs Apr 19' },
      { weight: 270, reps: 8 },
      { weight: 310, reps: 9, notes: '+1 rep new top' },
    ],
  },
  {
    name: 'Back Extension Machine',
    category: 'back',
    notes:
      'Apr 19: 145 × 8/10, 160 × 8/8. Updated baseline says 175 working — push it today.',
    sets: [
      { weight: 160, reps: 10 },
      { weight: 175, reps: 8, notes: 'new top vs Apr 19s 160' },
      { weight: 175, reps: 8 },
    ],
  },
  {
    name: 'Single Leg Extension',
    category: 'legs',
    notes:
      'Apr 19: 100 × 8 × 3 (after 85 warmup). Stuck at 8-rep ceiling — chase +1 rep on first 2 sets.',
    sets: [
      { weight: 85, reps: 8, warmup: true },
      { weight: 100, reps: 9, notes: '+1 rep target' },
      { weight: 100, reps: 9 },
      { weight: 100, reps: 8 },
    ],
  },
  {
    name: 'Hip Adduction',
    category: 'legs',
    notes:
      'Apr 19: 145 × 10 × 2, 160 × 8 × 2. Updated baseline 175. Bump to 175 × 8 top.',
    sets: [
      { weight: 160, reps: 10 },
      { weight: 175, reps: 8, notes: 'new top' },
    ],
  },
  {
    name: 'Cable Crunch',
    category: 'core',
    notes:
      '80 × 8-9 confirmed PR weight (Apr 25 + Apr 26). Hit it again — pattern locked in.',
    sets: [
      { weight: 72.5, reps: 10 },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
    ],
  },
];

const BRIEFING = `=== Apr 27 legs (squat) — moderate-carb training day ===

NOT a full refeed today. Apr 24 already delivered the metabolic refeed
(323g carbs, leptin/T3 spike). Today: 130g carbs to fuel squat without
another water spike. Treat this like a "fueled push day" not "high-carb
legs day."

=== Five legs days compared ===

Date     | Variant         | Carbs | Weight | HRV   | Performance
---------|-----------------|-------|--------|-------|----------------
Apr 7    | deadlift        | 95g   | 153.3  | 71    | early-cut establish
Apr 11   | squat-style DL  | 258g  | 152.4  | 60    | best refeed, strong
Apr 15   | deadlift        | 165g  | 152.6  | 51    | under-eaten, mild
Apr 19   | SQUAT (PR test) | 90g   | 153.3  | (gap) | underperformed (一边100×3)
Apr 23   | deadlift (low)  | 92g   | 151.5  | 124   | followed plan, no PR
Today    | SQUAT moderate  | 130g  | ~152   | 75 yest | match weight, chase reps

=== Today's setup ===

You have:
• Mid-fuel state (carbs 130g — between low and high)
• OK CNS (HRV 75 — yellow light, but you executed pull cleanly today)
• High cumulative load (yesterday push + 2hr walk + today pull all
  added stress)
• Bodyweight elevated (~152 forecast — water still clearing from Apr 25)

Today's job: do Apr 19's squat session BETTER (more reps at same
weights), but without the under-fueled performance crash. Fuel timing
matters: 50g carbs pre-workout, 50g post, rest spread.

=== Why 130g, not 250g ===

The fuel-vs-performance curve isn't linear. Most of the squat-day
benefit comes from the FIRST 100g carbs (glycogen-bound water in legs
+ blood glucose for sets). Going from 100g to 250g adds water without
much performance gain unless you're going for a maximal effort PR.

130g splits the difference: enough for top sets + the 1-rep chase, not
enough to bounce the scale 3 lb tomorrow.

=== Why match-weight, not PR ===

HRV 75 (yesterday morning) is yellow-light territory. Today's evening
HRV unknown but probably similar given 2hr walk + pull session
recovery cost. Squat at 一边100 needs CNS readiness. Even with
moderate carbs, attempting a heavier weight than Apr 19 (一边105) on
HRV 75 is high-risk-low-reward.

But +1 rep at 一边100 = real progressive overload signal. Apr 19 hit
3 reps; today targeting 4. If you hit 4 cleanly, next legs day gets
green-lit for 一边105 attempt.

=== Per-exercise rationale ===

Exercise              | Today's target           | vs Apr 19   | Why
----------------------|--------------------------|-------------|------------
Squat                 | 100/sd × 4 top, 100/sd × 3 | 100/sd × 3,3 | +1 rep, same weight
Belt Squat            | 50, 70 × 8-10            | 25, 60      | Small progression
Leg Press             | 310 × 9 top              | 310 × 8     | +1 rep top
Back Extension        | 175 × 8 × 2              | 160 × 8 × 2 | +15 lb (baseline updated)
Single Leg Extension  | 100 × 9 × 2              | 100 × 8 × 3 | +1 rep (rep ceiling)
Hip Adduction         | 175 × 8 top              | 160 × 8     | +15 lb (baseline updated)
Cable Crunch          | 80 × 8 × 2               | 72.5        | PR weight maintained

=== Bail criteria ===

If any of these during warmup, drop weights 5-10%:
• Squat 一边50 warmup feels heavy/sluggish
• Lower-back twinges (yesterday's barbell curl loaded spine)
• Knee tracking off (key on heavy squat day)
• HRV this morning <60 (red light — switch to leg press only)
• Energy <2/5

If bail mid-session: finish leg press + accessories. Skip the squat
top sets. One missed PR attempt is nothing.

=== Forecast ===

If you execute cleanly (130g carbs, last meal by 7 PM, sleep midnight):
• Apr 28 morning weight: 151.5-152.0 (small water bump from carbs)
• Apr 28 HRV: 90-110 (legs day cardio kick + recovery night)
• Apr 29 morning: 150.8-151.5 (water clearing + real fat loss)
• 7-day avg by Apr 30: ~152.0-152.3 (down from today's 152.83)

If carbs land late (after 8 PM): expect HRV drop similar to Apr 25
morning. Don't repeat that mistake.

=== Carb timing for today ===

Apr 27 carb plan (130g total):
• Breakfast (~9 AM): 30g (oats + fruit)
• Pre-workout (1h before): 30g (banana + black coffee)
• Post-workout (within 30 min): 50g (rice or sweet potato)
• Dinner (6-7 PM): 20g (small amount with protein)

Last food by 7 PM. Light dinner, NOT another rice/noodle bowl.
`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Apr 27 legs (squat) — moderate-carb ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: {
      caloriesTarget: 1800,
      proteinTarget: 153,
      carbsTarget: 130,
      fatTarget: 80,
      carbType: 'low',
    },
    create: {
      date: DATE,
      dayType: 'legs',
      carbType: 'low',
      caloriesTarget: 1800,
      proteinTarget: 153,
      carbsTarget: 130,
      fatTarget: 80,
    },
  });

  const totalSets = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Targets: 1800 kcal / 153P / 130C / 80F`);
  console.log(`Plan: ${PLAN.length} exercises / ${totalSets} sets / ${workingSets} working\n`);
  for (const ex of PLAN) console.log(`  ${ex.name}: ${ex.sets.length} sets`);

  if (dryRun) {
    console.log('\nDry run — no writes.');
    return;
  }

  await prisma.workoutExercise.deleteMany({ where: { dailyLogId: dailyLog.id } });
  for (let i = 0; i < PLAN.length; i++) {
    const ex = PLAN[i];
    const exerciseRow = await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: { name: ex.name, category: ex.category },
    });
    await prisma.workoutExercise.create({
      data: {
        dailyLogId: dailyLog.id,
        exerciseId: exerciseRow.id,
        sortOrder: i,
        notes: ex.notes,
        sets: {
          create: ex.sets.map((s, j) => ({
            setNumber: j + 1,
            weightLbs: s.weight,
            reps: s.reps,
            isWarmup: s.warmup ?? false,
            isPerSide: s.perSide ?? false,
            notes: s.notes ?? null,
          })),
        },
      },
    });
  }

  await prisma.dailyLog.update({ where: { id: dailyLog.id }, data: { notes: BRIEFING } });
  console.log(`\nWrote ${PLAN.length} exercises + briefing.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
