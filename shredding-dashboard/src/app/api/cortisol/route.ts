import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  buildCortisolVerdict,
  computeCortisolSignals,
  computeRollingBaseline,
  type DailyLogInput,
} from '@/lib/cortisol';

function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? todayLocalIso();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Invalid date format, expected YYYY-MM-DD' }, { status: 400 });
    }

    // Load 10-day history ending at `date` inclusive: 7 for baseline + 2 for sustained-red lookback + 1 target
    const fromStr = addDaysIso(date, -9);
    const logs = await prisma.dailyLog.findMany({
      where: { date: { gte: fromStr, lte: date } },
      orderBy: { date: 'asc' },
    });

    const history: DailyLogInput[] = logs.map(l => ({
      date: l.date,
      hrvMs: l.hrvMs,
      sleepMinutes: l.sleepMinutes,
      deepSleepMinutes: l.deepSleepMinutes,
      sleepBpm: l.sleepBpm,
      wakingBpm: l.wakingBpm,
      caloriesActual: l.caloriesActual,
      workoutActiveCal: l.workoutActiveCal,
    }));

    const baseline = computeRollingBaseline(history, date);
    const targetLog = history.find(h => h.date === date) ?? null;
    const rawSignals = computeCortisolSignals(targetLog, baseline);
    const verdict = buildCortisolVerdict(rawSignals, history, date);

    const baselineWindow = { from: addDaysIso(date, -7), to: addDaysIso(date, -1) };

    // Derivation: how many non-null data points fed each baseline and today's raw inputs
    const baselinePoints = {
      hrv: history.filter(h => h.date < date && h.hrvMs != null).length,
      tst: history.filter(h => h.date < date && h.sleepMinutes != null).length,
      rhr: history.filter(h => h.date < date && (h.sleepBpm != null || h.wakingBpm != null)).length,
    };
    const yesterdayStr = addDaysIso(date, -1);
    const yesterdayLog = history.find(h => h.date === yesterdayStr) ?? null;
    const yesterdayHrvDelta =
      yesterdayLog?.hrvMs != null && baseline?.hrvMs != null
        ? (yesterdayLog.hrvMs - baseline.hrvMs) / baseline.hrvMs
        : null;

    return Response.json({
      date,
      score: verdict.score,
      verdict: verdict.verdict,
      stackedReds: verdict.stackedReds,
      bandBoundaries: verdict.bandBoundaries,
      signals: verdict.signals,
      recommendations: verdict.recommendations,
      baselineWindow,
      derivation: {
        rawInputs: targetLog
          ? {
              hrvMs: targetLog.hrvMs,
              sleepMinutes: targetLog.sleepMinutes,
              deepSleepMinutes: targetLog.deepSleepMinutes,
              sleepBpm: targetLog.sleepBpm,
              wakingBpm: targetLog.wakingBpm,
              caloriesActual: targetLog.caloriesActual,
              workoutActiveCal: targetLog.workoutActiveCal,
            }
          : null,
        baseline,
        baselinePoints,
        yesterdayHrvDelta,
      },
    });
  } catch (error) {
    console.error('GET /api/cortisol error:', error);
    return Response.json({ error: 'Failed to compute cortisol verdict' }, { status: 500 });
  }
}
