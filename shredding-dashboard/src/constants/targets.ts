export type DayType = 'rest' | 'push' | 'pull' | 'legs';
export type CarbType = 'low' | 'high';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: number;
}

export const MACRO_TARGETS: Record<DayType, MacroTargets> = {
  rest:  { calories: 1600, protein: 153, carbs: 75,  fat: 76,  tdee: 1990 },
  push:  { calories: 2100, protein: 153, carbs: 100, fat: 121, tdee: 2485 },
  pull:  { calories: 2100, protein: 153, carbs: 100, fat: 121, tdee: 2520 },
  legs:  { calories: 2200, protein: 153, carbs: 250, fat: 65,  tdee: 2620 },
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
