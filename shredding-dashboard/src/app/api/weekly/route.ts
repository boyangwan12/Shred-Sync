import { prisma } from '@/lib/db';
import { USER_PROFILE } from '@/constants/targets';

export async function GET() {
  const logs = await prisma.dailyLog.findMany({ orderBy: { date: 'asc' } });

  // Group by week
  const startDate = new Date(USER_PROFILE.startDate);
  const weeks: Map<number, typeof logs> = new Map();

  for (const log of logs) {
    const logDate = new Date(log.date);
    const diffDays = Math.floor((logDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffDays / 7) + 1;
    if (!weeks.has(weekNum)) weeks.set(weekNum, []);
    weeks.get(weekNum)!.push(log);
  }

  const weeklyData = Array.from(weeks.entries()).map(([weekNum, weekLogs]) => {
    const weights = weekLogs.map(d => d.weightLbs).filter((w): w is number => w != null);
    const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null;
    const avgCalories = weekLogs.reduce((sum, d) => sum + (d.caloriesActual ?? 0), 0) / weekLogs.length;
    const hrs = weekLogs.map(d => d.morningHr).filter((h): h is number => h != null);
    const avgHr = hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null;
    const energyScores = weekLogs.map(d => d.energyScore).filter((e): e is number => e != null);
    const avgEnergy = energyScores.length > 0 ? energyScores.reduce((a, b) => a + b, 0) / energyScores.length : null;

    // Target weight: lose ~1 lb/week from start
    const targetWeight = USER_PROFILE.startWeight - (weekNum * 1.0);

    return {
      weekNumber: weekNum,
      startDate: weekLogs[0]?.date,
      endDate: weekLogs[weekLogs.length - 1]?.date,
      daysLogged: weekLogs.length,
      avgWeight: avgWeight ? Math.round(avgWeight * 10) / 10 : null,
      targetWeight: Math.round(targetWeight * 10) / 10,
      avgCalories: Math.round(avgCalories),
      avgMorningHr: avgHr ? Math.round(avgHr) : null,
      avgEnergy: avgEnergy ? Math.round(avgEnergy * 10) / 10 : null,
      onTrack: avgWeight ? avgWeight <= targetWeight + 1 : null,
    };
  });

  return Response.json(weeklyData);
}
