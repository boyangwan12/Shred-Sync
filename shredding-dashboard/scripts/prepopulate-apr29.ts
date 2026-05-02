/**
 * Apr 29 push day preload + briefing.
 *
 * Context: Apr 28 was rest day with elevated cumulative stress (work +
 * emotional fight + 1h nap at 7 PM). HRV will likely come in YELLOW
 * (80-100 ms). Plan is match-only — same weights as Apr 25, no
 * progressions queued. Morning HRV at 7:15 AM round will determine
 * whether to deload further.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-29';

type SetSpec = { weight: number | null; reps: number; warmup?: boolean; perSide?: boolean; notes?: string };

const PLAN: Array<{ name: string; category: string; notes: string; sets: SetSpec[] }> = [
  {
    name: 'Bench Press',
    category: 'chest',
    notes: 'Match Apr 25: 一边70 × 6, 6, 5 + 一边55 × 6 back-off. NO PR attempts (HRV will be yellow). If first 一边70 set feels heavy or speed crashes, drop to 一边65.',
    sets: [
      { weight: 0, reps: 8, warmup: true, notes: 'empty bar' },
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 50, reps: 5, warmup: true, perSide: true },
      { weight: 70, reps: 6, perSide: true, notes: 'match Apr 25' },
      { weight: 70, reps: 6, perSide: true, notes: 'match Apr 25' },
      { weight: 70, reps: 5, perSide: true, notes: 'match Apr 25' },
      { weight: 55, reps: 6, perSide: true, notes: 'back-off match' },
    ],
  },
  {
    name: 'DB Incline',
    category: 'chest',
    notes: 'Apr 25: 45 × 8 × 3 + 40 × 8. Match exactly.',
    sets: [
      { weight: 30, reps: 10, warmup: true },
      { weight: 45, reps: 8 },
      { weight: 45, reps: 8 },
      { weight: 45, reps: 8 },
      { weight: 40, reps: 8 },
    ],
  },
  {
    name: 'Chest Fly Machine',
    category: 'chest',
    notes: 'Apr 25: 100/sd × 9 × 3. Match.',
    sets: [
      { weight: 100, reps: 9, perSide: true },
      { weight: 100, reps: 9, perSide: true },
      { weight: 100, reps: 9, perSide: true },
    ],
  },
  {
    name: 'Shoulder Press Machine',
    category: 'shoulders',
    notes: 'Apr 25: 一边50 × 8, 6 + 35 back-off. Match — 一边55 next time only on green-light HRV.',
    sets: [
      { weight: 30, reps: 8, warmup: true, perSide: true },
      { weight: 50, reps: 8, perSide: true },
      { weight: 50, reps: 6, perSide: true },
      { weight: 35, reps: 10, perSide: true, notes: 'back-off' },
    ],
  },
  {
    name: 'Cable Lateral Raise',
    category: 'shoulders',
    notes: 'Apr 25: 15 × 8 (PR weight). Match — confirm pattern.',
    sets: [
      { weight: 10, reps: 9 },
      { weight: 15, reps: 8 },
      { weight: 10, reps: 12, notes: 'back-off' },
    ],
  },
  {
    name: 'Cable Triceps',
    category: 'arms',
    notes: 'Apr 25: 50 × 6 (regressed from earlier 50×8). Match — re-test the regression.',
    sets: [
      { weight: 35, reps: 10, warmup: true },
      { weight: 42.5, reps: 10 },
      { weight: 50, reps: 6 },
      { weight: 35, reps: 8 },
      { weight: 35, reps: 8 },
    ],
  },
  {
    name: 'Cable Crunch',
    category: 'core',
    notes: '80 × 8 confirmed PR weight. Match.',
    sets: [
      { weight: 72.5, reps: 10 },
      { weight: 80, reps: 8 },
      { weight: 72.5, reps: 10 },
    ],
  },
];

const BRIEFING = `=== Apr 29 push day — match-only, stress-yellow ===

Yesterday (Apr 28) was a rest day on paper but loaded with stressors:
work was tough, you had a big fight with your best friend, and you
took an hour nap at 7 PM. Cortisol pulse from emotional stress is
the same as physical stress — your CNS doesn't distinguish.

HRV forecast for tomorrow: 80-100 ms (down from 100 today, which was
already down from 152 on Apr 27). The trajectory is suppressed.

Today's job: match-only execution. NO PR attempts. NO weight
progressions. Same weights as Apr 25, same rep targets.

=== HRV-based decision tree (check 7:15 AM checkin) ===

GREEN  (HRV ≥120, sleep ≥7h, energy ≥4):
  → unexpected; execute the plan as written
  → reconsider one progression: 一边75 bench top set OR 一边55 shoulder press
     (only ONE, not both)

YELLOW (HRV 70-119, mixed signals):
  → execute the plan as written (match-only)
  → no progressions, focus on bar speed + clean reps

RED    (HRV <70 OR sleep <5h OR energy ≤2):
  → drop bench top set to 一边65 × 6 instead of 一边70
  → skip Cable Triceps OR drop to 50 × 4 only
  → cap Cable Crunch at 72.5 × 10 × 2 (skip the 80)
  → leave the gym ahead of fatigue, not behind it

=== Apr 25 reference (your last push) ===

Apr 25 you were at HRV 71 (yellow) and pulled off:
- Bench 一边70 × 6, 6, 5 (you held it together)
- DB Incline 45 × 8 × 3
- Shoulder Press 一边50 × 8, 6
- Cable Lat Raise 15 × 8 (PR weight, confirmed)
- Cable Triceps 50 × 6 (regressed from 50 × 8 on Apr 17)
- Cable Crunch 80 × 8 (PR weight)

Total volume: 10,375 lbs across 24 working sets — your highest push
ever. Today is match-this-volume, not exceed-it.

=== Tonight's prediction ledger ===

Apr 29 morning weight forecast: 150.8-151.2 lb
  - Continued cut momentum from rest day deficit
  - No water bounce expected (rest day, no glycogen depletion+refill cycle)

Apr 29 morning HRV forecast: 80-100 ms
  - Stress from today is the swing variable
  - If sleep is fragmented from emotional residue + 7 PM nap, expect lower

Apr 29 sleep forecast: 7.0-7.5h, deep 80-110 min
  - Below your peak (157 min on Apr 27)
  - Emotional residue + nap will compress deep sleep window

These predictions go in the falsifiable accuracy ledger. Track actual
vs predicted in the morning checkin.

=== Pre-workout / carb timing ===

4:00 PM: ~150g raw sweet potato (~30g carbs) for blood glucose at
top sets. 60 min before workout = peak glucose during heavy bench.

5:00-6:30 PM: Workout. Bench first while CNS is freshest.

7:00 PM: Dinner = single meal (post-workout refuel + dinner combined).
~320g raw sweet potato + remaining proteins + veggies.

7:30 PM: Finish eating. Hard cutoff 7:45 PM.

=== Bail criteria during the session ===

Drop or stop early if:
- Bench bar speed crashes from set 1 to set 2 (CNS not recovered)
- Lat raise feels like rotator cuff stress instead of delt isolation
- Lower back twinges on shoulder press (yesterday's ribs were heavy
  on the lower spine — be aware)
- Energy <2/5 by exercise 4
- Sharp pain anywhere — stop the session, finish another day

If you bail mid-session, finish the cable work (low CNS cost) so
the day isn't a total loss.

=== Tone for the day ===

You had a hard day. Tomorrow's training shouldn't be punishment OR
escape — just clean execution at established weights. Match Apr 25.
The cut is working (151.3 today, dropping). Trust the protocol,
don't try to prove anything in the gym.

If you need to talk to your friend tomorrow, the lift can wait. Or
do the lift to clear your head, but don't load extra emotional
weight onto the bar.
`;

async function main() {
  console.log(`=== Pre-populate Apr 29 push day ===\n`);

  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: { dayType: 'push', carbType: 'low', caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88 },
    create: { date: DATE, dayType: 'push', carbType: 'low', caloriesTarget: 1800, proteinTarget: 153, carbsTarget: 100, fatTarget: 88 },
  });

  const totalSets = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Plan: ${PLAN.length} exercises / ${totalSets} sets / ${workingSets} working`);
  for (const ex of PLAN) console.log(`  ${ex.name}: ${ex.sets.length} sets`);

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
        sets: { create: ex.sets.map((s, j) => ({
          setNumber: j + 1,
          weightLbs: s.weight,
          reps: s.reps,
          isWarmup: s.warmup ?? false,
          isPerSide: s.perSide ?? false,
          notes: s.notes ?? null,
        })) },
      },
    });
  }

  await prisma.dailyLog.update({ where: { id: dailyLog.id }, data: { notes: BRIEFING } });
  console.log(`\nWrote ${PLAN.length} exercises + briefing (${BRIEFING.length} chars).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
