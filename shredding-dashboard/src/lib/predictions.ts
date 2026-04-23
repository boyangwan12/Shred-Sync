import { DayType, CYCLE_ORDER, MACRO_TARGETS } from '@/constants/targets';
import { estimateGlycogen, PREDICTED_DEPLETION_BY_DAY_TYPE } from './glycogen';

interface DayLog {
  date: string;
  dayType: DayType;
  carbsActual?: number | null;
  carbsTarget?: number | null;
  workoutAvgHr?: number | null;
  liverGlycogenPct?: number | null;
  muscleGlycogenPct?: number | null;
  weightLbs?: number | null;
  energyScore?: number | null;
  satietyScore?: number | null;
}

export interface Prediction {
  nextDayType: DayType;
  liverGlycogenPct: number;
  muscleGlycogenPct: number;
  fatBurningPct: number;
  weightDirection: 'up' | 'down' | 'stable';
  weightReason: string;
  expectedEnergy: number;
  expectedHunger: number;
  mealTimingSuggestion: string;
}

export function predictTomorrow(logs: DayLog[]): Prediction {
  if (logs.length === 0) {
    return {
      nextDayType: 'rest',
      liverGlycogenPct: 75,
      muscleGlycogenPct: 80,
      fatBurningPct: 30,
      weightDirection: 'stable',
      weightReason: 'No data yet',
      expectedEnergy: 3,
      expectedHunger: 3,
      mealTimingSuggestion: 'Start logging data to get personalized suggestions.',
    };
  }

  const today = logs[logs.length - 1];
  const currentIdx = CYCLE_ORDER.indexOf(today.dayType);
  const nextDayType = CYCLE_ORDER[(currentIdx + 1) % CYCLE_ORDER.length];

  const targets = MACRO_TARGETS[nextDayType];
  const simulated = {
    dayType: nextDayType,
    carbsActual: targets.carbs,
    carbsTarget: targets.carbs,
    workoutAvgHr: nextDayType === 'rest' ? null : 115,
  };

  const glycogenBase = estimateGlycogen(simulated, today);

  // The estimateGlycogen wrapper can't model exercise depletion (it has no
  // exercise data in its signature). For training-day predictions, apply a
  // day-type-based fallback depletion so the forecast reflects the drop the
  // user should expect from their typical session. Rest days pass through
  // unchanged. See .omc/plans/glycogen-model.md "Wrapper Behavioral Changes".
  const predictedDepletion = PREDICTED_DEPLETION_BY_DAY_TYPE[nextDayType] ?? 0;
  const adjustedMuscle = Math.max(
    0,
    Math.round(glycogenBase.muscleGlycogenPct * (1 - predictedDepletion)),
  );
  // Recompute fat burning from the adjusted muscle + same carb intake so the
  // inverse-glycogen → fat-oxidation relationship stays consistent.
  const avgGlyc = (glycogenBase.liverGlycogenPct + adjustedMuscle) / 2;
  let baseFat = 25 + (100 - avgGlyc) * 0.7;
  if (nextDayType !== 'rest') baseFat += 8;
  const insulinDampening = Math.min(targets.carbs / 150, 1.0) * 0.4;
  const adjustedFat = Math.max(15, Math.min(85, Math.round(baseFat * (1 - insulinDampening))));
  const glycogen = {
    liverGlycogenPct: glycogenBase.liverGlycogenPct,
    muscleGlycogenPct: adjustedMuscle,
    fatBurningPct: adjustedFat,
  };

  let weightDirection: 'up' | 'down' | 'stable' = 'stable';
  let weightReason = '';

  if (nextDayType === 'legs') {
    weightDirection = 'up';
    weightReason = 'High carb refeed day — water retention from glycogen replenishment will likely push weight up 0.5-1 lb. This is expected and temporary.';
  } else if (nextDayType === 'rest') {
    weightDirection = 'down';
    weightReason = 'Low calorie rest day with continued glycogen depletion. Expect a weight drop from water loss.';
  } else {
    const recentWeights = logs.slice(-3).map(l => l.weightLbs).filter((w): w is number => w != null);
    if (recentWeights.length >= 2) {
      const trend = recentWeights[recentWeights.length - 1] - recentWeights[0];
      weightDirection = trend < -0.3 ? 'down' : trend > 0.3 ? 'up' : 'stable';
      weightReason = `Training day on low carbs. Weight following recent ${weightDirection} trend.`;
    } else {
      weightReason = 'Training day with moderate deficit. Weight likely stable or slightly down.';
    }
  }

  const recentEnergy = logs.slice(-3).map(l => l.energyScore).filter((e): e is number => e != null);
  let expectedEnergy = 3;
  if (recentEnergy.length > 0) {
    const avg = recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length;
    if (nextDayType === 'legs') {
      expectedEnergy = Math.min(5, Math.round(avg + 1));
    } else if (nextDayType === 'rest') {
      expectedEnergy = Math.max(1, Math.round(avg - 0.5));
    } else {
      expectedEnergy = Math.round(avg);
    }
  }

  let expectedHunger = 3;
  if (nextDayType === 'rest') expectedHunger = 4;
  else if (nextDayType === 'legs') expectedHunger = 2;

  let mealTimingSuggestion = '';
  if (nextDayType === 'rest') {
    mealTimingSuggestion = 'Front-load protein at breakfast and lunch. Save a casein shake for evening to manage hunger on low calories.';
  } else if (nextDayType === 'legs') {
    mealTimingSuggestion = 'Pre-workout: 40g carbs 60min before. Post-workout: 80g carbs + 40g protein within 30min. Spread remaining carbs across meals.';
  } else {
    mealTimingSuggestion = 'Pre-workout: 25g carbs + 10g EAAs. Post-workout: 40g protein + 30g carbs. Keep fats moderate at dinner.';
  }

  return {
    nextDayType,
    ...glycogen,
    weightDirection,
    weightReason,
    expectedEnergy,
    expectedHunger,
    mealTimingSuggestion,
  };
}

/**
 * Interactive "what-if" simulator for the GlycogenSimulator UI component.
 * This is intentionally a simpler single-point model (not time-series).
 * The historical glycogen chart uses `simulateGlycogen()` from `glycogen.ts`.
 * See .omc/plans/glycogen-model.md step 3d for rationale on keeping these
 * separate — this function takes raw gram values (liver 0-100, muscle 0-400)
 * and computes energy source breakdown, ketone production, gluconeogenesis,
 * and muscle breakdown risk. Unifying would make the slider UI awkward.
 */
export function computeSimulatorState(liver: number, muscle: number, activity: 'rest' | 'moderate' | 'heavy') {
  let baseFat = 30;
  if (liver < 50) baseFat += ((50 - liver) / 50) * 20;
  if (liver < 30) baseFat += ((30 - liver) / 30) * 15;
  if (muscle < 250) baseFat += ((250 - muscle) / 250) * 15;
  if (muscle < 150) baseFat += ((150 - muscle) / 150) * 10;
  if (activity === 'moderate') baseFat += 5;
  if (activity === 'heavy' && muscle < 200) baseFat += 10;

  const fatPct = Math.min(Math.round(baseFat), 90);
  const ketoPct = liver < 25 ? Math.min(Math.round((25 - liver) / 25 * 30), 30) : 0;
  const carbPct = Math.max(100 - fatPct - ketoPct, 5);

  const gng = liver < 40 ? Math.round(((40 - liver) / 40) * 60) : 0;

  let risk = 0;
  if (liver < 20 && muscle < 100) risk = 70;
  else if (liver < 30 && muscle < 150) risk = 40;
  else if (liver < 40) risk = 15;
  if (activity === 'heavy') risk += 15;

  return {
    fatPct,
    carbPct,
    ketoPct,
    gng,
    risk: Math.min(Math.round(risk), 100),
  };
}
