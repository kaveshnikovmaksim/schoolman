import { format, parseISO, isAfter, startOfDay } from "date-fns";

export type QuarterAccessMode = "auto" | "open" | "closed";

export interface QuarterLike {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  access_mode?: string | null;
}

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Триместр редактируется: авто — только пока он идёт; admin может открыть/закрыть вручную */
export function isQuarterEditable(q?: QuarterLike | null, today: string = todayStr()): boolean {
  if (!q) return false;
  const mode = (q.access_mode as QuarterAccessMode) || "auto";
  if (mode === "open") return true;
  if (mode === "closed") return false;
  return today >= q.start_date && today <= q.end_date;
}

export function quarterLockReason(q?: QuarterLike | null, today: string = todayStr()): string | null {
  if (!q) return null;
  if (isQuarterEditable(q, today)) return null;
  const mode = (q.access_mode as QuarterAccessMode) || "auto";
  if (mode === "closed") return "Администратор закрыл доступ к этому триместру";
  if (today < q.start_date) return "Триместр ещё не начался — оценки выставлять нельзя";
  return "Триместр завершён — оценки выставлять нельзя";
}

/** Оценку можно ставить только на уже прошедшие уроки и на сегодня */
export function isDateEditable(dateStr: string, today: string = todayStr()): boolean {
  return dateStr <= today;
}

export function isFutureDate(dateStr: string, today: string = todayStr()): boolean {
  return isAfter(startOfDay(parseISO(dateStr)), startOfDay(parseISO(today)));
}

/**
 * Триместровую оценку можно ставить только если в триместре есть хотя бы одна дата,
 * доступная для выставления оценок (обычная доступная дата или открытая администратором).
 */
export function hasEditableDateInQuarter(
  dates: string[],
  q?: QuarterLike | null,
  openedDates?: Set<string>,
  today: string = todayStr()
): boolean {
  if (!q) return false;
  // Ручные даты действуют только когда сам триместр открыт
  if (!isQuarterEditable(q, today)) return false;
  return dates.some((d) => isDateEditable(d, today) || (openedDates?.has(d) ?? false));
}

/** Клетка доступна учителю: триместр открыт И (дата прошла/сегодня ИЛИ админ открыл её) */
export function isCellEditable(
  dateStr: string,
  q?: QuarterLike | null,
  openedDates?: Set<string>,
  today: string = todayStr()
): boolean {
  if (!isQuarterEditable(q, today)) return false;
  return isDateEditable(dateStr, today) || (openedDates?.has(dateStr) ?? false);
}
