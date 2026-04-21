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

  return Response.json(logs);
}
