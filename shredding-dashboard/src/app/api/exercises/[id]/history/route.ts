import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exerciseId = parseInt(id, 10);

    if (isNaN(exerciseId)) {
      return Response.json(
        { error: 'Invalid exercise id' },
        { status: 400 }
      );
    }

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return Response.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);

    const workoutExercises = await prisma.workoutExercise.findMany({
      where: { exerciseId },
      include: {
        dailyLog: {
          select: {
            date: true,
            dayType: true,
          },
        },
        sets: {
          orderBy: { setNumber: 'asc' },
        },
      },
      orderBy: {
        dailyLog: {
          date: 'desc',
        },
      },
      take: limit,
    });

    const history = workoutExercises.map((we) => ({
      date: we.dailyLog.date,
      dayType: we.dailyLog.dayType,
      sets: we.sets,
    }));

    return Response.json(history);
  } catch (error) {
    console.error('GET /api/exercises/[id]/history error:', error);
    return Response.json(
      { error: 'Failed to fetch exercise history' },
      { status: 500 }
    );
  }
}
