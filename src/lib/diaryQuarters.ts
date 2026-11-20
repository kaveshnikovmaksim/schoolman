export type QuarterRange = { id: string; name: string; start_date: string; end_date: string };

/** Текущий триместр дневника: последний уже начавшийся (или первый, если учебный год ещё не начался). */
export function currentDiaryQuarter<T extends QuarterRange>(quarters: T[], today: string): T | undefined {
  const sorted = [...quarters].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const started = sorted.filter((q) => q.start_date <= today);
  return started[started.length - 1] ?? sorted[0];
}

/** Триместры для показа: начавшиеся или с оценками, новые сверху. */
export function visibleDiaryQuarters<T extends QuarterRange>(quarters: T[], today: string, hasGrades: (q: T) => boolean): T[] {
  return [...quarters]
    .filter((q) => q.start_date <= today || hasGrades(q))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/** Оценки по порядку выставления: старые слева, новые справа. */
export function oldestFirst<T extends { date: string; created_at?: string | null }>(grades: T[]): T[] {
  return [...grades].sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}
