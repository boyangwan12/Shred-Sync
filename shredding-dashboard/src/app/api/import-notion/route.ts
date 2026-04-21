import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { estimateGlycogen } from '@/lib/glycogen';
import { MACRO_TARGETS, DAY_CARB_TYPE, DayType } from '@/constants/targets';

// Map Notion "Workout Focus" to our dayType
const WORKOUT_FOCUS_MAP: Record<string, DayType> = {
  'Rest': 'rest',
  'Push': 'push',
  'Pull': 'pull',
  'Legs (squat)': 'legs',
  'Legs (deadlift)': 'legs',
  'Cardio': 'rest',
};

interface NotionDayData {
  date: string;
  dayType: DayType;
  caloriesActual: number | null;
  proteinActual: number | null;
  carbsActual: number | null;
  fatActual: number | null;
  weightLbs: number | null;
  morningHr: number | null;
  energyScore: number | null;
  satietyScore: number | null;
  notes: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notionData } = body;

    if (!notionData || !notionData.date || !notionData.dayType) {
      return Response.json({ error: 'notionData with date and dayType required' }, { status: 400 });
    }

    const data: NotionDayData = notionData;
    const dayType = data.dayType;
    const targets = MACRO_TARGETS[dayType];
    const carbType = DAY_CARB_TYPE[dayType];

    // Get yesterday's log for glycogen calculation
    const yesterday = new Date(data.date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayLog = await prisma.dailyLog.findUnique({ where: { date: yesterdayStr } });

    const glycogen = estimateGlycogen(
      {
        dayType,
        carbsActual: data.carbsActual ?? targets.carbs,
        carbsTarget: targets.carbs,
        workoutAvgHr: null,
      },
      yesterdayLog ? { liverGlycogenPct: yesterdayLog.liverGlycogenPct, muscleGlycogenPct: yesterdayLog.muscleGlycogenPct } : null
    );

    // Compute calories from macros if not provided
    const caloriesActual = data.caloriesActual ??
      ((data.proteinActual ?? 0) * 4 + (data.carbsActual ?? 0) * 4 + (data.fatActual ?? 0) * 9);

    const log = await prisma.dailyLog.upsert({
      where: { date: data.date },
      create: {
        date: data.date,
        dayType,
        carbType,
        caloriesTarget: targets.calories,
        proteinTarget: targets.protein,
        carbsTarget: targets.carbs,
        fatTarget: targets.fat,
        caloriesActual: Math.round(caloriesActual),
        proteinActual: data.proteinActual,
        carbsActual: data.carbsActual,
        fatActual: data.fatActual,
        weightLbs: data.weightLbs,
        morningHr: data.morningHr,
        energyScore: data.energyScore,
        satietyScore: data.satietyScore,
        notes: data.notes,
        ...glycogen,
      },
      update: {
        dayType,
        carbType,
        caloriesTarget: targets.calories,
        proteinTarget: targets.protein,
        carbsTarget: targets.carbs,
        fatTarget: targets.fat,
        caloriesActual: Math.round(caloriesActual),
        proteinActual: data.proteinActual,
        carbsActual: data.carbsActual,
        fatActual: data.fatActual,
        weightLbs: data.weightLbs,
        morningHr: data.morningHr,
        energyScore: data.energyScore,
        satietyScore: data.satietyScore,
        notes: data.notes,
        ...glycogen,
      },
    });

    return Response.json({
      success: true,
      log,
      summary: {
        date: log.date,
        dayType: log.dayType,
        calories: `${log.caloriesActual}/${log.caloriesTarget}`,
        protein: `${log.proteinActual}/${log.proteinTarget}g`,
        carbs: `${log.carbsActual}/${log.carbsTarget}g`,
        fat: `${log.fatActual}/${log.fatTarget}g`,
        weight: log.weightLbs,
        morningHr: log.morningHr,
        glycogen: {
          liver: log.liverGlycogenPct,
          muscle: log.muscleGlycogenPct,
          fatBurn: log.fatBurningPct,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/import-notion error:', error);
    return Response.json({ error: 'Failed to import Notion data' }, { status: 500 });
  }
}
