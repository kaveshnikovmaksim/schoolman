// Shared academic calendar state
// Types of non-working days
export type DayType = "weekend" | "holiday" | "vacation";

export interface NonWorkingDay {
  date: string; // format: YYYY-MM-DD
  type: DayType;
  label?: string;
}

// Default weekends are Saturday (6) and Sunday (0)
const WEEKEND_DAYS = [0, 6];

// Store for non-working days (will be replaced with DB later)
let nonWorkingDays: NonWorkingDay[] = [
  // Пример праздников
  { date: "2026-01-01", type: "holiday", label: "Новый год" },
  { date: "2026-01-02", type: "holiday", label: "Новогодние каникулы" },
  { date: "2026-01-03", type: "holiday", label: "Новогодние каникулы" },
  { date: "2026-01-07", type: "holiday", label: "Рождество" },
  { date: "2026-02-23", type: "holiday", label: "День защитника Отечества" },
  { date: "2026-03-08", type: "holiday", label: "Международный женский день" },
  { date: "2026-05-01", type: "holiday", label: "Праздник Весны и Труда" },
  { date: "2026-05-09", type: "holiday", label: "День Победы" },
  { date: "2026-06-12", type: "holiday", label: "День России" },
  { date: "2026-11-04", type: "holiday", label: "День народного единства" },
  // Пример каникул (весенние)
  { date: "2026-03-23", type: "vacation", label: "Весенние каникулы" },
  { date: "2026-03-24", type: "vacation", label: "Весенние каникулы" },
  { date: "2026-03-25", type: "vacation", label: "Весенние каникулы" },
  { date: "2026-03-26", type: "vacation", label: "Весенние каникулы" },
  { date: "2026-03-27", type: "vacation", label: "Весенние каникулы" },
  { date: "2026-03-28", type: "vacation", label: "Весенние каникулы" },
  { date: "2026-03-29", type: "vacation", label: "Весенние каникулы" },
];

// Listeners for reactivity
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export function getNonWorkingDays(): NonWorkingDay[] {
  return [...nonWorkingDays];
}

export function addNonWorkingDay(day: NonWorkingDay) {
  if (!nonWorkingDays.find((d) => d.date === day.date)) {
    nonWorkingDays = [...nonWorkingDays, day];
    notify();
  }
}

export function removeNonWorkingDay(date: string) {
  nonWorkingDays = nonWorkingDays.filter((d) => d.date !== date);
  notify();
}

export function addNonWorkingDaysRange(startDate: Date, endDate: Date, type: DayType, label: string) {
  const days: NonWorkingDay[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    if (!nonWorkingDays.find((d) => d.date === dateStr)) {
      days.push({ date: dateStr, type, label });
    }
    current.setDate(current.getDate() + 1);
  }
  nonWorkingDays = [...nonWorkingDays, ...days];
  notify();
}

export function isNonWorkingDate(dateStr: string): boolean {
  // Check if it's a weekend (Saturday or Sunday)
  const date = new Date(dateStr + "T00:00:00");
  if (WEEKEND_DAYS.includes(date.getDay())) return true;
  // Check if it's in the non-working days list
  return nonWorkingDays.some((d) => d.date === dateStr);
}

export function getNonWorkingDayInfo(dateStr: string): { isNonWorking: boolean; type?: DayType; label?: string } {
  const date = new Date(dateStr + "T00:00:00");
  if (WEEKEND_DAYS.includes(date.getDay())) {
    return { isNonWorking: true, type: "weekend", label: "Выходной" };
  }
  const found = nonWorkingDays.find((d) => d.date === dateStr);
  if (found) {
    return { isNonWorking: true, type: found.type, label: found.label };
  }
  return { isNonWorking: false };
}

// Convert DD.MM format (used in grades) to YYYY-MM-DD for a given year
export function shortDateToFull(shortDate: string, year: number = 2026): string {
  const [day, month] = shortDate.split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
