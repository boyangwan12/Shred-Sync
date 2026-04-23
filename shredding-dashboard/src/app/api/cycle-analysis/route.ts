import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { buildCycleAnalysis, type CycleLog } from '@/lib/cycleAnalysis';
import { barWeight } from '@/lib/weight';
import { simulateGlycogen } from '@/lib/glycogen';
import { fetchGlycogenInputs } from '@/lib/glycogen-data';
import {
  buildCortisolVerdict,
  computeCortisolSignals,
  computeRollingBaseline,
  type DailyLogInput,
} from '@/lib/cortisol';

function todayStringUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? todayStringUTC();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Invalid date format, expected YYYY-MM-DD' }, { status: 400 });
    }

    // Load 30 days back so we can find 2 full cycles + 2-week weight trend
    const fromDate = new Date(date + 'T00:00:00Z');
    fromDate.setUTCDate(fromDate.getUTCDate() - 30);
    const fromStr = fromDate.toISOString().split('T')[0];

    const logs = await prisma.dailyLog.findMany({
      where: { date: { gte: fromStr, lte: date } },
      orderBy: { date: 'asc' },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            sets: true,
          },
        },
      },
    });

    // Compute-on-read glycogen overlay — mirrors /api/logs so both routes
    // agree on the same date. Without this the cycle-analysis page would
    // render stale stored DB values while the dashboard renders
    // simulateGlycogen output. See .omc/plans/glycogen-model.md step 4b.
    const glycogenInputs = await fetchGlycogenInputs(fromStr, date);
    const glycogenOutputs = simulateGlycogen(glycogenInputs);
    const glycogenByDate = new Map(glycogenOutputs.map(g => [g.date, g]));

    const cycleLogs: CycleLog[] = logs.map(l => {
      let totalSets = 0;
      let volume = 0;
      for (const we of l.workoutExercises) {
        for (const s of we.sets) {
          if (s.isWarmup) continue;
          totalSets += 1;
          const w = s.weightLbs ?? 0;
          const reps = s.reps ?? 0;
          const plates = s.isPerSide ? w * 2 : w;
          const total = plates + barWeight(we.exercise.equipment);
          volume += total * reps;
        }
      }

      const g = glycogenByDate.get(l.date);
      return {
        date: l.date,
        dayType: l.dayType,
        carbType: l.carbType,
        caloriesActual: l.caloriesActual,
        caloriesTarget: l.caloriesTarget,
        proteinActual: l.proteinActual,
        carbsActual: l.carbsActual,
        carbsTarget: l.carbsTarget,
        fatActual: l.fatActual,
        weightLbs: l.weightLbs,
        morningHr: l.morningHr,
        energyScore: l.energyScore,
        satietyScore: l.satietyScore,
        dailyTotalCalBurned: l.dailyTotalCalBurned,
        // Compute-on-read: prefer simulateGlycogen output, fall back to stored
        // DB values if the simulator returns no data for this date.
        liverGlycogenPct: g?.liverGlycogenPct ?? l.liverGlycogenPct,
        muscleGlycogenPct: g?.muscleGlycogenPct ?? l.muscleGlycogenPct,
        fatBurningPct: g?.fatBurningPct ?? l.fatBurningPct,
        workoutDurationMin: l.workoutDurationMin,
        workoutAvgHr: l.workoutAvgHr,
        workoutExerciseCount: l.workoutExercises.length,
        workoutTotalSets: totalSets,
        workoutVolumeLbs: Math.round(volume),
        workoutDataMissing: g?.workoutDataMissing ?? false,
      };
    });

    const analysis = buildCycleAnalysis(cycleLogs, date);

    const includeCortisol = request.nextUrl.searchParams.get('includeCortisol') === 'true';
    if (includeCortisol) {
      // Use a slimmer 10-day window ending at `date` for cortisol sustained-red + baseline.
      const cortisolHistory: DailyLogInput[] = logs
        .filter(l => {
          const start = new Date(date + 'T00:00:00Z');
          start.setUTCDate(start.getUTCDate() - 9);
          return l.date >= start.toISOString().split('T')[0] && l.date <= date;
        })
        .map(l => ({
          date: l.date,
          hrvMs: l.hrvMs,
          sleepMinutes: l.sleepMinutes,
          deepSleepMinutes: l.deepSleepMinutes,
          sleepBpm: l.sleepBpm,
          wakingBpm: l.wakingBpm,
          caloriesActual: l.caloriesActual,
          workoutActiveCal: l.workoutActiveCal,
        }));
      const baseline = computeRollingBaseline(cortisolHistory, date);
      const targetLog = cortisolHistory.find(h => h.date === date) ?? null;
      const rawSignals = computeCortisolSignals(targetLog, baseline);
      const cortisol = buildCortisolVerdict(rawSignals, cortisolHistory, date);
      return Response.json({
        ...analysis,
        cortisolVerdict: cortisol.verdict,
        cortisolStackedReds: cortisol.stackedReds,
      });
    }
    return Response.json(analysis);
  } catch (error) {
    console.error('GET /api/cycle-analysis error:', error);
    return Response.json({ error: 'Failed to build cycle analysis' }, { status: 500 });
  }
}
