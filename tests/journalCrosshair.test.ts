import { expect, test } from "bun:test";
import { isJournalColumnVisible } from "../src/lib/journalCrosshair";

test("ruler disappears when its date reaches the student list", () => {
  expect(isJournalColumnVisible(179, 221, 180, 900)).toBe(false);
  expect(isJournalColumnVisible(180, 222, 180, 900)).toBe(true);
  expect(isJournalColumnVisible(100, 142, 180, 900)).toBe(false);
});

test("ruler stays within dates and never enters fixed final columns", () => {
  expect(isJournalColumnVisible(858, 900, 180, 900)).toBe(true);
  expect(isJournalColumnVisible(859, 901, 180, 900)).toBe(false);
});