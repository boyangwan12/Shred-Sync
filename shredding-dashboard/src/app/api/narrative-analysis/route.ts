import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { buildNarrativeAnalysis, type NarrativeLog } from '@/lib/narrativeAnalysis';
import { barWeight } from '@/lib/weight';

function todayStringUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? todayStringUTC();

    const fromDate = new Date(date + 'T00:00:00Z');
    fromDate.setUTCDate(fromDate.getUTCDate() - 13);
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

    const narrativeLogs: NarrativeLog[] = logs.map(l => {
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

      return {
        date: l.date,
        dayType: l.dayType,
        caloriesActual: l.caloriesActual,
        caloriesTarget: l.caloriesTarget,
        proteinActual: l.proteinActual,
        proteinTarget: l.proteinTarget,
        carbsActual: l.carbsActual,
        carbsTarget: l.carbsTarget,
        fatActual: l.fatActual,
        fatTarget: l.fatTarget,
        weightLbs: l.weightLbs,
        morningHr: l.morningHr,
        energyScore: l.energyScore,
        satietyScore: l.satietyScore,
        dailyTotalCalBurned: l.dailyTotalCalBurned,
        workoutDurationMin: l.workoutDurationMin,
        workoutAvgHr: l.workoutAvgHr,
        workoutExerciseCount: l.workoutExercises.length,
        workoutTotalSets: totalSets,
        workoutVolumeLbs: Math.round(volume),
      };
    });

    const analysis = buildNarrativeAnalysis(narrativeLogs, date);
    return Response.json(analysis);
  } catch (error) {
    console.error('GET /api/narrative-analysis error:', error);
    return Response.json({ error: 'Failed to build narrative analysis' }, { status: 500 });
  }
}
