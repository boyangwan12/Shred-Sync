/**
 * Populate the Apr 23 session briefing (daily_logs.notes), which the workout
 * page renders as a collapsible Session Briefing section.
 */

import { prisma } from '../src/lib/db';

const DATE = '2026-04-23';

const BRIEFING = `=== The three deadlift days compared ===

Dimension                   | Apr 7    | Apr 15  | Today (Apr 23)
----------------------------|----------|---------|------------------
Day in cut                  | Day 1    | Day 9   | Day 17
Bodyweight                  | 153.3    | 152.6   | 151.5
Carb intake that day        | 95g      | 165g    | 92.9g
Muscle glycogen entering    | 74%      | 57%     | 42% ← lowest
Liver glycogen              | 61%      | 65%     | 49%
Fat oxidation               | 42%      | 36%     | 53% ← highest
HRV last night              | 71ms     | 51ms    | 124ms ← highest
Deep sleep                  | 66min*   | 142min  | 151min ← highest
Waking HR                   | 50       | 50      | 49 (below baseline)
Prior 6-day training volume | ~0       | modest  | 74,695 lbs / 147 sets

* Apr 7 sleep data likely placeholder, not real watch reading.

=== What you actually pulled on those days ===

• Apr 7:  一边70 × 8, 8, 8, then 一边75 × 8  ← strongest session
• Apr 15: 一边70 × 5, 5, 6, 6                ← weaker, couldn't sustain reps
• Gap: same weight, 40% fewer reps on Apr 15.

=== The physiological story ===

Why Apr 7 crushed Apr 15:
Muscle glycogen 74% vs 57% — you had 30% more local fuel. That's why
一边70 × 8 was easy on Apr 7 but capped at 5–6 on Apr 15.

Why Apr 15 was weaker than expected despite being 9 days in:
HRV was 51ms (very low) — nervous system was compromised from Apr 13
push + Apr 14's massive 12-exercise pull session the day before. Both
glycogen AND CNS were depleted entering that session.

=== Today's setup — a contradiction ===

You have:
• Worst glycogen state of the three (42% muscle — lowest entering fuel)
• Best nervous system state of the three (HRV 124ms, deep sleep 151min)
• Highest cumulative fatigue (6 training days in the past week, 74k volume)

This means:
• CNS can drive the weight — your nerves can move 一边70 without stress
• Muscles will gas faster — glycogen depletion = earlier rep failure
• You're NOT going to PR — fuel is the limiter, not strength

=== Why 一边70 (and NOT 一边75) ===

Historical fuel-vs-weight curve:
• At 74% glycogen (Apr 7):  一边75 × 8 was achievable
• At 57% glycogen (Apr 15): 一边70 × 5 was the ceiling
• At 42% glycogen (today):  一边70 × 5–6 is the expected zone

一边75 today would put you below Apr 15's already-reduced performance.
Risk/reward is negative — higher injury chance, lower completion, zero
meaningful signal. 一边70 is the fair progression target.

=== Why 4 sets × 6 reps ===

6 reps per set — Apr 15's ceiling (you hit 6 on sets 3 and 4). Matching
sets 1 and 2 at 6 (up from 5) = +2 reps of total work = real progressive
overload without needing more weight. CNS advantage over Apr 15 makes
the extra reps achievable.

4 sets — both Apr 7 and Apr 15 had 4 working sets. Keeps volume
comparable. 5 sets on top of the 74k accumulated in the past 6 days
would push into recovery-debt territory.

=== Same logic applied across the session ===

Exercise      | Last session          | Today's target   | Rationale
--------------|-----------------------|-------------------|----------
Deadlift      | Apr 15: 一边70 × 5,5,6,6 | 一边70 × 6,6,6,6 | Same weight, +1 rep
RDL           | Apr 15: 一边25 × 8–9     | 一边35 × 8 × 4   | Reset (Apr 15 was anomaly)
Hip Thrust    | Apr 15: 90/sd × 5 top   | 90/sd × 6        | +1 rep at same weight
Leg Curl      | Apr 15: 100 × 8,8,8,8   | 100 × 9,9,8      | +1 rep ceiling chase
Back Ext      | Apr 19: 160 × 8         | 175 × 8          | +15 lb (accessory, clean progression)
Hip Adduction | Apr 19: 160 × 8         | 175 × 8          | +15 lb (same rationale)

=== The unifying principle ===

• CNS fresh, fuel low  → match weight, chase reps    ← today
• CNS stale, fuel OK   → reduce weight, keep reps
• Both good            → add weight

Today is scenario 1. Every compound lift reuses last session's working
weight with a +1 rep target instead of adding load. Back Extension and
Hip Adduction get weight bumps because they're accessory machines (low
systemic cost) AND they showed clean progression without regression —
they're not glycogen-limited the same way hip-hinge compounds are.

Bottom line: "Do Apr 15's session, but two reps better per deadlift set,
and reclaim the RDL weight." Calibrated to a body with more recovery
than fuel.
`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Setting session briefing for ${DATE} (${BRIEFING.length} chars)`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  if (dryRun) return;

  await prisma.dailyLog.update({
    where: { date: DATE },
    data: { notes: BRIEFING },
  });
  console.log('Done. Refresh the workout page.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
