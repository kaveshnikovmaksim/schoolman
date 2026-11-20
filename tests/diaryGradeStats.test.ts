import { test } from "node:test";
import assert from "node:assert/strict";
import { latestGradeTrend, classSubjectRanking } from "../src/lib/diaryGradeStats";

const grade = (value: number, index: number, weight = 1) => ({ id: String(index), value, weight, date: "2026-11-12", created_at: `2026-11-12T${String(index).padStart(2, "0")}:00:00Z` });
test("three after five lowers the mean", () => assert.equal(latestGradeTrend([grade(5, 1), grade(3, 2)]), "down"));
test("another four can lower the mean despite repeating the previous grade", () => assert.equal(latestGradeTrend([grade(5, 1), grade(4, 2), grade(4, 3)]), "down"));
test("a four raises a mean below four", () => assert.equal(latestGradeTrend([grade(3, 1), grade(4, 2)]), "up"));
test("repeated fives have no arrow when mean stays five", () => assert.equal(latestGradeTrend([grade(5, 1), grade(5, 2)]), null));
test("a single five has no arrow", () => assert.equal(latestGradeTrend([grade(5, 1)]), null));
test("repeated twos have no arrow", () => assert.equal(latestGradeTrend([grade(2, 1), grade(2, 2), grade(2, 3)]), null));
test("unchanged mean without five has no arrow", () => assert.equal(latestGradeTrend([grade(4, 1), grade(4, 2)]), null));
test("weighted mean, not the preceding grade, determines direction", () => assert.equal(latestGradeTrend([grade(5, 1, 3), grade(2, 2), grade(4, 3)]), "down"));
test("latest received grade is selected even when backdated", () => assert.equal(latestGradeTrend([grade(5, 1), { ...grade(3, 2), date: "2026-11-01" }]), "down"));
test("rank uses weighted subject grades within the trimester; ties share place and empty students are absent", () => {
  const students = ["a", "b", "c", "empty"].map((id) => ({ id, name: id }));
  const grades = [{ ...grade(5, 1, 3), student_id: "a" }, { ...grade(3, 2), student_id: "a" }, { ...grade(4, 1), student_id: "b" }, { ...grade(4, 1), student_id: "c" }, { ...grade(2, 1), student_id: "a", date: "2026-08-01" }];
  const result = classSubjectRanking(students, grades, { start_date: "2026-09-01", end_date: "2026-11-30" });
  assert.deepEqual(result.map((g) => ({ rank: g.rank, avg: g.avg, ids: g.students.map((s) => s.id) })), [{ rank: 1, avg: 4.5, ids: ["a"] }, { rank: 2, avg: 4, ids: ["b", "c"] }]);
});
test("ties share a place and the next place is not skipped", () => {
  const students = ["a", "b", "c"].map((id) => ({ id, name: id }));
  const result = classSubjectRanking(students, students.map((s, i) => ({ ...grade(i < 2 ? 5 : 3, 1), student_id: s.id })), { start_date: "2026-09-01", end_date: "2026-11-30" });
  assert.deepEqual(result.map((g) => g.rank), [1, 2]);
});
import { classOverallRanking } from "../src/lib/diaryGradeStats";
test("class rating averages subject means across all subjects", () => {
  const students = [{ id: "a", name: "a" }, { id: "b", name: "b" }];
  const gs = [
    { ...grade(5, 1), id: "1", student_id: "a", subject_id: "m" }, { ...grade(5, 1), id: "2", student_id: "a", subject_id: "m" }, { ...grade(3, 1), id: "3", student_id: "a", subject_id: "r" },
    { ...grade(4, 1), id: "4", student_id: "b", subject_id: "m" },
  ];
  const r = classOverallRanking(students, gs, { start_date: "2026-09-01", end_date: "2026-11-30" });
  assert.deepEqual(r.map(g => ({ rank: g.rank, avg: g.avg, ids: g.students.map(s => s.id) })), [{ rank: 1, avg: 4, ids: ["a", "b"] }]);
});
