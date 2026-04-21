import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { parseAutoSleepCsv } from '@/lib/sleepCsv';

/**
 * POST /api/sleep/import
 *
 * Accepts multipart/form-data (field "file") or text/csv body.
 * Strict 1 MB size limit (413). Rejects unmatched-quote CSVs (400).
 * Blocks create: rows with no pre-existing DailyLog are listed in `skipped`.
 *
 * Concurrency note (v1): single-user app. Prisma row-level upserts are atomic
 * under better-sqlite3; no explicit lock is needed for concurrent POSTs.
 */

const MAX_BYTES = 1_048_576; // 1 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Size check via Content-Length (AC-I8)
    const lenHeader = request.headers.get('content-length');
    if (lenHeader && parseInt(lenHeader, 10) > MAX_BYTES) {
      return Response.json({ error: 'File too large (max 1 MB)' }, { status: 413 });
    }

    // 2. Read body as text (support multipart or text/csv)
    const contentType = request.headers.get('content-type') ?? '';
    let csvText = '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return Response.json({ error: 'Missing file field' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return Response.json({ error: 'File too large (max 1 MB)' }, { status: 413 });
      }
      csvText = await file.text();
    } else {
      // Layer 1: Content-Length header check above (AC-I8) catches declared-too-large requests
      // before materialization. Layer 2 (below): post-read byte check catches missing/spoofed
      // Content-Length. If Content-Length was absent, reject with 411 as a conservative guard.
      if (!lenHeader || isNaN(parseInt(lenHeader, 10))) {
        return Response.json({ error: 'Content-Length required for raw CSV upload' }, { status: 411 });
      }
      csvText = await request.text();
      if (Buffer.byteLength(csvText, 'utf8') > MAX_BYTES) {
        return Response.json({ error: 'File too large (max 1 MB)' }, { status: 413 });
      }
    }

    // 3. Parse + validate
    const parsed = parseAutoSleepCsv(csvText);

    if (parsed.headerMismatch) {
      return Response.json({
        error: 'Invalid AutoSleep CSV — header mismatch',
        expected: parsed.headerMismatch.expected,
        got: parsed.headerMismatch.got,
      }, { status: 400 });
    }

    if (parsed.errors.length > 0) {
      const first = parsed.errors[0];
      return Response.json({
        error: `CSV parse error: ${first.message}`,
        errors: parsed.errors,
      }, { status: 400 });
    }

    if (parsed.duplicateDate) {
      return Response.json({
        error: `Duplicate date in CSV: ${parsed.duplicateDate}`,
      }, { status: 400 });
    }

    // 4. Upsert (blocking-create): only update existing DailyLog rows
    let updated = 0;
    let unchanged = 0;
    const skipped: Array<{ date: string | null; reason: string }> = [];

    for (const row of parsed.rows) {
      if (!row.date) {
        skipped.push({ date: null, reason: 'could not parse toDate' });
        continue;
      }
      const existing = await prisma.dailyLog.findUnique({ where: { date: row.date } });
      if (!existing) {
        skipped.push({ date: row.date, reason: 'no DailyLog for this date — please /log first' });
        continue;
      }

      // Compare the 10 sleep columns
      const changed =
        existing.hrvMs !== row.hrvMs ||
        existing.sleepMinutes !== row.sleepMinutes ||
        existing.deepSleepMinutes !== row.deepSleepMinutes ||
        existing.sleepBpm !== row.sleepBpm ||
        existing.wakingBpm !== row.wakingBpm ||
        existing.hrvMsAvg7 !== row.hrvMsAvg7 ||
        existing.sleepMinutesAvg7 !== row.sleepMinutesAvg7 ||
        existing.deepSleepMinutesAvg7 !== row.deepSleepMinutesAvg7 ||
        existing.sleepBpmAvg7 !== row.sleepBpmAvg7 ||
        existing.wakingBpmAvg7 !== row.wakingBpmAvg7;

      if (!changed) {
        unchanged += 1;
        continue;
      }

      await prisma.dailyLog.update({
        where: { date: row.date },
        data: {
          hrvMs: row.hrvMs,
          sleepMinutes: row.sleepMinutes,
          deepSleepMinutes: row.deepSleepMinutes,
          sleepBpm: row.sleepBpm,
          wakingBpm: row.wakingBpm,
          hrvMsAvg7: row.hrvMsAvg7,
          sleepMinutesAvg7: row.sleepMinutesAvg7,
          deepSleepMinutesAvg7: row.deepSleepMinutesAvg7,
          sleepBpmAvg7: row.sleepBpmAvg7,
          wakingBpmAvg7: row.wakingBpmAvg7,
        },
      });
      updated += 1;
    }

    return Response.json({ updated, unchanged, skipped }, { status: 200 });
  } catch (error) {
    console.error('POST /api/sleep/import error:', error);
    return Response.json({ error: 'Failed to import AutoSleep CSV' }, { status: 500 });
  }
}
