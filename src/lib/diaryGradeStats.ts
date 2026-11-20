import { weightedAverage, MAX_GRADE_WEIGHT } from "./gradeWeight";
import { diaryCountedGrades, diaryToday } from "./diaryProvisionalGrades";

interface StatGrade {
  id: string;
  value: number;
  weight?: number | null;
  date: string;
  created_at?: string;
  student_id?: string;
  provisional_until?: string | null;
}
interface Student { id: string; name: string }
export type GradeTrend = "up" | "down" | null;

export function latestGradeTrend(grades: StatGrade[], today = diaryToday()): GradeTrend {
  const ordered = diaryCountedGrades(grades, today).sort((a, b) =>
    (b.created_at ?? b.date).localeCompare(a.created_at ?? a.date) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const latest = ordered[0];
  if (!latest) return null;
  const previous = ordered.slice(1);
  if (!previous.length) return null;
  // Compare against the exact prior weighted mean, before display rounding.
  let sum = 0;
  let total = 0;
  for (const grade of previous) {
    const weight = Math.min(MAX_GRADE_WEIGHT, Math.max(1, grade.weight ?? 1));
    sum += grade.value * weight;
    total += weight;
  }
  const difference = latest.value * total - sum;
  return difference > 0 ? "up" : difference < 0 ? "down" : null;
}

export function classSubjectRanking(students: Student[], grades: StatGrade[], quarter?: { start_date: string; end_date: string }, today = diaryToday()) {
  if (!quarter) return [];
  const counted = diaryCountedGrades(grades, today);
  const ratings = students.flatMap((student) => {
    const average = weightedAverage(counted.filter((grade) => grade.student_id === student.id && grade.date >= quarter.start_date && grade.date <= quarter.end_date));
    return average == null ? [] : [{ student, avg: average }];
  }).sort((a, b) => b.avg - a.avg || a.student.name.localeCompare(b.student.name, "ru"));
  return denseRanks(ratings);
}

/** Dense ranking on two-decimal means: ties share a place and no place is skipped. */
export function denseRanks(ratings: { student: Student; avg: number }[]) {
  const groups: { rank: number; students: Student[]; avg: number }[] = [];
  [...ratings].map(r => ({ ...r, avg: Math.round(r.avg * 100) / 100 }))
    .sort((a, b) => b.avg - a.avg || a.student.name.localeCompare(b.student.name, "ru"))
    .forEach((rating) => {
      const previous = groups[groups.length - 1];
      if (previous?.avg === rating.avg) previous.students.push(rating.student);
      else groups.push({ rank: groups.length + 1, students: [rating.student], avg: rating.avg });
    });
  return groups;
}

/** Whole-class rating: mean of a student's weighted subject averages in the trimester. */
export function classOverallRanking(students: Student[], grades: (StatGrade & { subject_id?: string })[], quarter?: { start_date: string; end_date: string }, today = diaryToday()) {
  if (!quarter) return [];
  const counted = diaryCountedGrades(grades, today).filter(g => g.date >= quarter.start_date && g.date <= quarter.end_date);
  return denseRanks(students.flatMap((student) => {
    const mine = counted.filter(g => g.student_id === student.id);
    const subjects = [...new Set(mine.map(g => g.subject_id ?? ""))];
    const avgs = subjects.map(sid => weightedAverage(mine.filter(g => (g.subject_id ?? "") === sid))).filter((a): a is number => a != null);
    return avgs.length ? [{ student, avg: avgs.reduce((x, y) => x + y, 0) / avgs.length }] : [];
  }));
}
