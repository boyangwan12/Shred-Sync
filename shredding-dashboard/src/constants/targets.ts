export type DayType = 'rest' | 'push' | 'pull' | 'legs';
export type CarbType = 'low' | 'high';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: number;
}

// Recalibrated 2026-04-25 from 18 days of cutting data. The Notion plan's
// formula-derived TDEE (Mifflin-St Jeor + activity multiplier) was ~7% high.
// Real cycle-averaged maintenance ≈ 2,234 kcal/day after adaptive thermogenesis
// and NEAT suppression. Fat targets reduced because the original push/pull 121g
// was hard to hit naturally. See memory: project_calibrated_targets.md.
export const MACRO_TARGETS: Record<DayType, MacroTargets> = {
  rest:  { calories: 1500, protein: 153, carbs: 75,  fat: 65,  tdee: 1860 },
  push:  { calories: 1900, protein: 153, carbs: 100, fat: 100, tdee: 2320 },
  pull:  { calories: 1900, protein: 153, carbs: 100, fat: 100, tdee: 2355 },
  legs:  { calories: 2100, protein: 153, carbs: 250, fat: 50,  tdee: 2445 },
};

export const DAY_CARB_TYPE: Record<DayType, CarbType> = {
  rest: 'low',
  push: 'low',
  pull: 'low',
  legs: 'high',
};

export const CYCLE_ORDER: DayType[] = ['rest', 'push', 'pull', 'legs'];

export const USER_PROFILE = {
  startWeight: 153.3,
  startBf: 14.3,
  goalBf: 10,
  lbm: 131.4,
  bmr: 1657,
  startDate: '2026-04-07',
  endDate: '2026-06-30',
  totalWeeks: 12,
};

export const DAY_TYPE_COLORS: Record<DayType, string> = {
  rest: '#EF9F27',
  push: '#E24B4A',
  pull: '#378ADD',
  legs: '#1D9E75',
};
