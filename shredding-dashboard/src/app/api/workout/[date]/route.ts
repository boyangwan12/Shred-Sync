import { prisma } from '@/lib/db';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    if (!DATE_FORMAT.test(date)) {
      return Response.json(
        { error: 'Invalid date format, use YYYY-MM-DD' },
        { status: 400 },
      );
    }

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

    if (!DATE_FORMAT.test(date)) {
      return Response.json(
        { error: 'Invalid date format, use YYYY-MM-DD' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { exercises } = body;

    if (!Array.isArray(exercises)) {
      return Response.json(
        { error: 'exercises array is required' },
        { status: 400 }
      );
    }

    // Guardrails — reject malformed payloads before hitting the DB
    if (exercises.length > 30) {
      return Response.json(
        { error: 'Too many exercises (max 30)' },
        { status: 400 },
      );
    }
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (typeof ex?.exerciseId !== 'number' || ex.exerciseId <= 0) {
        return Response.json(
          { error: `exercises[${i}].exerciseId must be a positive number` },
          { status: 400 },
        );
      }
      if (typeof ex?.notes === 'string' && ex.notes.length > 1000) {
        return Response.json(
          { error: `exercises[${i}].notes too long (max 1000)` },
          { status: 400 },
        );
      }
      if (!Array.isArray(ex.sets)) {
        return Response.json(
          { error: `exercises[${i}].sets must be an array` },
          { status: 400 },
        );
      }
      if (ex.sets.length > 50) {
        return Response.json(
          { error: `exercises[${i}] too many sets (max 50)` },
          { status: 400 },
        );
      }
      for (let j = 0; j < ex.sets.length; j++) {
        const s = ex.sets[j];
        if (typeof s?.setNumber !== 'number' || s.setNumber < 1 || s.setNumber > 100) {
          return Response.json(
            { error: `exercises[${i}].sets[${j}].setNumber out of range` },
            { status: 400 },
          );
        }
        if (s.weightLbs != null && (typeof s.weightLbs !== 'number' || !Number.isFinite(s.weightLbs) || s.weightLbs < 0 || s.weightLbs > 2000)) {
          return Response.json(
            { error: `exercises[${i}].sets[${j}].weightLbs out of range` },
            { status: 400 },
          );
        }
        if (s.reps != null && (typeof s.reps !== 'number' || !Number.isInteger(s.reps) || s.reps < 0 || s.reps > 500)) {
          return Response.json(
            { error: `exercises[${i}].sets[${j}].reps out of range` },
            { status: 400 },
          );
        }
        if (s.rpe != null && (typeof s.rpe !== 'number' || s.rpe < 1 || s.rpe > 10)) {
          return Response.json(
            { error: `exercises[${i}].sets[${j}].rpe out of range` },
            { status: 400 },
          );
        }
        if (typeof s?.notes === 'string' && s.notes.length > 500) {
          return Response.json(
            { error: `exercises[${i}].sets[${j}].notes too long (max 500)` },
            { status: 400 },
          );
        }
      }
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
