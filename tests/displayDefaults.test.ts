import { describe, expect, test } from "bun:test";
import { displayClass, displayQuarter } from "../src/lib/displayDefaults";

const quarters = [
  { id: "first", start_date: "2026-09-01", end_date: "2026-11-15" },
  { id: "second", start_date: "2026-11-16", end_date: "2027-02-28" },
  { id: "third", start_date: "2027-03-01", end_date: "2027-05-31" },
];
describe("admin initial display", () => {
  test("journal uses the administrator's second trimester rather than first", () => {
    expect(displayQuarter(quarters, null, "second", "2026-11-14")?.id).toBe("second");
  });
  test("diary can have an independent first trimester default", () => {
    expect(displayQuarter(quarters, null, "first", "2026-11-17")?.id).toBe("first");
  });
  test("automatic mode follows the new trimester", () => {
    expect(displayQuarter(quarters, null, null, "2026-11-17")?.id).toBe("second");
  });
  test("manual navigation overrides initial trimester", () => {
    expect(displayQuarter(quarters, "first", "second", "2026-11-17")?.id).toBe("first");
  });
  test("removed trimester falls back to current calendar period", () => {
    expect(displayQuarter(quarters, null, "deleted", "2026-11-17")?.id).toBe("second");
  });
  test("Frolov's preferred 8А wins over first 7Б", () => {
    expect(displayClass([{ id: "7Б" }, { id: "8А" }], "8А")?.id).toBe("8А");
  });
  test("unassigned default class falls back to an assigned class", () => {
    expect(displayClass([{ id: "7Б" }], "8А")?.id).toBe("7Б");
  });
  test("empty assignment does not fabricate a class", () => {
    expect(displayClass([], "8А")).toBeUndefined();
  });
});