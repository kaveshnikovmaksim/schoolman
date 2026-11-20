import { test } from "node:test";
import assert from "node:assert/strict";
import { diaryAverage, diaryCountedGrades, diaryGradeLabel, isDiaryProvisional, diaryDayRefreshDelay } from "../src/lib/diaryProvisionalGrades";
import { latestGradeTrend, classSubjectRanking } from "../src/lib/diaryGradeStats";
import { studentGradeEvents } from "../src/lib/diaryNotifications";

const pending = { id: "dot", student_id: "a", value: 2, weight: 3, date: "2026-10-06", created_at: "2026-11-13T16:00:00Z", provisional_until: "2026-11-20" };
const fixed = { ...pending, id: "fixed", value: 5, weight: 1, created_at: "2026-11-12T16:00:00Z", provisional_until: null };
test("date-dependent diary rules refresh exactly at the end of the correction day", () => {
  assert.equal(diaryDayRefreshDelay(new Date(2026, 10, 20, 23, 59, 59)), 1000);
  assert.equal(diaryDayRefreshDelay(new Date(2026, 10, 21, 0, 0, 0)), 86400000);
});
test("pending two remains visible with a dot before and on the correction deadline", () => {
  assert.equal(diaryGradeLabel(pending, "2026-11-13"), "2•");
  assert.equal(isDiaryProvisional(pending, "2026-11-20"), true);
});
test("pending two does not affect the weighted mean through its deadline", () => {
  assert.equal(diaryAverage([pending, fixed], "2026-11-20"), 5);
  assert.equal(diaryAverage([pending], "2026-11-13"), null);
});
test("after the deadline the same two loses its dot and enters the weighted mean", () => {
  assert.equal(diaryGradeLabel(pending, "2026-11-21"), "2");
  assert.equal(diaryAverage([pending, fixed], "2026-11-21"), 2.75);
  assert.equal(diaryCountedGrades([pending], "2026-11-21")[0].id, "dot");
});
test("pending two does not lower the grade trend until its deadline passes", () => {
  assert.equal(latestGradeTrend([pending, fixed], "2026-11-20"), null);
  assert.equal(latestGradeTrend([pending, fixed], "2026-11-21"), "down");
});
test("pending two does not change class ranking before deadline", () => {
  const students = [{ id: "a", name: "a" }, { id: "b", name: "b" }];
  const grades = [pending, fixed, { ...fixed, id: "b", student_id: "b", value: 4 }];
  const quarter = { start_date: "2026-09-01", end_date: "2026-11-30" };
  assert.deepEqual(classSubjectRanking(students, grades, quarter, "2026-11-20").map((r) => r.avg), [5, 4]);
  assert.deepEqual(classSubjectRanking(students, grades, quarter, "2026-11-21").map((r) => r.avg), [4, 2.75]);
});
test("grade notification preserves the correction deadline and lesson date", () => {
  const event = studentGradeEvents([{ id: "event", student_id: "a", subject_id: "literature", grade_id: "dot", work_type_id: null, action: "added", old_value: null, new_value: 2, changed_at: "2026-11-13T16:00:00Z", changed_by_name: "Учитель", date: "2026-10-06", provisional_until: "2099-11-20" }], "a", new Map(), new Map())[0];
  assert.equal(event.provisional_until, "2099-11-20");
  assert.equal(event.lessonDate, "2026-10-06");
  assert.equal(event.value, 2);
  assert.equal(event.path, "/diary/student/grade/dot");
});