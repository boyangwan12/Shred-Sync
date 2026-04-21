import { DayType } from '@/constants/targets';

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

/**
 * Glycogen estimation model — research-validated parameters
 *
 * Sources:
 * - Liver capacity 100g: Jensen et al., Front Physiol 2011 (PMC3248697)
 * - Muscle capacity 450g: Murray & Rosenbloom, Nutr Rev 2018 (PMC6019055)
 * - Overnight drain 28-47g: Boden et al., JCI 1997 (PMC508308)
 * - Carb partitioning: Ferrannini et al., AJP-Endo 2001; PMC507408
 * - Post-exercise muscle uptake +75%: PMC507408
 * - Exercise depletion: Hamidvand et al., Physiol Rep 2025 (PMC12717450)
 * - Liver drain during exercise: Gonzalez et al., AJP-Endo 2016
 * - Fat oxidation inverse: Hearris et al., Metabolism 2019 (PMID 31095946)
 * - Insulin suppresses fat ox: Spriet 2014, Randle cycle (PMC4008806)
 * - Carb cycling: Bergström & Hultman 1966; PMC12399638
 */
export function estimateGlycogen(todayLog: DayLog, yesterdayLog?: PreviousDayLog | null) {
  const LIVER_MAX = 100;   // grams (Jensen 2011: 80-120g range)
  const MUSCLE_MAX = 450;  // grams (Murray 2018: 400-500g trained male)

  let liver = yesterdayLog?.liverGlycogenPct ?? 75;
  let muscle = yesterdayLog?.muscleGlycogenPct ?? 80;

  let liverG = (liver / 100) * LIVER_MAX;
  let muscleG = (muscle / 100) * MUSCLE_MAX;

  const carbsEaten = todayLog.carbsActual ?? todayLog.carbsTarget ?? 0;
  const isExerciseDay = todayLog.dayType !== 'rest';

  // Step 1: Overnight drain — scales with liver fullness
  // Boden 1997: glycogenolysis = ~47g/8hr from full stores, ~31g from moderate stores
  // When liver is full, enzyme kinetics drive faster glycogenolysis
  const drainRate = 28 + (liverG / LIVER_MAX) * 12; // 28-40g, scaling with fullness
  liverG = Math.max(0, liverG - drainRate);

  if (isExerciseDay) {
    // EXERCISE DAYS: deplete first, then refill (post-workout eating)

    // Step 2: Exercise depletes glycogen
    // Liver drain — legs > upper (Gonzalez 2016: large muscles = more hepatic output)
    const exerciseLiverDrain: Record<string, number> = {
      rest: 0, push: 12, pull: 12, legs: 25,
    };
    liverG = Math.max(0, liverG - (exerciseLiverDrain[todayLog.dayType] ?? 0));

    // Muscle depletion (Hamidvand 2025: mean ~21%, range 10-40%)
    // Upper body at 20% (within validated range), legs at 28%
    const exerciseDepletion: Record<string, number> = {
      rest: 0, push: 0.20, pull: 0.20, legs: 0.28,
    };
    const depletion = exerciseDepletion[todayLog.dayType] || 0;
    muscleG = muscleG * (1 - depletion);

    // HR intensity adjustment (PMC5872716)
    if (todayLog.workoutAvgHr && depletion > 0) {
      const intensityFactor = Math.min(todayLog.workoutAvgHr / 120, 1.5);
      const extraDepletion = depletion * (intensityFactor - 1) * 0.5;
      muscleG = muscleG * (1 - extraDepletion);
    }

    // Step 3: Post-workout eating — muscle is insulin-sensitive, absorbs more
    // PMC507408: post-exercise glucose uptake increases ~75%
    // Jensen 2011: 70-90% of glucose disposal → muscle glycogen during high insulin
    let availableCarbs = carbsEaten;
    const liverRefill = Math.min(availableCarbs * 0.30, LIVER_MAX - liverG);
    liverG += liverRefill;
    availableCarbs -= liverRefill;
    // Post-exercise: muscle gets 60% of remaining (GLUT4 translocation)
    const muscleRefill = Math.min(availableCarbs * 0.60, MUSCLE_MAX - muscleG);
    muscleG += muscleRefill;

  } else {
    // REST DAYS: eat throughout (no exercise, normal partitioning)
    // Ferrannini 2001: liver ~35%, muscle ~20%, brain/kidney/other ~45%
    let availableCarbs = carbsEaten;
    const liverRefill = Math.min(availableCarbs * 0.35, LIVER_MAX - liverG);
    liverG += liverRefill;
    availableCarbs -= liverRefill;
    const muscleRefill = Math.min(availableCarbs * 0.20, MUSCLE_MAX - muscleG);
    muscleG += muscleRefill;
  }

  // Step 4: Fat burning rate
  // Base: inverse of glycogen (Hearris 2019: +45% fat ox when depleted)
  // Modulated by: carb intake → insulin suppresses fat oxidation (Randle cycle, PMC4008806)
  const avgGlycogenPct = ((liverG / LIVER_MAX) + (muscleG / MUSCLE_MAX)) / 2 * 100;
  let fatBurning = 20 + (100 - avgGlycogenPct) * 0.7;
  if (isExerciseDay) fatBurning += 8;

  // Insulin dampening: high carb intake suppresses fat oxidation directly
  // 258g carbs → strong insulin → fat ox drops significantly
  const insulinDampening = Math.min(carbsEaten / 150, 1.0) * 0.4; // up to 40% reduction
  fatBurning = fatBurning * (1 - insulinDampening);

  fatBurning = Math.min(Math.round(fatBurning), 85);
  fatBurning = Math.max(fatBurning, 15);

  return {
    liverGlycogenPct: Math.max(0, Math.round((liverG / LIVER_MAX) * 100)),
    muscleGlycogenPct: Math.max(0, Math.round((muscleG / MUSCLE_MAX) * 100)),
    fatBurningPct: fatBurning,
  };
}
