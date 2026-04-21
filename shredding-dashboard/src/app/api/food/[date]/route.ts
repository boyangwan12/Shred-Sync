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
        foodItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!dailyLog) {
      return Response.json({
        date,
        dayType: null,
        carbType: null,
        targets: null,
        items: [],
      });
    }

    return Response.json({
      date: dailyLog.date,
      dayType: dailyLog.dayType,
      carbType: dailyLog.carbType,
      targets: {
        calories: dailyLog.caloriesTarget,
        proteinG: dailyLog.proteinTarget,
        carbsG: dailyLog.carbsTarget,
        fatG: dailyLog.fatTarget,
      },
      items: dailyLog.foodItems,
    });
  } catch (error) {
    console.error('GET /api/food/[date] error:', error);
    return Response.json({ error: 'Failed to fetch food plan' }, { status: 500 });
  }
}
