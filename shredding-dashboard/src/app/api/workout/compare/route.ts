import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const dayType = request.nextUrl.searchParams.get('dayType');

    if (!dayType) {
      return Response.json({ error: 'dayType query parameter required' }, { status: 400 });
    }

    const logs = await prisma.dailyLog.findMany({
      where: {
        dayType,
        workoutExercises: { some: {} },
      },
      include: {
        workoutExercises: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const cycles = logs.map((log, idx) => {
      let totalVolume = 0;
      let topSetWeight = 0;
      let topSetReps = 0;
      let topSetExercise = '';
      let topSet1RM = 0;

      for (const we of log.workoutExercises) {
        for (const s of we.sets) {
          if (!s.isWarmup && s.weightLbs != null && s.reps != null) {
            totalVolume += s.weightLbs * s.reps;
            const e1rm = s.weightLbs * (1 + s.reps / 30);
            if (e1rm > topSet1RM) {
              topSet1RM = e1rm;
              topSetWeight = s.weightLbs;
              topSetReps = s.reps;
              topSetExercise = we.exercise.name;
            }
          }
        }
      }

      return {
        cycleNumber: idx + 1,
        date: log.date,
        exerciseCount: log.workoutExercises.length,
        setCount: log.workoutExercises.reduce((sum, we) => sum + we.sets.filter(s => !s.isWarmup).length, 0),
        totalVolume: Math.round(totalVolume),
        topSet: {
          exercise: topSetExercise,
          weight: topSetWeight,
          reps: topSetReps,
          est1RM: Math.round(topSet1RM),
        },
      };
    });

    return Response.json({ dayType, cycles });
  } catch (error) {
    console.error('GET /api/workout/compare error:', error);
    return Response.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
}
