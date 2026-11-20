import { describe, expect, test } from "bun:test";
import { currentDiaryQuarter, visibleDiaryQuarters, oldestFirst } from "../src/lib/diaryQuarters";
const qs = [
  { id: "1", name: "1", start_date: "2026-09-01", end_date: "2026-11-30" },
  { id: "2", name: "2", start_date: "2026-12-01", end_date: "2027-02-28" },
  { id: "3", name: "3", start_date: "2027-03-01", end_date: "2027-05-31" },
];
describe("diary quarters", () => {
  test("future trimesters hidden without grades", () => {
    expect(visibleDiaryQuarters(qs, "2026-11-13", () => false).map((q) => q.id)).toEqual(["1"]);
  });
  test("started trimester shown on top", () => {
    expect(visibleDiaryQuarters(qs, "2026-12-02", () => false).map((q) => q.id)).toEqual(["2", "1"]);
  });
  test("current quarter is latest started", () => {
    expect(currentDiaryQuarter(qs, "2026-12-02")?.id).toBe("2");
  });
  test("grades oldest left, newest right", () => {
    expect(oldestFirst([{ date: "2026-10-06" }, { date: "2026-09-03" }]).map((g) => g.date)).toEqual(["2026-09-03", "2026-10-06"]);
  });
});
