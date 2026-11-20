import { diaryAverage, type ProvisionalGrade } from "./diaryProvisionalGrades";

/** Keep the selected period valid while calendar data loads or changes. */
export function teacherActiveQuarter<T extends { id: string; start_date: string; end_date: string }>(
  quarters: T[], selectedId: string | null, today: string,
): T | undefined {
  return quarters.find(q => q.id === selectedId)
    ?? quarters.find(q => today >= q.start_date && today <= q.end_date)
    ?? quarters[0];
}

export function roundTrimesterGrade(average: number): number {
  const hundredths = Math.round(average * 100);
  const whole = Math.floor(hundredths / 100);
  return whole + (hundredths % 100 > 50 ? 1 : 0);
}

export function automaticTrimesterGrades(
  students: { id: string }[],
  grades: (ProvisionalGrade & { student_id: string; date: string })[],
  quarter: { start_date: string; end_date: string },
  today: string,
) {
  return students.flatMap(student => {
    const average = diaryAverage(grades.filter(g => g.student_id === student.id && g.date >= quarter.start_date && g.date <= quarter.end_date), today);
    return average === null ? [] : [{ student_id: student.id, value: roundTrimesterGrade(average) }];
  });
}