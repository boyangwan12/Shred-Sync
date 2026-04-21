import { prisma } from '@/lib/db';
import { predictTomorrow } from '@/lib/predictions';
import { DayType } from '@/constants/targets';

export async function GET() {
  const logs = await prisma.dailyLog.findMany({
    orderBy: { date: 'desc' },
    take: 7,
  });

  const sorted = logs.reverse().map(l => ({
    date: l.date,
    dayType: l.dayType as DayType,
    carbsActual: l.carbsActual,
    carbsTarget: l.carbsTarget,
    workoutAvgHr: l.workoutAvgHr,
    liverGlycogenPct: l.liverGlycogenPct,
    muscleGlycogenPct: l.muscleGlycogenPct,
    weightLbs: l.weightLbs,
    energyScore: l.energyScore,
    satietyScore: l.satietyScore,
  }));

  const prediction = predictTomorrow(sorted);

  return Response.json(prediction);
}
