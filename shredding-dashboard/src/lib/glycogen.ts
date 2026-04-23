import { DayType } from '@/constants/targets';

/**
 * Glycogen simulation model — v1.0.0 (multi-day, per-muscle-group)
 *
 * This module replaces the old single-day `estimateGlycogen()` with a forward
 * simulation that processes an ordered array of day logs and returns per-day
 * snapshots. It tracks glycogen per muscle group (6 groups) and liver
 * separately, using actual logged exercises for depletion.
 *
 * Research sources (Table A — research-derived constants):
 *  - Liver capacity 100g: Jensen et al., Front Physiol 2011 (PMC3248697)
 *  - Overnight liver drain: Boden et al., JCI 1997 (PMC508308)
 *  - Carb partitioning: Ferrannini et al., AJP-Endo 2001 (PMC507408)
 *  - Post-exercise muscle uptake +75%: PMC507408
 *  - Muscle group mass: Janssen et al., J Appl Physiol 2000 (PMID 10904038)
 *
 * Calibration constants (Table B) are documented inline with their anchors.
 */

// -----------------------------------------------------------------------------
// Exported constants — single source of truth
// -----------------------------------------------------------------------------

export const GLYCOGEN_MAX = { liver: 100, muscle: 400 } as const;
export const MODEL_VERSION = 'glycogen-v1.0.0';

// Table A — research-derived
const LIVER_MAX = GLYCOGEN_MAX.liver;
const MUSCLE_MAX = GLYCOGEN_MAX.muscle;
const OVERNIGHT_LIVER_DRAIN = 50; // Boden 1997: ~5g/hr × 10hr sleep
const CARB_PARTITION_LIVER = 0.30; // Ferrannini 2001
const CARB_PARTITION_MUSCLE_FED = 0.55; // Ferrannini 2001 rest-day
const CARB_PARTITION_MUSCLE_POST_WORKOUT = 0.65; // Ferrannini 2001 + GLUT4

// Muscle-group mass fractions (Janssen 2000, male, normalized to 6 groups)
export const MUSCLE_GROUP_MASS: Record<MuscleGroup, number> = {
  legs: 0.40,
  back: 0.20,
  chest: 0.12,
  shoulders: 0.10,
  arms: 0.12,
  core: 0.06,
};

// Table B — calibration
const DEPLETION_K = 0.20; // midpoint of Hamidvand 2025 25-40% range
const DEPLETION_REF_VOLUME = 5000; // lbs — reference "30-set session"
const CNS_LIVER_COST_PER_SET = 0.3; // grams — Jensen 2011 5-10% per session
const BASE_FAT_OXIDATION = 0.25; // fraction; model assumption for cut
const INSULIN_DAMPENING_THRESHOLD = 150; // g carbs for full dampening
const INSULIN_DAMPENING_MAX = 0.4; // cap of 40% suppression (Randle 1963 / Spriet 2014, PMC4008806)

/**
 * Predicted depletion by day type — used ONLY in `predictTomorrow` fallback
 * when exercises are not yet known. NOT used inside `simulateGlycogen`, which
 * must remain pure. Values calibrated to match old-model output range.
 */
export const PREDICTED_DEPLETION_BY_DAY_TYPE: Record<DayType, number> = {
  rest: 0,
  push: 0.12,
  pull: 0.15,
  legs: 0.25,
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MuscleGroup = 'legs' | 'back' | 'chest' | 'shoulders' | 'arms' | 'core';

export interface ExerciseInput {
  muscleGroup: MuscleGroup | 'full_body';
  sets: number;
  totalVolumeLbs: number;
}

export interface GlycogenDayInput {
  date: string;
  dayType: DayType;
  carbsActual: number | null;
  carbsTarget: number | null;
  workoutAvgHr: number | null;
  exercises: ExerciseInput[];
  energyScore: number | null;
  pumpScore: number | null;
}

export interface PerMuscleGlycogen {
  legs: number;
  back: number;
  chest: number;
  shoulders: number;
  arms: number;
  core: number;
}

export interface GlycogenDayOutput {
  date: string;
  liverGlycogenPct: number;
  muscleGlycogenPct: number;
  perMuscle: PerMuscleGlycogen;
  fatBurningPct: number;
  workoutDataMissing: boolean;
  carbsFromTarget: boolean;
  modelVersion: string;
}

// Backward-compat wrapper types
interface DayLog {
  dayType: DayType;
  carbsActual?: number | null;
  carbsTarget?: number | null;
  workoutAvgHr?: number | null;
  liverGlycogenPct?: number | null;
  muscleGlycogenPct?: number | null;
}

interface PreviousDayLog {
  liverGlycogenPct?: number | null;
  muscleGlycogenPct?: number | null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const MUSCLE_GROUPS: MuscleGroup[] = ['legs', 'back', 'chest', 'shoulders', 'arms', 'core'];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** Grams of glycogen stored in a single muscle group at 100%. */
function maxGramsForGroup(group: MuscleGroup): number {
  return MUSCLE_MAX * MUSCLE_GROUP_MASS[group];
}

/** Produce a muscle-group-keyed map with a single value for every group. */
function uniformPerMuscle(pct: number): Record<MuscleGroup, number> {
  return {
    legs: pct,
    back: pct,
    chest: pct,
    shoulders: pct,
    arms: pct,
    core: pct,
  };
}

/** Weighted-average muscle glycogen percent across the 6 groups (grams/max). */
function weightedMusclePct(gramsByGroup: Record<MuscleGroup, number>): number {
  let totalG = 0;
  for (const g of MUSCLE_GROUPS) totalG += gramsByGroup[g];
  return clamp((totalG / MUSCLE_MAX) * 100, 0, 100);
}

// -----------------------------------------------------------------------------
// Core simulation
// -----------------------------------------------------------------------------

/**
 * Run a multi-day glycogen simulation. Input must be ordered from oldest to
 * newest. Returns one output per input day. Pure function — no Prisma calls.
 *
 * @param days ordered array of day inputs
 * @param initialState optional initial liver/muscle percentages (muscle is
 *   applied uniformly across all 6 groups). Defaults: liver=75%, muscle=80%.
 */
export function simulateGlycogen(
  days: GlycogenDayInput[],
  initialState?: { liverPct: number; musclePct: number },
): GlycogenDayOutput[] {
  if (days.length === 0) return [];

  const startLiverPct = initialState?.liverPct ?? 75;
  const startMusclePct = initialState?.musclePct ?? 80;

  // State in grams, carried across days
  let liverG = (startLiverPct / 100) * LIVER_MAX;
  const muscleG: Record<MuscleGroup, number> = {
    legs: (startMusclePct / 100) * maxGramsForGroup('legs'),
    back: (startMusclePct / 100) * maxGramsForGroup('back'),
    chest: (startMusclePct / 100) * maxGramsForGroup('chest'),
    shoulders: (startMusclePct / 100) * maxGramsForGroup('shoulders'),
    arms: (startMusclePct / 100) * maxGramsForGroup('arms'),
    core: (startMusclePct / 100) * maxGramsForGroup('core'),
  };

  const outputs: GlycogenDayOutput[] = [];

  for (const day of days) {
    // --- 1. Overnight liver drain (scales with fullness per Boden 1997) ---
    const drainG = Math.min(OVERNIGHT_LIVER_DRAIN * (liverG / LIVER_MAX), liverG);
    liverG = Math.max(0, liverG - drainG);

    // --- 2. Determine carbs (with target fallback flag) ---
    const carbsFromTarget = day.carbsActual == null && day.carbsTarget != null;
    const carbsEaten = day.carbsActual ?? day.carbsTarget ?? 0;

    // --- 3. Determine workout-data state ---
    const isTrainingDay = day.dayType !== 'rest';
    const hasExercises = day.exercises.length > 0;
    const workoutDataMissing = isTrainingDay && !hasExercises;

    // --- 4. Exercise depletion per muscle group ---
    const depletionByGroup: Record<MuscleGroup, number> = {
      legs: 0, back: 0, chest: 0, shoulders: 0, arms: 0, core: 0,
    };
    let totalSets = 0;

    if (hasExercises) {
      const intensityFactor = day.workoutAvgHr && day.workoutAvgHr > 0
        ? Math.min(day.workoutAvgHr / 120, 1.5)
        : 1;

      for (const ex of day.exercises) {
        totalSets += ex.sets;
        const normSets = ex.sets / 5; // normalize to ~5 sets per exercise
        const rawDepletion =
          DEPLETION_K * (ex.totalVolumeLbs / DEPLETION_REF_VOLUME) * normSets * intensityFactor;

        if (ex.muscleGroup === 'full_body') {
          // Distribute across all 6 groups proportional to mass
          for (const g of MUSCLE_GROUPS) {
            depletionByGroup[g] += rawDepletion * MUSCLE_GROUP_MASS[g];
          }
        } else {
          depletionByGroup[ex.muscleGroup] += rawDepletion;
        }
      }

      // Apply depletion with per-group clamp [0, 0.50]
      for (const g of MUSCLE_GROUPS) {
        const d = clamp(depletionByGroup[g], 0, 0.50);
        muscleG[g] = muscleG[g] * (1 - d);
      }

      // Liver CNS cost
      liverG = Math.max(0, liverG - totalSets * CNS_LIVER_COST_PER_SET);
    }

    // --- 5. Carb refill ---
    // Liver first
    const liverRefill = Math.min(carbsEaten * CARB_PARTITION_LIVER, LIVER_MAX - liverG);
    liverG += liverRefill;

    // Muscle — partition depends on whether we exercised
    const musclePartition = hasExercises
      ? CARB_PARTITION_MUSCLE_POST_WORKOUT
      : CARB_PARTITION_MUSCLE_FED;
    const totalMuscleCarbs = carbsEaten * musclePartition;

    // Distribute across groups proportional to depletion (more-depleted groups
    // absorb more, per GLUT4 translocation). If no depletion occurred, fall
    // back to mass fractions so passive refill still hits every group.
    let totalDepletion = 0;
    for (const g of MUSCLE_GROUPS) totalDepletion += depletionByGroup[g];

    for (const g of MUSCLE_GROUPS) {
      const share = totalDepletion > 0
        ? depletionByGroup[g] / totalDepletion
        : MUSCLE_GROUP_MASS[g];
      const refillG = totalMuscleCarbs * share;
      const cap = maxGramsForGroup(g);
      muscleG[g] = Math.min(muscleG[g] + refillG, cap);
    }

    // --- 6. Fat oxidation with insulin dampening (Randle cycle) ---
    // Weighted avg glycogen pct across liver + muscle (as fractions 0-1)
    let totalMuscleG = 0;
    for (const g of MUSCLE_GROUPS) totalMuscleG += muscleG[g];
    const liverFrac = liverG / LIVER_MAX;
    const muscleFrac = totalMuscleG / MUSCLE_MAX;
    const avgGlycogenFrac = (liverFrac + muscleFrac) / 2;

    let baseFat = BASE_FAT_OXIDATION + (1 - avgGlycogenFrac) * 0.7;
    if (isTrainingDay) baseFat += 0.08; // "+8" in percentage points

    // Insulin dampening (Randle cycle preserved, PMC4008806)
    const insulinDampening =
      Math.min(carbsEaten / INSULIN_DAMPENING_THRESHOLD, 1.0) * INSULIN_DAMPENING_MAX;

    let fatBurningPct = Math.round((baseFat * (1 - insulinDampening)) * 100);
    fatBurningPct = clamp(fatBurningPct, 15, 85);

    // --- 7. Snapshot output for this day ---
    const perMusclePct: PerMuscleGlycogen = {
      legs: Math.round((muscleG.legs / maxGramsForGroup('legs')) * 100),
      back: Math.round((muscleG.back / maxGramsForGroup('back')) * 100),
      chest: Math.round((muscleG.chest / maxGramsForGroup('chest')) * 100),
      shoulders: Math.round((muscleG.shoulders / maxGramsForGroup('shoulders')) * 100),
      arms: Math.round((muscleG.arms / maxGramsForGroup('arms')) * 100),
      core: Math.round((muscleG.core / maxGramsForGroup('core')) * 100),
    };

    outputs.push({
      date: day.date,
      liverGlycogenPct: Math.max(0, Math.round((liverG / LIVER_MAX) * 100)),
      muscleGlycogenPct: Math.max(0, Math.round(weightedMusclePct(muscleG))),
      perMuscle: perMusclePct,
      fatBurningPct,
      workoutDataMissing,
      carbsFromTarget,
      modelVersion: MODEL_VERSION,
    });
  }

  return outputs;
}

// -----------------------------------------------------------------------------
// Backward-compat wrapper
// -----------------------------------------------------------------------------

/**
 * Backward-compatible wrapper around `simulateGlycogen`. Preserves the old
 * single-day API for existing callers (`predictions.ts`,
 * `import-notion/route.ts`). Behavioral note: this wrapper has no exercise
 * data, so `workoutDataMissing` is true on training days and exercise-driven
 * depletion is zero. Call sites that need realistic training-day depletion
 * (like `predictTomorrow`) must apply `PREDICTED_DEPLETION_BY_DAY_TYPE` on
 * top of the wrapper's output. See the plan's "Wrapper Behavioral Changes".
 */
export function estimateGlycogen(
  todayLog: DayLog,
  yesterdayLog?: PreviousDayLog | null,
): {
  liverGlycogenPct: number;
  muscleGlycogenPct: number;
  fatBurningPct: number;
} {
  const initialState = yesterdayLog
    ? {
        liverPct: yesterdayLog.liverGlycogenPct ?? 75,
        musclePct: yesterdayLog.muscleGlycogenPct ?? 80,
      }
    : undefined;

  const input: GlycogenDayInput = {
    date: 'wrapper', // placeholder — wrapper output is not date-keyed
    dayType: todayLog.dayType,
    carbsActual: todayLog.carbsActual ?? null,
    carbsTarget: todayLog.carbsTarget ?? null,
    workoutAvgHr: todayLog.workoutAvgHr ?? null,
    exercises: [],
    energyScore: null,
    pumpScore: null,
  };

  const [out] = simulateGlycogen([input], initialState);

  return {
    liverGlycogenPct: out.liverGlycogenPct,
    muscleGlycogenPct: out.muscleGlycogenPct,
    fatBurningPct: out.fatBurningPct,
  };
}
