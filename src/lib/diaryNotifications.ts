import { diaryGradeLabel } from "./diaryProvisionalGrades";

export const homeworkPath = (id: string) => `/diary/student/homework/${encodeURIComponent(id)}`;

export function pendingHomeworkPath(path?: string): string | null {
  return path && /^\/diary\/student\/homework\/[0-9a-f-]{36}$/i.test(path) ? path : null;
}

export function unreadHomeworkIds(ids: string[], readIds: string[]): string[] {
  const read = new Set(readIds);
  return ids.filter((id) => !read.has(id));
}

export function diaryReadKey(userId: string, classId: string, studentId?: string | null): string {
  return studentId ? `diary_personal_read:${userId}:${classId}:${studentId}` : `diary_homework_read:${userId}:${classId}`;
}

export interface DiaryEvent {
  id: string;
  kind: "homework" | "added" | "changed" | "commented" | "absence" | "removed";
  title: string;
  subject: string;
  teacher: string;
  category: string;
  occurredAt: string;
  lessonDate: string;
  comment?: string | null;
  path?: string;
  value?: number | null;
  weight?: number;
  provisional_until?: string | null;
}

export interface DiaryAbsence {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  type: string;
  created_at: string;
}

export function studentAbsenceEvents(rows: DiaryAbsence[], studentId: string, subjects: Map<string, string>): DiaryEvent[] {
  return rows.filter((row) => row.student_id === studentId && ["excused", "unexcused"].includes(row.type)).map((row) => ({
    id: `absence:${row.id}:${row.type}`,
    kind: "absence",
    title: row.type === "excused" ? "Пропуск урока по уважительной причине" : "Пропуск урока без уведомления",
    subject: subjects.get(row.subject_id) ?? "Предмет",
    teacher: "",
    category: "Пропуск",
    occurredAt: row.created_at,
    lessonDate: row.date,
  }));
}

export function diaryEventDate(event: DiaryEvent): string {
  const date = new Date(event.occurredAt);
  return event.kind === "absence" ? date.toLocaleDateString("ru-RU") : date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export interface GradeHistoryEvent {
  id: string;
  student_id: string;
  subject_id: string;
  grade_id: string | null;
  work_type_id: string | null;
  action: string;
  old_value: number | null;
  new_value: number | null;
  changed_at: string;
  changed_by_name: string | null;
  date: string;
  weight?: number | null;
  provisional_until?: string | null;
  comment?: string | null;
}

export function readEventIds(events: DiaryEvent[], commonRead: string[], personalRead: string[], studentId?: string | null) {
  return {
    common: [...new Set([...commonRead, ...events.filter((event) => event.kind === "homework").map((event) => event.id)])],
    personal: [...new Set([...personalRead, ...(studentId ? events.filter((event) => event.kind !== "homework").map((event) => event.id) : [])])],
  };
}

export function studentGradeEvents(rows: GradeHistoryEvent[], studentId: string, subjects: Map<string, string>, categories: Map<string, string>): DiaryEvent[] {
  const personalRows = rows.filter((row) => row.student_id === studentId);
  const removedGrades = new Set(personalRows.filter((row) => row.action === "removed" && row.grade_id).map((row) => row.grade_id));
  const seen = new Set<string>();
  return personalRows.filter((row) => {
    if (!["added", "changed", "commented", "removed"].includes(row.action)) return false;
    if (row.action !== "removed" && row.grade_id && removedGrades.has(row.grade_id)) return false;
    const key = JSON.stringify([row.grade_id ?? row.id, row.subject_id, row.date, row.action, row.old_value, row.new_value, row.work_type_id, row.changed_at, row.comment]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((row) => ({
    id: `history:${row.id}`,
    kind: row.action as "added" | "changed" | "commented" | "removed",
    title: row.action === "added" ? `Получена новая оценка — ${diaryGradeLabel({ value: row.new_value ?? 0, provisional_until: row.provisional_until })}` : row.action === "changed" ? `Оценка изменена: ${row.old_value} → ${diaryGradeLabel({ value: row.new_value ?? 0, provisional_until: row.provisional_until })}` : row.action === "removed" ? `Оценка ${row.old_value} удалена` : "Комментарий учителя",
    subject: subjects.get(row.subject_id) ?? "Предмет",
    teacher: row.changed_by_name && row.changed_by_name !== "—" ? row.changed_by_name : "Автор не указан",
    category: row.work_type_id ? categories.get(row.work_type_id) ?? "Категория не указана" : row.action === "commented" ? "Комментарий к уроку" : "Текущая оценка",
    occurredAt: row.changed_at,
    lessonDate: row.date,
    comment: row.comment,
    value: row.action === "added" ? row.new_value : undefined,
    weight: row.weight ?? 1,
    provisional_until: row.provisional_until,
    path: row.grade_id && row.action !== "removed" ? `/diary/student/grade/${row.grade_id}` : undefined,
  }));
}