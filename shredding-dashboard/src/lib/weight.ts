export const BAR_WEIGHT: Record<string, number> = {
  barbell: 45,
  smith: 25,
};

export function barWeight(equipment: string | null | undefined): number {
  if (!equipment) return 0;
  return BAR_WEIGHT[equipment] ?? 0;
}

export function totalWeight(
  weightLbs: number | '' | null | undefined,
  isPerSide: boolean,
  equipment: string | null | undefined,
): number | null {
  if (typeof weightLbs !== 'number' || !Number.isFinite(weightLbs)) return null;
  const plates = isPerSide ? weightLbs * 2 : weightLbs;
  return plates + barWeight(equipment);
}
