/**
 * Revise the Apr 25 briefing after the HRV drop. Match-weight + chase-reps
 * scenario instead of add-weight. Update weight (155.8) too.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-25';

const BRIEFING = `=== Apr 25 push day — REVISED after morning data ===

Forecast last night (before HRV CSV came in): "add weight" scenario.
Reality this morning: HRV dropped 153 → 71, deep sleep 188 → 75 min,
bodyweight +4 lb water. Plan revised to match-weight + chase-reps.

=== The four push days compared ===

Dimension                | Apr 13  | Apr 17  | Apr 21    | Today (Apr 25)
-------------------------|---------|---------|-----------|------------------
Bodyweight (morning)     | 154.8   | 152.6   | 152.6     | 155.8 (+water)
Carb intake that day     | 90g     | 115g    | 102g      | 100g target
Muscle glycogen entering | 66%     | 55%     | 41%       | 66% (refeed)
Liver glycogen           | 53%     | 50%     | 42%       | 73% (refeed)
Sleep last night         | 5.7h    | 8.8h    | 7.2h      | 9.2h
Deep sleep               | 44 min  | 132 min | 134 min   | 75 min ← LOW
HRV last night           | 88 ms   | 83 ms   | 141 ms    | 71 ms ← BIG DROP
Waking HR                | 52      | 51      | 49        | 52
Prior 6-day volume       | low     | modest  | high      | 64,648 lbs / 101 sets

=== What you actually pulled on those days ===

• Apr 13: 一边70 × 5 (top), 4 working sets, bench plateau begins
• Apr 17: 一边70 × 6 (top), 一边55 × 8 back-off, DB Incline 45 × 8 top
• Apr 21: 一边70 × 5, 5, 5, 一边55 × 6 (no progression at all)
• Today plan: 一边70 × 6 × 4 (match weight, chase 1-rep on each set)

=== Today's setup — a contradiction ===

You have:
• Best fuel state of any push day (muscle 66%, liver 73% from refeed)
• Worst CNS state of any push day (HRV 71, deep sleep 75 min)
• Large prior-week volume (64k lbs accumulated)
• Body in active recovery/cleanup mode from yesterday's refeed

Ordinarily fuel + CNS would both be needed for a PR attempt. Today's
profile is fuel-but-no-CNS — meaning the hardware is fueled but the
software isn't ready to fire heavy.

=== Why NOT 一边75 today ===

Last night's call was based on Apr 24's HRV 153 + deep 188 min — a green
light state. This morning's HRV 71 is at your absolute baseline (Apr 7
was 71). It's a yellow light, not green.

The fuel-vs-weight curve still applies, but with HRV factored in:
• HRV >120 + muscle >60% → can chase weight (yesterday's expectation)
• HRV 70-120 + muscle >60% → match weight, chase reps (today)
• HRV <70 + any fuel state → reduce weight, deload

A 一边75 PR attempt on HRV 71 with bodyweight up 4 lb (cortisol
hydration signal) is the recipe for a stalled lift or a tweaked rotator
cuff. Defer to next push.

=== Why 一边70 × 6 × 4 IS still progress ===

Apr 21 was 5, 5, 5, 6 (one set hit 6) = 21 working reps at 一边70
Today's target: 6, 6, 6, 6 = 24 working reps at 一边70

That's +3 reps at the same weight = +14% volume on the working bench.
Real progressive overload signal without CNS load. If 一边70 × 6 lands
clean across all 4 sets, the next push day is cleared to attempt 一边75
× 5 with confidence.

=== Per-exercise rationale (all revised) ===

Exercise         | Last         | Today          | Why
-----------------|--------------|----------------|-------------------------
Bench Press      | 70/sd ×5,5,5,(6) | 70/sd × 6 × 4 | Match weight, +3 reps
DB Incline       | (Apr 17) 45×8| 45 × 8, 9, 9   | Match Apr 17 + 2 reps
Chest Fly        | 100/sd × 8 × 4 | 100/sd × 9 × 3 | +1 rep, no weight bump
Shoulder Press   | 40 collapsed | 40 × 8 × 2     | Rebuild, NOT chase 45
Cable Lateral    | 10 × 8 × 4   | 12.5 × 8 × 2   | Small bump (accessory OK)
Cable Triceps    | 35 × 10 × 4  | 50 × 9         | +1 rep top (accessory)
Cable Crunch     | 72.5 × 10    | 80 × 8         | Weight bump (core, fine)

Compounds get rep progression only. Accessories keep small weight bumps
because their CNS cost is low — those don't blow up on HRV 71.

=== Bail criteria ===

Drop EVERY weight by 5-10% if any of these show during warmup:
• Bar speed on 一边50 warmup feels heavy
• Energy <2/5 by warmup completion
• Any joint stiffness that doesn't clear after 2 warmup sets
• Bodyweight scale read this morning (155.8) feels in your body —
  i.e. visible puffiness, sluggishness, foggy

Defer to Apr 29's push if you abort. One missed PR attempt is nothing.

=== The unifying principle (refined with HRV layer) ===

Two-axis decision instead of fuel-only:

              Fuel HIGH (muscle >60%)    Fuel LOW (muscle <50%)
HRV HIGH      ADD WEIGHT  (Apr 24      MATCH WEIGHT, chase reps
              would have been ideal)    (Apr 23 legs day)
              -----------               -----------
HRV LOW       MATCH WEIGHT, chase reps  REDUCE WEIGHT or rest
              (TODAY)                   (deload week territory)

You're in the upper-right of the matrix today, not upper-left like I
thought yesterday. Same session-shape, different weights.

=== Forecast ===

If you execute 一边70 × 6 × 4 cleanly:
• Tomorrow's HRV: rebound to 95-110 if you eat early + low-sodium
• Apr 29 push: green-lit for 一边75 × 5 attempt
• Bench plateau breaks within 2 sessions

If you push 一边75 today and miss:
• HRV stays suppressed 2-3 days
• Recovery from this session takes 4 days instead of 3
• Apr 29 push may itself be a deload
`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Apr 25 — revising briefing + setting weight 155.8 (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  if (dryRun) return;

  await prisma.dailyLog.update({
    where: { date: DATE },
    data: {
      notes: BRIEFING,
      weightLbs: 155.8,
    },
  });
  console.log('Done.');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
