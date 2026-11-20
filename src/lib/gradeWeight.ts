/** Категории работ повышенной значимости (контрольная, контрольный диктант и т.п.) */
export const isControlWorkTypeName = (name?: string | null) =>
  !!name && /контрольн/i.test(name);

export const MAX_GRADE_WEIGHT = 3;

/** Средний балл с учётом веса оценок */
export const weightedAverage = (
  items: { value: number; weight?: number | null }[]
): number | null => {
  if (!items.length) return null;
  let sum = 0;
  let total = 0;
  for (const it of items) {
    const w = Math.min(MAX_GRADE_WEIGHT, Math.max(1, it.weight ?? 1));
    sum += it.value * w;
    total += w;
  }
  if (!total) return null;
  return Math.round((sum / total) * 100) / 100;
};
