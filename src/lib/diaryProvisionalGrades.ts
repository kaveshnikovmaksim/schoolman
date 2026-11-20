import { weightedAverage } from "./gradeWeight";

export interface ProvisionalGrade {
  value: number;
  weight?: number | null;
  provisional_until?: string | null;
}

export function diaryToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function diaryDayRefreshDelay(now = new Date()): number {
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return nextDay.getTime() - now.getTime();
}

// The correction deadline is inclusive, matching the teacher journal.
export function isDiaryProvisional(grade: Pick<ProvisionalGrade, "provisional_until">, today = diaryToday()): boolean {
  return Boolean(grade.provisional_until && grade.provisional_until >= today);
}

export function diaryCountedGrades<T extends ProvisionalGrade>(grades: T[], today = diaryToday()): T[] {
  return grades.filter((grade) => !isDiaryProvisional(grade, today));
}

export function diaryAverage(grades: ProvisionalGrade[], today = diaryToday()): number | null {
  return weightedAverage(diaryCountedGrades(grades, today));
}

export function diaryGradeLabel(grade: ProvisionalGrade, today = diaryToday()): string {
  return `${grade.value}${isDiaryProvisional(grade, today) ? "•" : ""}`;
}

export function diaryCorrectionDeadline(until: string): string {
  return `Можно исправить до ${new Date(`${until}T12:00:00`).toLocaleDateString("ru-RU")}`;
}