/**
 * Apr 29 RED deload revision.
 *
 * Morning data crashed: HRV 57 (was forecast 80-100), sleep 5.8h
 * (forecast 7-7.5h), bedtime 2:45 AM. RED signal per protocol.
 *
 * Changes:
 *  - Bench Press → Chest Machine Incline (machine, less CNS demand)
 *  - All weights reduced 10-17%
 *  - Cable Triceps removed entirely (regressed last session)
 *  - Volume drops from 24 → 13 working sets (~46% reduction)
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-29';

type SetSpec = { weight: number | null; reps: number; warmup?: boolean; perSide?: boolean; notes?: string };

const PLAN: Array<{ name: string; category: string; notes: string; sets: SetSpec[] }> = [
  {
    name: 'Chest Machine Incline',
    category: 'chest',
    notes: 'RED deload — replaces Bench Press for safety + reduced CNS demand. Apr 21 (HRV 63 yellow): 60/sd × 8-9. Today (HRV 57 RED): drop to 50/sd × 8 × 3. If 50/sd warmup feels easy → set 2-3 = 55/sd × 8. If heavy → 45/sd × 8 × 2 only.',
    sets: [
      { weight: 30, reps: 10, warmup: true, perSide: true },
      { weight: 50, reps: 8, perSide: true, notes: 'match-light' },
      { weight: 50, reps: 8, perSide: true },
      { weight: 50, reps: 8, perSide: true },
      { weight: 40, reps: 10, perSide: true, notes: 'back-off' },
    ],
  },
  {
    name: 'DB Incline',
    category: 'chest',
    notes: 'RED deload — drop from 45 × 8 × 4 to 40 × 8 × 3. -10% weight, -1 set.',
    sets: [
      { weight: 25, reps: 10, warmup: true },
      { weight: 40, reps: 8 },
      { weight: 40, reps: 8 },
      { weight: 40, reps: 8 },
    ],
  },
  {
    name: 'Chest Fly Machine',
    category: 'chest',
    notes: 'RED deload — drop from 100/sd × 9 × 3 to 90/sd × 9 × 3.',
    sets: [
      { weight: 90, reps: 9, perSide: true },
      { weight: 90, reps: 9, perSide: true },
      { weight: 90, reps: 9, perSide: true },
    ],
  },
  {
    name: 'Shoulder Press Machine',
    category: 'shoulders',
    notes: 'RED deload — drop from 一边50 × 8/6 to 一边45 × 8 × 2. -10% weight, -1 working set.',
    sets: [
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 45, reps: 8, perSide: true },
      { weight: 45, reps: 8, perSide: true },
    ],
  },
  {
    name: 'Cable Lateral Raise',
    category: 'shoulders',
    notes: 'RED deload — skip the 15 PR weight, single working set at 10 × 12. Save the PR for green-light day.',
    sets: [
      { weight: 10, reps: 12 },
    ],
  },
  {
    name: 'Cable Crunch',
    category: 'core',
    notes: 'RED deload — skip the 80 PR weight, cap at 72.5 × 10 × 2.',
    sets: [
      { weight: 72.5, reps: 10 },
      { weight: 72.5, reps: 10 },
    ],
  },
];

const BRIEFING_RED = `=== Apr 29 push day — 🔴 RED DELOAD (revised in real time) ===

Morning data came in worse than forecast:
- HRV 57 ms (forecast was 80-100; actual is 23 ms below the floor)
- Sleep 5h 49m (forecast 7-7.5h; bedtime 2:45 AM was 4 hours past target)
- Deep sleep 136 min (HIGH — body prioritized depth over duration)
- Weight 150.0 lb (forecast 150.8-151.2; ahead of plan)

The HRV crash is the swing variable. RED zone (<70) means:
  → drop top set load
  → skip 1 accessory
  → cap PR-weight sets

=== Why machine instead of bench ===

Free-weight bench at 一边70 demands CNS recruitment + spotter
trust. RED day with HRV 57 = neither is safe. Chest Machine Incline
keeps the chest stimulus, removes the spotter risk, allows clean
controlled eccentric, and lets you abandon mid-set if needed.

Apr 21 (HRV 63, yellow) you hit 60/sd × 8-9 cleanly on this same
machine. Today (HRV 57) we drop to 50/sd × 8 × 3 (-17%).

=== Bail criteria (lower than usual today) ===

Drop or stop if:
- 50/sd warmup feels heavy → drop to 45/sd × 8 × 2 only, then move on
- Bar speed crashes between sets 1-2 → finish that exercise, skip
  next 1-2 exercises, do only cable work
- Energy <2/5 by exercise 3 → stop the session, leave
- Any joint pain (rotator cuff especially with HRV this low) → stop
- Mood crashes mid-session → leave, today isn't worth it

If you bail, finish at least the cable work. If you really can't,
walking out is also fine — your cut is ahead of plan, you owe the
gym nothing today.

=== What the cut looks like right now ===

Apr 29 morning: 150.0 lb (-1.3 from yesterday)
7-day rolling avg: ~151.5 lb (will drop notably today's data point hits)
vs original plan: AHEAD by ~0.8 lb at week 3.3

The tightening from Apr 26 worked. The cut is on track.
Today's HRV crash is from yesterday's stress + late bedtime, not
from over-aggression in the diet.

=== Tone for today ===

Yesterday was hard for non-training reasons. Today's job isn't to
prove anything — it's to show up, do reduced volume cleanly, leave
the gym feeling slightly better than when you arrived. The 7-day
rolling fat loss is happening regardless of today's session.

If you're not feeling it: walk for 30 min, stretch, mobility, eat
the planned food, sleep clean tonight. Active recovery counts.
`;

async function main() {
  console.log(`=== Apr 29 RED deload revision ===\n`);

  const dailyLog = await prisma.dailyLog.findUnique({ where: { date: DATE } });
  if (!dailyLog) { console.log('No daily_log for ' + DATE); return; }

  // Wipe existing workoutExercises
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

  // Update briefing
  await prisma.dailyLog.update({ where: { id: dailyLog.id }, data: { notes: BRIEFING_RED } });

  const total = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const working = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Wrote ${PLAN.length} exercises / ${total} sets / ${working} working sets`);
  for (const ex of PLAN) console.log(`  ${ex.name}: ${ex.sets.length} sets`);
  console.log(`\nBriefing: ${BRIEFING_RED.length} chars`);
  console.log(`Volume reduction: 24 → ${working} working sets (-${Math.round((1 - working/24)*100)}%)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
