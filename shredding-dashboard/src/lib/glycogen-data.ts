import { prisma } from './db';
import type { DayType } from '@/constants/targets';
import type {
  ExerciseInput,
  GlycogenDayInput,
  MuscleGroup,
} from './glycogen';

/**
 * Data-fetching layer for the glycogen simulation. Queries Prisma for
 * `DailyLog` rows in a date range and transforms them into
 * `GlycogenDayInput[]` for `simulateGlycogen`.
 *
 * Warmup sets are excluded from volume/set counts.
 * Unknown/compound/cardio exercise categories map to `'full_body'` and are
 * distributed proportionally across the 6 muscle groups inside the simulation.
 */

/**
 * Maps `Exercise.category` strings from the DB to `MuscleGroup | 'full_body'`.
 * Categories from seed data: chest, back, shoulders, arms, legs, core.
 * Anything else (compound, cardio, null, unknown) => 'full_body'.
 */
const CATEGORY_TO_MUSCLE_GROUP: Record<string, MuscleGroup | 'full_body'> = {
  legs: 'legs',
  back: 'back',
  chest: 'chest',
  shoulders: 'shoulders',
  arms: 'arms',
  core: 'core',
  compound: 'full_body',
  cardio: 'full_body',
};

function mapCategory(category: string | null | undefined): MuscleGroup | 'full_body' {
  if (!category) return 'full_body';
  return CATEGORY_TO_MUSCLE_GROUP[category] ?? 'full_body';
}

/**
 * Fetch daily logs (inclusive) in [fromDate, toDate] and transform them into
 * the input shape for `simulateGlycogen`. Returns days ordered by date ASC.
 */
export async function fetchGlycogenInputs(
  fromDate: string,
  toDate: string,
): Promise<GlycogenDayInput[]> {
  const logs = await prisma.dailyLog.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      dayType: true,
      carbsActual: true,
      carbsTarget: true,
      workoutAvgHr: true,
      energyScore: true,
      pumpScore: true,
      workoutExercises: {
        select: {
          exercise: { select: { category: true } },
          sets: { select: { weightLbs: true, reps: true, isWarmup: true } },
        },
      },
    },
  });

  return logs.map((log) => {
    const exercises: ExerciseInput[] = log.workoutExercises.map((we) => {
      const muscleGroup = mapCategory(we.exercise?.category);
      // Exclude warmup sets from volume + set counts
      const workingSets = we.sets.filter((s) => !s.isWarmup);
      const sets = workingSets.length;
      const totalVolumeLbs = workingSets.reduce((sum, s) => {
        const w = s.weightLbs ?? 0;
        const r = s.reps ?? 0;
        return sum + w * r;
      }, 0);
      return { muscleGroup, sets, totalVolumeLbs };
    });

    return {
      date: log.date,
      dayType: log.dayType as DayType,
      carbsActual: log.carbsActual ?? null,
      carbsTarget: log.carbsTarget ?? null,
      workoutAvgHr: log.workoutAvgHr ?? null,
      exercises,
      energyScore: log.energyScore ?? null,
      pumpScore: log.pumpScore ?? null,
    };
  });
}
