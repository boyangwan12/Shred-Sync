/**
 * Pre-populate Apr 25 push day workout + session briefing.
 * CNS fresh (HRV 124, 9h 7min sleep Apr 24) + fuel abundant (post-refeed,
 * muscle ~78% / liver ~95%) = "add weight" scenario. Breaks from the Apr 21
 * "match weight" posture where fuel was only 41%.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-25';

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
    name: 'Bench Press',
    category: 'chest',
    notes:
      'Break the 一边70×5 plateau (stuck 2 sessions). Best fuel state since Apr 11 + CNS fresh. Target 一边75 for new top, then 一边70 for +1 rep.',
    sets: [
      { weight: 0, reps: 8, warmup: true, notes: 'empty bar' },
      { weight: 25, reps: 8, warmup: true, perSide: true },
      { weight: 50, reps: 5, warmup: true, perSide: true },
      { weight: 75, reps: 5, perSide: true, notes: 'NEW top' },
      { weight: 70, reps: 6, perSide: true },
      { weight: 70, reps: 6, perSide: true },
      { weight: 55, reps: 10, perSide: true, notes: 'back-off' },
    ],
  },
  {
    name: 'DB Incline',
    category: 'chest',
    notes:
      'Apr 17 top: 45 × 8. Today: match 45 for 2 sets, push 50 for a new top. Back-off at 40 for volume.',
    sets: [
      { weight: 30, reps: 10, warmup: true },
      { weight: 45, reps: 8 },
      { weight: 45, reps: 9, notes: '+1 rep' },
      { weight: 50, reps: 6, notes: 'NEW weight' },
      { weight: 40, reps: 10, notes: 'back-off' },
    ],
  },
  {
    name: 'Chest Fly Machine',
    category: 'chest',
    notes:
      'Apr 21: 100/sd × 8 × 4 (stale — no progression). +1 rep then weight bump.',
    sets: [
      { weight: 100, reps: 9, perSide: true },
      { weight: 100, reps: 9, perSide: true },
      { weight: 110, reps: 6, perSide: true, notes: 'NEW top' },
    ],
  },
  {
    name: 'Shoulder Press Machine',
    category: 'shoulders',
    notes:
      'Apr 21 was weak link: 一边45 × 4, 40 × 5, 35 × 4 (CNS + fuel low). Rebuild at 一边40 before pushing 45 next week.',
    sets: [
      { weight: 30, reps: 8, warmup: true, perSide: true },
      { weight: 40, reps: 8, perSide: true },
      { weight: 40, reps: 8, perSide: true },
      { weight: 35, reps: 10, perSide: true, notes: 'back-off' },
    ],
  },
  {
    name: 'Cable Lateral Raise',
    category: 'shoulders',
    notes:
      'Apr 21: 10 × 8 × 4 (stale). Bump to 12.5 for top sets.',
    sets: [
      { weight: 12.5, reps: 8 },
      { weight: 12.5, reps: 8 },
      { weight: 10, reps: 12, notes: 'back-off' },
    ],
  },
  {
    name: 'Cable Triceps',
    category: 'arms',
    notes:
      'Apr 21: 35 × 9,8,8,10,10 — endurance was strong. Load up: Apr 17 hit 50 × 8 top, target 50 × 9 today (+1 rep).',
    sets: [
      { weight: 35, reps: 12, warmup: true },
      { weight: 42.5, reps: 10 },
      { weight: 50, reps: 8 },
      { weight: 50, reps: 9, notes: '+1 rep new top' },
      { weight: 42.5, reps: 10, notes: 'back-off' },
    ],
  },
  {
    name: 'Cable Crunch',
    category: 'core',
    notes:
      'Apr 21 top: 72.5 × 10. Accessory + core = weight bump OK. Target 80 for new top.',
    sets: [
      { weight: 72.5, reps: 10 },
      { weight: 80, reps: 8, notes: 'NEW top' },
      { weight: 72.5, reps: 10, notes: 'back-off' },
    ],
  },
];

const BRIEFING = `=== Apr 25 push day — "add weight" scenario ===

This is the best training state since Apr 11:
• CNS fresh (HRV 124, 9h 7min sleep, deep 188min last night)
• Fuel abundant (liver 100% → ~95% overnight, muscle 71% → ~78%)
• 4 days since last push (Apr 21) — fully recovered

The unifying principle:
• CNS fresh + fuel low  → match weight, chase reps    (Apr 23 legs)
• CNS stale + fuel OK   → reduce weight, keep reps
• Both good             → add weight                  ← TODAY

This is the first time in the cut where both variables line up. Use it.

=== Comparison to last push (Apr 21) ===

Dimension                   | Apr 21 push  | Today (Apr 25)
----------------------------|--------------|------------------
Entering muscle glycogen    | 41%          | ~78% (+37 pts)
Entering liver glycogen     | 42%          | ~95%
HRV night before            | 141ms        | 124ms (both high)
Deep sleep night before     | 134 min      | 188 min ← new high
Carbs eaten day prior       | 65g (Apr 20) | 323g (Apr 24 refeed)

Last push you did well on willpower. Today you have fuel.

=== Per-exercise rationale ===

Bench Press: stuck at 一边70 × 5 for Apr 13, 17, 21. Today has the
conditions to break it. 一边75 × 5 for one top set, then drop to
一边70 for +1 rep across 2 sets. If 一边75 feels stiff, abort to
一边70 and keep the rep-chase intact — don't force a PR if bar
speed drops sharply.

DB Incline: Apr 17 top was 45 × 8. Apr 21 skipped this exercise.
Today: match 45 for 2 sets, push 50 for a 6-rep top set.

Chest Fly Machine: Apr 21 was stale (all 4 sets at 100/sd × 8 —
no progression attempt). Chase +1 rep on sets 1-2, weight jump
on set 3 (110/sd × 6).

Shoulder Press: the WEAK LINK on Apr 21 (collapsed from 一边45×4
to 35×4 in 3 sets). Don't chase 一边45 today — rebuild volume at
一边40 × 8 × 2. Push 45 NEXT push day when 40 is bulletproof.

Cable Lateral Raise: Apr 21 stuck at 10 × 8. Bump to 12.5 on
top sets, back off at 10 for high reps.

Cable Triceps: Apr 17 top was 50 × 8. Apr 21 did 35 × 9 volume
sets (endurance focus). Today's high-fuel state = chase 50 × 9
for +1 rep. New top.

Cable Crunch: Apr 21 top 72.5 × 10. Accessory core = weight
bump OK. 80 × 8 for new top.

=== Execution rules ===

• RPE target 7-8 on compounds, 8-9 on accessories
• If bar speed crashes on a "new top" attempt, bail and complete
  the set at the previous-best weight
• Rest 2-3 min on Bench/DB Incline, 1.5-2 min on accessories
• Total session: ~27 working sets, ~70 min
• Post-workout: 30g protein + 30g carbs (rice or sweet potato)

=== Tomorrow's forecast ===

If you execute the weight bumps cleanly, expect:
• Saturday morning (post-training) stiffness in delts, triceps
• Scale Sunday morning: 152.5-153.5 (still coming down from refeed
  water + some muscle inflammation water)
• Next push (Apr 29 probably): target 一边75 × 6 or 一边77.5 × 5 on
  bench if today's 一边75 × 5 lands cleanly

=== If things feel off ===

Abort the weight bumps and fall back to Apr 21's loads if:
• Morning HR >58
• HRV dropped below 80 overnight
• Any DOMS or stiffness interferes with first warmup set form
• Bar speed on 一边50 warmup feels heavy

Safety beats PR every single training day during a cut.
`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Pre-populate Apr 25 push day ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  // Create daily_log if missing — push/low day with standard targets
  const dailyLog = await prisma.dailyLog.upsert({
    where: { date: DATE },
    update: {},
    create: {
      date: DATE,
      dayType: 'push',
      carbType: 'low',
      caloriesTarget: 2100,
      proteinTarget: 153,
      carbsTarget: 100,
      fatTarget: 121,
    },
  });

  const existing = await prisma.workoutExercise.count({ where: { dailyLogId: dailyLog.id } });
  console.log(`Existing exercises: ${existing}`);
  const totalSets = PLAN.reduce((s, e) => s + e.sets.length, 0);
  const workingSets = PLAN.reduce((s, e) => s + e.sets.filter((x) => !x.warmup).length, 0);
  console.log(`Plan: ${PLAN.length} exercises / ${totalSets} sets total / ${workingSets} working\n`);
  for (const ex of PLAN) console.log(`  ${ex.name}: ${ex.sets.length} sets`);

  if (dryRun) {
    console.log('\nDry run — no writes.');
    return;
  }

  // Clear and repopulate exercises
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

  // Write briefing
  await prisma.dailyLog.update({
    where: { id: dailyLog.id },
    data: { notes: BRIEFING },
  });

  console.log(`\nWrote ${PLAN.length} exercises + briefing. Refresh /workout → Apr 25.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
