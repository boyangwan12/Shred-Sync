import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { estimateGlycogen } from '@/lib/glycogen';
import { MACRO_TARGETS, DAY_CARB_TYPE, DayType } from '@/constants/targets';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, dayType, ...rest } = body;

  if (!date || !dayType) {
    return Response.json({ error: 'date and dayType are required' }, { status: 400 });
  }

  const targets = MACRO_TARGETS[dayType as DayType];
  const carbType = DAY_CARB_TYPE[dayType as DayType];

  // Get yesterday's log for glycogen calculation
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayLog = await prisma.dailyLog.findUnique({ where: { date: yesterdayStr } });

  const glycogen = estimateGlycogen(
    {
      dayType: dayType as DayType,
      carbsActual: rest.carbsActual ?? targets.carbs,
      carbsTarget: targets.carbs,
      workoutAvgHr: rest.workoutAvgHr ?? null,
    },
    yesterdayLog ? { liverGlycogenPct: yesterdayLog.liverGlycogenPct, muscleGlycogenPct: yesterdayLog.muscleGlycogenPct } : null
  );

  const log = await prisma.dailyLog.upsert({
    where: { date },
    create: {
      date,
      dayType,
      carbType,
      caloriesTarget: targets.calories,
      proteinTarget: targets.protein,
      carbsTarget: targets.carbs,
      fatTarget: targets.fat,
      ...rest,
      ...glycogen,
    },
    update: {
      dayType,
      carbType,
      caloriesTarget: targets.calories,
      proteinTarget: targets.protein,
      carbsTarget: targets.carbs,
      fatTarget: targets.fat,
      ...rest,
      ...glycogen,
    },
  });

  return Response.json(log, { status: 201 });
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return Response.json({ error: 'date query parameter required' }, { status: 400 });
  }
  const log = await prisma.dailyLog.findUnique({ where: { date } });
  if (!log) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(log);
}
