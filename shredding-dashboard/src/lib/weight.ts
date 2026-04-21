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
  // Per-side doubling only applies to implements with shared load across two sides
  // (barbell, smith, plate-loaded machines). For dumbbells/cables, the weight field
  // is already per-hand / absolute — never double it, even if legacy data has the flag set.
  const respectPerSide =
    equipment !== 'dumbbell' &&
    equipment !== 'cable' &&
    equipment !== 'bodyweight';
  const plates = isPerSide && respectPerSide ? weightLbs * 2 : weightLbs;
  return plates + barWeight(equipment);
}
