/**
 * Backfill glycogen values (one-time).
 *
 * Recomputes `liverGlycogenPct`, `muscleGlycogenPct`, and `fatBurningPct` on
 * every `DailyLog` row using the glycogen-v1 model. This brings stored DB
 * values into alignment with the new `MUSCLE_MAX=400` calibration so direct
 * DB queries return values consistent with compute-on-read.
 *
 * The API routes `/api/logs` and `/api/cycle-analysis` perform compute-on-read
 * anyway, so after backfill both paths agree.
 *
 * Usage (dev):     npx tsx scripts/backfill-glycogen.ts
 * Usage (prod):    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/backfill-glycogen.ts
 *
 * Add --dry-run to print the plan without writing.
 */

import { prisma } from '../src/lib/db';
import { simulateGlycogen } from '../src/lib/glycogen';
import { fetchGlycogenInputs } from '../src/lib/glycogen-data';

const START_DATE = '2026-04-07';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const today = new Date().toISOString().split('T')[0];

  const dbLabel = process.env.TURSO_DATABASE_URL ? 'TURSO (PRODUCTION)' : 'dev.db (LOCAL)';
  console.log(`\n=== Glycogen backfill ===`);
  console.log(`DB: ${dbLabel}`);
  console.log(`Range: ${START_DATE} → ${today}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'WRITE'}\n`);

  const inputs = await fetchGlycogenInputs(START_DATE, today);
  if (inputs.length === 0) {
    console.log('No daily logs in range. Nothing to backfill.');
    return;
  }

  const outputs = simulateGlycogen(inputs);
  console.log(`Simulated ${outputs.length} days.`);

  let workoutDataMissingCount = 0;
  let carbsFromTargetCount = 0;

  for (const out of outputs) {
    if (out.workoutDataMissing) workoutDataMissingCount++;
    if (out.carbsFromTarget) carbsFromTargetCount++;
  }

  console.log(`  Days with workoutDataMissing: ${workoutDataMissingCount}`);
  console.log(`  Days with carbsFromTarget:    ${carbsFromTargetCount}\n`);

  // Show first / last samples for sanity checking
  const sample = [outputs[0], outputs[Math.floor(outputs.length / 2)], outputs[outputs.length - 1]]
    .filter((v, i, a) => v && a.indexOf(v) === i);
  console.log('Sample outputs:');
  for (const s of sample) {
    console.log(
      `  ${s.date} (${s.workoutDataMissing ? 'MISSING' : 'ok'}) ` +
      `liver=${s.liverGlycogenPct}% muscle=${s.muscleGlycogenPct}% fat=${s.fatBurningPct}%`,
    );
  }
  console.log();

  if (dryRun) {
    console.log('Dry run — no writes performed.');
    return;
  }

  let updated = 0;
  for (const out of outputs) {
    await prisma.dailyLog.update({
      where: { date: out.date },
      data: {
        liverGlycogenPct: out.liverGlycogenPct,
        muscleGlycogenPct: out.muscleGlycogenPct,
        fatBurningPct: out.fatBurningPct,
      },
    });
    updated++;
  }

  console.log(`Wrote ${updated} rows.`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
