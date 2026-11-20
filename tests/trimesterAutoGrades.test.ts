import { describe, expect, test } from "bun:test";
import { automaticTrimesterGrades, roundTrimesterGrade, teacherActiveQuarter } from "../src/lib/trimesterAutoGrades";

describe("teacher trimester selection", () => {
  const quarters = [
    { id: "first", start_date: "2026-09-01", end_date: "2026-11-13" },
    { id: "second", start_date: "2026-11-14", end_date: "2027-02-20" },
  ];
  test("both layouts default to the current trimester, not the first", () => {
    expect(teacherActiveQuarter(quarters, null, "2026-11-14")?.id).toBe("second");
  });
  test("keeps an explicitly selected trimester", () => {
    expect(teacherActiveQuarter(quarters, "first", "2026-11-14")?.id).toBe("first");
  });
  test("recovers after a selected trimester is removed", () => {
    expect(teacherActiveQuarter(quarters, "deleted", "2026-11-14")?.id).toBe("second");
  });
  test("handles initial loading and gaps between trimesters", () => {
    expect(teacherActiveQuarter([], null, "2026-11-14")).toBeUndefined();
    expect(teacherActiveQuarter(quarters, null, "2026-08-31")?.id).toBe("first");
  });
});

describe("automatic trimester grades", () => {
  for (const [average, expected] of [[4.50, 4], [4.51, 5], [3.50, 3], [3.51, 4], [2.50, 2], [2.51, 3]]) {
    test(`${average} rounds to ${expected}`, () => expect(roundTrimesterGrade(average)).toBe(expected));
  }
  test("uses weights, skips empty students and other trimester grades", () => {
    expect(automaticTrimesterGrades([{ id: "a" }, { id: "empty" }], [
      { student_id: "a", date: "2026-09-01", value: 5, weight: 3 },
      { student_id: "a", date: "2026-09-02", value: 3, weight: 1 },
      { student_id: "a", date: "2026-12-01", value: 2 },
    ], { start_date: "2026-09-01", end_date: "2026-11-15" }, "2026-11-14")).toEqual([{ student_id: "a", value: 4 }]);
  });
  test("excludes a dot grade through its deadline, then counts it", () => {
    const grades = [
      { student_id: "a", date: "2026-10-01", value: 5 },
      { student_id: "a", date: "2026-10-02", value: 2, provisional_until: "2026-11-14" },
    ];
    const q = { start_date: "2026-09-01", end_date: "2026-11-15" };
    expect(automaticTrimesterGrades([{ id: "a" }], grades, q, "2026-11-14")).toEqual([{ student_id: "a", value: 5 }]);
    expect(automaticTrimesterGrades([{ id: "a" }], grades, q, "2026-11-15")).toEqual([{ student_id: "a", value: 3 }]);
  });
});
import { roundTrimesterGrade as r } from "../src/lib/trimesterAutoGrades";
import { test as t, expect as e } from "bun:test";
t("rounding boundaries for every mark", () => {
  for (const n of [1, 2, 3, 4]) {
    e(r(n + 0.5)).toBe(n);
    e(r(n + 0.51)).toBe(n + 1);
    e(r(n + 0.49)).toBe(n);
  }
  e(r(5)).toBe(5);
});
