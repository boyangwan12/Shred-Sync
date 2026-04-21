import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const category = searchParams.get('category');

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
    });

    return Response.json(exercises);
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
