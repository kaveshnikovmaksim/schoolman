import { test } from "node:test";
import assert from "node:assert/strict";
import { homeworkPath, pendingHomeworkPath, unreadHomeworkIds, diaryReadKey, studentGradeEvents, studentAbsenceEvents, diaryEventDate, readEventIds, type DiaryEvent } from "../src/lib/diaryNotifications";

test("absence events retain subject and lesson date and belong only to the selected student", () => {
  const row = { id: "n", student_id: "a", subject_id: "geo", date: "2026-11-10", type: "unexcused", created_at: "2026-11-12T18:41:00Z" };
  const events = studentAbsenceEvents([row, { ...row, id: "other", student_id: "b" }], "a", new Map([["geo", "География"]]));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Пропуск урока без уведомления");
  assert.equal(events[0].subject, "География");
  assert.equal(events[0].lessonDate, "2026-11-10");
  assert.equal(diaryEventDate(events[0]), "12.11.2026");
  const excused = studentAbsenceEvents([{ ...row, type: "excused" }], "a", new Map())[0];
  assert.equal(excused.title, "Пропуск урока по уважительной причине");
  assert.notEqual(events[0].id, excused.id);
  assert.deepEqual(readEventIds(events, [], [], "a").personal, ["absence:n:unexcused"]);
});

test("opening the feed reads all events, including those outside the selected filter", () => {
  const base = { title: "", subject: "", teacher: "", category: "", occurredAt: "", lessonDate: "" };
  const events: DiaryEvent[] = [{ ...base, id: "hw", kind: "homework" }, { ...base, id: "grade", kind: "added" }, { ...base, id: "change", kind: "changed" }, { ...base, id: "comment", kind: "commented" }];
  const read = readEventIds(events, ["older"], [], "student-a");
  assert.deepEqual(read.common, ["older", "hw"]);
  assert.deepEqual(read.personal, ["grade", "change", "comment"]);
  assert.deepEqual(unreadHomeworkIds(events.map((event) => event.id), [...read.common, ...read.personal]), []);
  assert.deepEqual(readEventIds(events, [], [], null).personal, []);
});

test("notification targets the homework detail in the diary", () => {
  assert.equal(homeworkPath("b54fe6c5-03e7-4c5e-a1dc-048221639521"), "/diary/student/homework/b54fe6c5-03e7-4c5e-a1dc-048221639521");
});

test("deleted grade shows one removal event instead of its obsolete addition", () => {
  const row = { id: "old-add", student_id: "a", subject_id: "geography", grade_id: "old-grade", work_type_id: null, action: "added", old_value: null, new_value: 4, changed_at: "2026-11-12T18:20:00Z", changed_by_name: "Учитель", date: "2026-11-10" };
  const rows = [row, { ...row, id: "delete", action: "removed", old_value: 4, new_value: null }, { ...row, id: "new-add", grade_id: "new-grade" }];
  const events = studentGradeEvents(rows, "a", new Map(), new Map());
  assert.deepEqual(events.map((event) => event.id), ["history:delete", "history:new-add"]);
  assert.equal(events[0].title, "Оценка 4 удалена");
});

test("identical events collapse but separate grades and later grade changes remain", () => {
  const row = { id: "add", student_id: "a", subject_id: "geography", grade_id: "grade", work_type_id: null, action: "added", old_value: null, new_value: 3, changed_at: "2026-11-12T18:20:00Z", changed_by_name: "Учитель", date: "2026-11-10" };
  const events = studentGradeEvents([row, { ...row, id: "duplicate" }, { ...row, id: "second-grade", grade_id: "different-grade" }, { ...row, id: "edit", action: "changed", old_value: 3, new_value: 4, changed_at: "2026-11-12T18:21:00Z" }], "a", new Map(), new Map());
  assert.deepEqual(events.map((event) => event.id), ["history:add", "history:second-grade", "history:edit"]);
  assert.equal(events[2].title, "Оценка изменена: 3 → 4");
});
test("reading grades for one student does not mark another student's events read", () => {
  const storage = new Map<string, string[]>();
  storage.set(diaryReadKey("parent", "class", "student-a"), ["history:grade-a"]);
  assert.deepEqual(unreadHomeworkIds(["history:grade-b"], storage.get(diaryReadKey("parent", "class", "student-b")) ?? []), ["history:grade-b"]);
  assert.notEqual(diaryReadKey("parent", "class", "student-a"), diaryReadKey("parent", "class", "student-b"));
});
test("homework read status is shared for the class and separate from grades", () => {
  assert.equal(diaryReadKey("parent", "class"), "diary_homework_read:parent:class");
  assert.notEqual(diaryReadKey("parent", "class"), diaryReadKey("parent", "class", "student-a"));
});
test("personal events contain grade change, actor, category, lesson date and actual event time", () => {
  const row = { id: "change", student_id: "a", subject_id: "math", grade_id: "grade", work_type_id: "test", action: "changed", old_value: 3, new_value: 4, changed_at: "2026-11-12T18:20:00Z", changed_by_name: "Учитель", date: "2026-11-10", comment: null };
  const events = studentGradeEvents([row, { ...row, id: "other", student_id: "b" }], "a", new Map([["math", "Алгебра"]]), new Map([["test", "Контрольная"]]));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Оценка изменена: 3 → 4");
  assert.equal(events[0].teacher, "Учитель");
  assert.equal(events[0].category, "Контрольная");
  assert.equal(events[0].subject, "Алгебра");
  assert.equal(events[0].occurredAt, "2026-11-12T18:20:00Z");
  assert.equal(events[0].lessonDate, "2026-11-10");
});
test("comment notifications retain the teacher's text and timestamp", () => {
  const row = { id: "comment", student_id: "a", subject_id: "math", grade_id: null, work_type_id: null, action: "commented", old_value: null, new_value: null, changed_at: "2026-11-12T18:21:00Z", changed_by_name: "Учитель", date: "2026-11-10", comment: "Исправь решение" };
  const event = studentGradeEvents([row], "a", new Map(), new Map())[0];
  assert.equal(event.comment, "Исправь решение");
  assert.equal(event.occurredAt, "2026-11-12T18:21:00Z");
  assert.equal(event.kind, "commented");
});
test("new homework remains unread while opened homework is read", () => {
  assert.deepEqual(unreadHomeworkIds(["old-homework", "new-homework"], ["old-homework"]), ["new-homework"]);
});
test("login continuation only accepts a diary homework detail", () => {
  assert.equal(pendingHomeworkPath("/diary/student/homework/b54fe6c5-03e7-4c5e-a1dc-048221639521"), "/diary/student/homework/b54fe6c5-03e7-4c5e-a1dc-048221639521");
  assert.equal(pendingHomeworkPath("https://example.com"), null);
  assert.equal(pendingHomeworkPath("/admin/classes"), null);
});