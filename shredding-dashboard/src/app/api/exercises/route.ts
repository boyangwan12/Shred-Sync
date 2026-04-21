import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const includeLast = searchParams.get('includeLast') === 'true';
    const excludeDate = searchParams.get('excludeDate');

    if (search && search.length > 100) {
      return Response.json(
        { error: 'search query too long (max 100)' },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search };
    }

    if (category) {
      where.category = category;
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 500,
    });

    if (!includeLast) {
      return Response.json(exercises);
    }

    // Enrich each exercise with its most recent non-warmup session (optionally excluding today)
    const exerciseIds = exercises.map((e) => e.id);
    const recent = await prisma.workoutExercise.findMany({
      where: {
        exerciseId: { in: exerciseIds },
        ...(excludeDate ? { dailyLog: { date: { not: excludeDate } } } : {}),
      },
      include: {
        dailyLog: { select: { date: true, dayType: true } },
        sets: {
          where: { isWarmup: false },
          orderBy: [{ weightLbs: 'desc' }, { reps: 'desc' }],
        },
      },
      orderBy: { dailyLog: { date: 'desc' } },
    });

    const lastByExercise = new Map<
      number,
      {
        date: string;
        dayType: string;
        topWeight: number | null;
        topReps: number | null;
        setCount: number;
      }
    >();
    for (const we of recent) {
      if (lastByExercise.has(we.exerciseId)) continue;
      if (we.sets.length === 0) continue;
      const top = we.sets[0];
      lastByExercise.set(we.exerciseId, {
        date: we.dailyLog.date,
        dayType: we.dailyLog.dayType,
        topWeight: top.weightLbs,
        topReps: top.reps,
        setCount: we.sets.length,
      });
    }

    return Response.json(
      exercises.map((e) => ({
        ...e,
        lastSession: lastByExercise.get(e.id) ?? null,
      })),
    );
  } catch (error) {
    console.error('GET /api/exercises error:', error);
    return Response.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let name: string | undefined;

  try {
    const body = await request.json();
    name = body.name;
    const { category, equipment } = body;

    if (!name || !category) {
      return Response.json(
        { error: 'name and category are required' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.length > 200) {
      return Response.json(
        { error: 'name must be a string (max 200 chars)' },
        { status: 400 }
      );
    }
    if (typeof category !== 'string' || category.length > 50) {
      return Response.json(
        { error: 'category must be a string (max 50 chars)' },
        { status: 400 }
      );
    }
    if (equipment != null && (typeof equipment !== 'string' || equipment.length > 50)) {
      return Response.json(
        { error: 'equipment must be a string (max 50 chars)' },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        category,
        equipment: equipment ?? null,
      },
    });

    return Response.json(exercise, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation — return existing exercise
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002' &&
      name
    ) {
      const existing = await prisma.exercise.findUnique({
        where: { name },
      });
      if (existing) {
        return Response.json(existing);
      }
    }

    console.error('POST /api/exercises error:', error);
    return Response.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
