import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useDiaryHomework, useDiaryGradeHistory } from "@/hooks/useSchoolData";
import { diaryReadKey, homeworkPath, studentGradeEvents, studentAbsenceEvents, diaryEventDate, unreadHomeworkIds, readEventIds, type DiaryEvent } from "@/lib/diaryNotifications";

import { diaryGradeLabel, diaryCorrectionDeadline, isDiaryProvisional } from "@/lib/diaryProvisionalGrades";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentDiaryQuarter } from "@/lib/diaryQuarters";

function readIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}
const lessonDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU");
const filters = ["Все", "Оценка", "Задание", "Комментарий", "Пропуск"] as const;
type EventFilter = typeof filters[number];
const eventType = (event: DiaryEvent): EventFilter => event.kind === "absence" ? "Пропуск" : event.kind === "homework" ? "Задание" : event.kind === "commented" ? "Комментарий" : "Оценка";
const feedTime = (time: string) => {
  const date = new Date(time);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const day = date.toDateString() === today.toDateString() ? "Сегодня" : date.toDateString() === yesterday.toDateString() ? "Вчера" : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${day} в ${date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
};

export function HomeworkNotifications({ studentId }: { studentId: string | null }) {
  const today = useDiaryToday();
  const quarters = useQuery({ queryKey: ["diary_quarters"], queryFn: async () => (await supabase.from("academic_quarters").select("id, name, start_date, end_date")).data ?? [] });
  const feedStart = currentDiaryQuarter(quarters.data ?? [], today)?.start_date;
  const inFeed = (time: string) => !feedStart || new Date(time).toLocaleDateString("sv-SE") >= feedStart;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<EventFilter>("Все");
  const [detail, setDetail] = useState<DiaryEvent | null>(null);
  const [, refresh] = useState(0);
  const navigate = useNavigate();
  const { account } = useDiaryAuth();
  const homework = useDiaryHomework(account?.classId);
  const history = useDiaryGradeHistory(account?.classId, studentId);
  const commonKey = diaryReadKey(account?.userId ?? "", account?.classId ?? "");
  const personalKey = diaryReadKey(account?.userId ?? "", account?.classId ?? "", studentId);
  const subjects = new Map(history.data?.subjects.map((s) => [s.id, s.name]) ?? []);
  const personalEvents = studentId ? [...studentGradeEvents(history.data?.rows ?? [], studentId,
    subjects, new Map(history.data?.categories.map((c) => [c.id, c.name]) ?? [])),
    ...studentAbsenceEvents(history.data?.absences ?? [], studentId, subjects)].filter((e) => inFeed(e.occurredAt)) : [];
  const items: DiaryEvent[] = [...(homework.data ?? []).map((item): DiaryEvent => ({
    id: item.id, kind: "homework", title: item.title, subject: item.subjects?.name ?? "Предмет", teacher: item.teachers?.name ?? "Автор не указан",
    category: "Домашнее задание", occurredAt: item.created_at, lessonDate: item.due_date, comment: item.description, path: homeworkPath(item.id),
  })).filter((e) => inFeed(e.occurredAt)), ...personalEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const commonRead = readIds(commonKey);
  const personalRead = readIds(personalKey);
  const unread = new Set([
    ...unreadHomeworkIds(items.filter((i) => i.kind === "homework").map((i) => i.id), commonRead),
    ...unreadHomeworkIds(personalEvents.map((i) => i.id), personalRead),
  ]);
  useEffect(() => {
    if (!open || !account || unread.size === 0) return;
    const next = readEventIds(items, readIds(commonKey), readIds(personalKey), studentId);
    localStorage.setItem(commonKey, JSON.stringify(next.common));
    if (studentId) localStorage.setItem(personalKey, JSON.stringify(next.personal));
    refresh((n) => n + 1);
  }, [open, account, items, commonKey, personalKey, studentId, unread.size]);
  const visibleItems = items.filter((item) => filter === "Все" || eventType(item) === filter);
  const failed = homework.isError || history.isError;
  return <>
    <Button variant="ghost" size="icon" aria-label={unread.size ? `Лента событий: ${unread.size} новых` : "Лента событий"}
      className="relative shrink-0 text-diary-fg" onClick={() => { setFilter("Все"); setOpen(true); }}>
      <Bell />
      {unread.size > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{unread.size > 99 ? "99+" : unread.size}</span>}
    </Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" aria-describedby={undefined} className="flex w-full flex-col gap-0 border-0 bg-diary-surface p-0 text-diary-fg sm:max-w-xl [&>button]:hidden">
        <div className="shrink-0 bg-muted pt-[env(safe-area-inset-top,0px)]">
          <SheetHeader className="relative flex h-16 items-center justify-center space-y-0 px-14">
            <Button variant="ghost" size="icon" aria-label="Назад" className="absolute left-3 top-3 text-diary-fg" onClick={() => setOpen(false)}><ArrowLeft /></Button>
            <SheetTitle className="text-center text-lg text-diary-fg">Лента событий</SheetTitle>
          </SheetHeader>
          <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide" role="group" aria-label="Тип событий">
            {filters.map((value) => <Button key={value} variant="ghost" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`h-10 shrink-0 rounded-full px-4 ${filter === value ? "bg-diary-fg text-diary-surface hover:bg-diary-fg hover:text-diary-surface" : "bg-diary-surface text-diary-fg hover:bg-diary-surface"}`}>{value}</Button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {failed && <div className="px-5 py-4"><p className="text-sm text-destructive">Не удалось загрузить часть событий</p><Button variant="outline" onClick={() => { homework.refetch(); history.refetch(); }}>Повторить</Button></div>}
          {homework.isLoading || history.isLoading ? <p className="px-5 py-8 text-sm text-diary-muted">Загрузка…</p> : visibleItems.length === 0 && !failed ?
            <div className="py-12 text-center text-diary-muted"><Bell className="mx-auto mb-4 h-8 w-8" /><p className="text-sm">Событий пока нет</p></div> : visibleItems.map((item) =>
              <Button key={item.id} variant="ghost" className="block h-auto w-full whitespace-normal rounded-none border-b border-border px-5 py-5 text-left hover:bg-transparent hover:text-inherit active:bg-transparent" onClick={() => {
                if (item.kind === "homework" && item.path) { setOpen(false); navigate(item.path); } else setDetail(item);
              }}>
                <span className="mb-1 flex flex-wrap items-center gap-2 text-xs font-normal">
                  <span className={`rounded-md px-3 py-1 ${item.kind === "removed" || item.kind === "absence" ? "bg-destructive/10 text-destructive" : item.kind === "changed" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>{item.kind === "changed" ? "Изменено" : item.kind === "removed" ? "Удалено" : "Добавлено"}</span>
                  <span className="rounded-md bg-muted px-3 py-1 text-diary-muted">{eventType(item)}</span>
                  <span className="ml-auto text-diary-muted">{item.kind === "absence" ? diaryEventDate(item) : feedTime(item.occurredAt)}</span>
                </span>
                <span className="block break-words text-base font-semibold">{item.subject}</span>
                {item.kind === "added" && item.value != null ? (
                  <span className="mt-3 block break-words text-base font-normal">{item.category}. Получена новая оценка —{"\u00A0"}<span className={`font-semibold ${isDiaryProvisional(item) ? "text-primary" : ""}`}>{diaryGradeLabel({ value: item.value, provisional_until: item.provisional_until })}</span></span>
                ) : <span className={`mt-3 block break-words text-base font-normal ${item.kind === "absence" ? "text-destructive" : ""}`}>{item.kind === "commented" ? item.comment : item.kind === "homework" || item.kind === "absence" ? item.title : `${item.category}. ${item.title}`}</span>}
                {item.kind === "homework" && item.comment && <span className="mt-1 block break-words text-sm font-normal">{item.comment}</span>}
                <span className="mt-3 block break-words text-xs font-normal text-diary-muted">{item.teacher && `${item.teacher} · `}{item.kind === "homework" ? "К" : "За урок"} {lessonDate(item.lessonDate)}</span>
              </Button>
            )}
        </div>
      </SheetContent>
    </Sheet>
    <Dialog open={Boolean(detail)} onOpenChange={(value) => { if (!value) setDetail(null); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle className="break-words pr-5">{detail && !isDiaryProvisional(detail) ? detail.title.replace(/•/g, "") : detail?.title}</DialogTitle></DialogHeader>
        {detail && <div className="space-y-3 text-diary-fg">
          <p className="font-semibold">{detail.subject}</p>
          <p className="text-sm text-diary-muted">{detail.teacher && `${detail.teacher} · `}{detail.category}</p>
          <p className="text-sm">{detail.kind === "homework" ? "Срок задания" : "Дата урока"}: {lessonDate(detail.lessonDate)}</p>
          <p className="text-sm text-diary-muted">{detail.kind === "absence" && "Дата выставления: "}{diaryEventDate(detail)}</p>
          {isDiaryProvisional(detail) && detail.provisional_until && <p className="border-l-4 border-primary bg-primary/10 px-3 py-3 text-sm font-semibold text-primary">{diaryCorrectionDeadline(detail.provisional_until)}</p>}
          {detail.comment && <p className="whitespace-pre-wrap break-words border-t border-border pt-3">{detail.comment}</p>}
          {detail.path && <Button onClick={() => { navigate(detail.path ?? "/diary/student/grades"); setDetail(null); }}>Открыть в дневнике<ChevronRight /></Button>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
