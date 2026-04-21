import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    const dailyLog = await prisma.dailyLog.findUnique({
      where: { date },
      include: {
        workoutExercises: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: true,
            sets: {
              orderBy: { setNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!dailyLog) {
      return Response.json(
        { error: 'No daily log found for this date' },
        { status: 404 }
      );
    }

    return Response.json({
      dailyLog: {
        id: dailyLog.id,
        date: dailyLog.date,
        dayType: dailyLog.dayType,
      },
      exercises: dailyLog.workoutExercises,
    });
  } catch (error) {
    console.error('GET /api/workout/[date] error:', error);
    return Response.json(
      { error: 'Failed to fetch workout' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const body = await request.json();
    const { exercises } = body;

    if (!Array.isArray(exercises)) {
      return Response.json(
        { error: 'exercises array is required' },
        { status: 400 }
      );
    }

    const dailyLog = await prisma.dailyLog.findUnique({
      where: { date },
    });

    if (!dailyLog) {
      return Response.json(
        { error: 'No daily log found for this date' },
        { status: 404 }
      );
    }

    // Transaction: delete existing workout exercises + sets, then recreate
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing workout exercises (sets cascade via onDelete)
      await tx.workoutExercise.deleteMany({
        where: { dailyLogId: dailyLog.id },
      });

      // Create new workout exercises with nested sets
      for (const ex of exercises) {
        await tx.workoutExercise.create({
          data: {
            dailyLogId: dailyLog.id,
            exerciseId: ex.exerciseId,
            sortOrder: ex.sortOrder,
            notes: ex.notes ?? null,
            sets: {
              create: (ex.sets ?? []).map(
                (set: {
                  setNumber: number;
                  weightLbs?: number;
                  reps?: number;
                  rpe?: number;
                  isWarmup?: boolean;
                  isPerSide?: boolean;
                  notes?: string;
                }) => ({
                  setNumber: set.setNumber,
                  weightLbs: set.weightLbs ?? null,
                  reps: set.reps ?? null,
                  rpe: set.rpe ?? null,
                  isWarmup: set.isWarmup ?? false,
                  isPerSide: set.isPerSide ?? false,
                  notes: set.notes ?? null,
                })
              ),
            },
          },
        });
      }

      // Re-fetch the full workout
      return tx.dailyLog.findUnique({
        where: { id: dailyLog.id },
        include: {
          workoutExercises: {
            orderBy: { sortOrder: 'asc' },
            include: {
              exercise: true,
              sets: {
                orderBy: { setNumber: 'asc' },
              },
            },
          },
        },
      });
    });

    return Response.json({
      dailyLog: {
        id: result!.id,
        date: result!.date,
        dayType: result!.dayType,
      },
      exercises: result!.workoutExercises,
    });
  } catch (error) {
    console.error('PUT /api/workout/[date] error:', error);
    return Response.json(
      { error: 'Failed to save workout' },
      { status: 500 }
    );
  }
}
