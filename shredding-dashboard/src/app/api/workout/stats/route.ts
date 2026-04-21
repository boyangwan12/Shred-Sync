import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: Record<string, string> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;

    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        workoutExercises: {
          some: {},
        },
      },
      include: {
        workoutExercises: {
          include: {
            sets: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const stats = dailyLogs.map((log) => {
      let totalVolume = 0;
      let setCount = 0;
      const exerciseCount = log.workoutExercises.length;

      for (const we of log.workoutExercises) {
        for (const set of we.sets) {
          setCount++;
          if (!set.isWarmup && set.weightLbs != null && set.reps != null) {
            totalVolume += set.weightLbs * set.reps;
          }
        }
      }

      return {
        date: log.date,
        dayType: log.dayType,
        exerciseCount,
        setCount,
        totalVolume,
      };
    });

    return Response.json(stats);
  } catch (error) {
    console.error('GET /api/workout/stats error:', error);
    return Response.json(
      { error: 'Failed to fetch workout stats' },
      { status: 500 }
    );
  }
}
