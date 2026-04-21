import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const days = await prisma.dailyLog.findMany({
      where: { foodItems: { some: {} } },
      select: { date: true, dayType: true },
      orderBy: { date: 'asc' },
    });
    return Response.json(days);
  } catch (error) {
    console.error('GET /api/food/dates error:', error);
    return Response.json({ error: 'Failed to fetch food dates' }, { status: 500 });
  }
}
