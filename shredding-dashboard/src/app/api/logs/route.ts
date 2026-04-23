import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  const limit = request.nextUrl.searchParams.get('limit');

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, string>).gte = from;
    if (to) (where.date as Record<string, string>).lte = to;
  }

  const logs = await prisma.dailyLog.findMany({
    where,
    orderBy: { date: 'asc' },
    take: limit ? parseInt(limit) : undefined,
  });

  // When food_plan_items exist for a day, they are the source of truth for macros.
  // Overrides any stale values stored on the daily_logs row.
  const logIds = logs.map((l) => l.id);
  const foodSums = logIds.length
    ? await prisma.foodPlanItem.groupBy({
        by: ['dailyLogId'],
        where: { dailyLogId: { in: logIds } },
        _sum: { calories: true, proteinG: true, carbsG: true, fatG: true },
      })
    : [];
  const sumsByLogId = new Map(foodSums.map((s) => [s.dailyLogId, s._sum]));

  const round1 = (n: number | null | undefined) =>
    n == null ? null : Math.round(n * 10) / 10;

  const enriched = logs.map((log) => {
    const s = sumsByLogId.get(log.id);
    if (!s || s.calories == null) return log;
    return {
      ...log,
      caloriesActual: s.calories,
      proteinActual: round1(s.proteinG),
      carbsActual: round1(s.carbsG),
      fatActual: round1(s.fatG),
    };
  });

  return Response.json(enriched);
}
