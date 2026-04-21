import { prisma } from '@/lib/db';
import { estimateGlycogen } from '@/lib/glycogen';
import { MACRO_TARGETS, DAY_CARB_TYPE, DayType } from '@/constants/targets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const log = await prisma.dailyLog.findUnique({ where: { date } });
  if (!log) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(log);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const body = await request.json();
  const { dayType, ...rest } = body;

  const existing = await prisma.dailyLog.findUnique({ where: { date } });
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const effectiveDayType = (dayType || existing.dayType) as DayType;
  const targets = MACRO_TARGETS[effectiveDayType];
  const carbType = DAY_CARB_TYPE[effectiveDayType];

  // Recalculate glycogen
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayLog = await prisma.dailyLog.findUnique({ where: { date: yesterdayStr } });

  const glycogen = estimateGlycogen(
    {
      dayType: effectiveDayType,
      carbsActual: rest.carbsActual ?? existing.carbsActual ?? targets.carbs,
      carbsTarget: targets.carbs,
      workoutAvgHr: rest.workoutAvgHr ?? existing.workoutAvgHr ?? null,
    },
    yesterdayLog ? { liverGlycogenPct: yesterdayLog.liverGlycogenPct, muscleGlycogenPct: yesterdayLog.muscleGlycogenPct } : null
  );

  const log = await prisma.dailyLog.update({
    where: { date },
    data: {
      dayType: effectiveDayType,
      carbType,
      caloriesTarget: targets.calories,
      proteinTarget: targets.protein,
      carbsTarget: targets.carbs,
      fatTarget: targets.fat,
      ...rest,
      ...glycogen,
    },
  });

  return Response.json(log);
}
