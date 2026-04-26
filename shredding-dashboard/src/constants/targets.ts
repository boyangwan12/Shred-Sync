export type DayType = 'rest' | 'push' | 'pull' | 'legs';
export type CarbType = 'low' | 'high';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: number;
}

// Tightened 2026-04-26: cut 100 kcal/day (mostly fat) to close the ~1.7 lb
// gap behind plan. After 19 days at the previous targets the effective deficit
// (~290 kcal/day) only delivered 0.33 lb/wk of loss vs the 0.81 lb/wk plan.
// Pulling fat down by ~12g per day shifts to a ~390 kcal/day deficit ≈ 0.78 lb/wk.
// See memory: project_calibrated_targets.md.
export const MACRO_TARGETS: Record<DayType, MacroTargets> = {
  rest:  { calories: 1400, protein: 153, carbs: 75,  fat: 55, tdee: 1860 },
  push:  { calories: 1800, protein: 153, carbs: 100, fat: 88, tdee: 2320 },
  pull:  { calories: 1800, protein: 153, carbs: 100, fat: 88, tdee: 2355 },
  legs:  { calories: 2000, protein: 153, carbs: 250, fat: 43, tdee: 2445 },
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
