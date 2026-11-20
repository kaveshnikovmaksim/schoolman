import { useEffect, useMemo, useRef, useState } from "react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays, Check, Lock, MousePointer2, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAcademicCalendar,
  useClasses,
  useClassSubjects,
  useJournalDateAccess,
  useJournalDateAccessMutations,
  useQuarterMutations,
  useQuarters,
} from "@/hooks/useSchoolData";
import { isDateEditable, isQuarterEditable, todayStr } from "@/lib/journalAccess";
import { cn } from "@/lib/utils";

const WEEKEND_DAYS = [0, 6];

type RangeSel = { rowIdx: number; from: number; to: number } | null;

const AccessControl = () => {
  const today = todayStr();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedQuarterId, setSelectedQuarterId] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // drag-выделение диапазона по строке предмета
  const [dragging, setDragging] = useState(false);
  const [range, setRange] = useState<RangeSel>(null);
  const [rangeDialog, setRangeDialog] = useState<RangeSel>(null);
  // диалог «по дате»: галочки предметов
  const [dateDialogCol, setDateDialogCol] = useState<number | null>(null);
  const [checkedSubjects, setCheckedSubjects] = useState<Set<string>>(new Set());

  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: quarters, isLoading: quartersLoading } = useQuarters();
  const { data: calendarDays, isLoading: calendarLoading } = useAcademicCalendar();
  const { data: classSubjects, isLoading: subjectsLoading } = useClassSubjects(selectedClassId || undefined);
  const { data: openedDates } = useJournalDateAccess(selectedClassId || undefined);
  const { setAccess } = useQuarterMutations();
  const { applyMany } = useJournalDateAccessMutations();

  const sortedQuarters = useMemo(
    () => [...(quarters || [])].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)),
    [quarters]
  );
  const activeQuarterId =
    selectedQuarterId ||
    sortedQuarters.find((q: any) => q.start_date <= today && today <= q.end_date)?.id ||
    sortedQuarters[0]?.id ||
    "";
  const activeQuarter = sortedQuarters.find((q: any) => q.id === activeQuarterId);

  const nonWorkingMap = useMemo(() => {
    const map = new Map<string, string>();
    (calendarDays || []).forEach((d: any) => map.set(d.date, d.label || d.day_type));
    return map;
  }, [calendarDays]);

  const dates = useMemo(() => {
    if (!activeQuarter) return [];
    return eachDayOfInterval({ start: parseISO(activeQuarter.start_date), end: parseISO(activeQuarter.end_date) }).filter(
      (d) => !WEEKEND_DAYS.includes(d.getDay()) && !nonWorkingMap.has(format(d, "yyyy-MM-dd"))
    );
  }, [activeQuarter, nonWorkingMap]);

  const subjects = useMemo(() => {
    return (classSubjects || [])
      .map((cs: any) => ({ id: cs.subject_id, name: cs.subjects?.name || "Предмет" }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [classSubjects]);

  const openedSet = useMemo(() => {
    const s = new Set<string>();
    (openedDates || []).forEach((row: any) => s.add(`${row.subject_id}_${row.date}`));
    return s;
  }, [openedDates]);

  // Открывать отдельные даты можно только когда сам триместр открыт
  const quarterHardClosed = !isQuarterEditable(activeQuarter, today);
  const isNaturalOpen = (iso: string) => isQuarterEditable(activeQuarter, today) && isDateEditable(iso, today);

  // завершение перетаскивания
  const rangeRef = useRef<RangeSel>(null);
  const draggingRef = useRef(false);
  useEffect(() => {
    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      const r = rangeRef.current;
      rangeRef.current = null;
      setRange(null);
      if (r) setRangeDialog(r);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const startDrag = (rowIdx: number, colIdx: number) => {
    if (quarterHardClosed) return;
    draggingRef.current = true;
    setDragging(true);
    rangeRef.current = { rowIdx, from: colIdx, to: colIdx };
    setRange(rangeRef.current);
  };
  const extendDrag = (rowIdx: number, colIdx: number) => {
    if (!draggingRef.current) return;
    const r = rangeRef.current;
    if (!r || r.rowIdx !== rowIdx) return;
    rangeRef.current = { ...r, to: colIdx };
    setRange(rangeRef.current);
  };



  const inRange = (rowIdx: number, colIdx: number) => {
    const r = range || (rangeDialog && !dragging ? rangeDialog : null);
    if (!r || r.rowIdx !== rowIdx) return false;
    return colIdx >= Math.min(r.from, r.to) && colIdx <= Math.max(r.from, r.to);
  };

  const rangeDates = (r: RangeSel) => {
    if (!r) return [] as string[];
    const a = Math.min(r.from, r.to);
    const b = Math.max(r.from, r.to);
    return dates.slice(a, b + 1).map((d) => format(d, "yyyy-MM-dd"));
  };

  const applyRange = (mode: "open" | "close") => {
    if (!rangeDialog || !selectedClassId) return;
    const subject = subjects[rangeDialog.rowIdx];
    const isos = rangeDates(rangeDialog);
    const payload = isos.map((date) => ({ subject_id: subject.id, date }));
    applyMany.mutate(
      {
        class_id: selectedClassId,
        open: mode === "open" ? payload.filter((p) => !openedSet.has(`${p.subject_id}_${p.date}`)) : [],
        close: mode === "close" ? payload.filter((p) => openedSet.has(`${p.subject_id}_${p.date}`)) : [],
      },
      { onSettled: () => setRangeDialog(null) }
    );
  };

  const openDateDialog = (colIdx: number) => {
    if (quarterHardClosed) return;
    const iso = format(dates[colIdx], "yyyy-MM-dd");
    const s = new Set<string>();
    subjects.forEach((sub) => {
      if (openedSet.has(`${sub.id}_${iso}`)) s.add(sub.id);
    });
    setCheckedSubjects(s);
    setDateDialogCol(colIdx);
  };

  const applyDateDialog = () => {
    if (dateDialogCol === null || !selectedClassId) return;
    const iso = format(dates[dateDialogCol], "yyyy-MM-dd");
    const open: { subject_id: string; date: string }[] = [];
    const close: { subject_id: string; date: string }[] = [];
    subjects.forEach((sub) => {
      const was = openedSet.has(`${sub.id}_${iso}`);
      const now = checkedSubjects.has(sub.id);
      if (now && !was) open.push({ subject_id: sub.id, date: iso });
      if (!now && was) close.push({ subject_id: sub.id, date: iso });
    });
    if (!open.length && !close.length) {
      setDateDialogCol(null);
      return;
    }
    applyMany.mutate({ class_id: selectedClassId, open, close }, { onSettled: () => setDateDialogCol(null) });
  };

  const isLoading = classesLoading || quartersLoading || calendarLoading;
  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Управление доступом</h1>
          <p className="text-sm text-muted-foreground mt-1">Открытие триместров и отдельных дат для учителей</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Класс" /></SelectTrigger>
            <SelectContent>
              {(classes || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeQuarterId} onValueChange={setSelectedQuarterId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Триместр" /></SelectTrigger>
            <SelectContent>
              {sortedQuarters.map((q: any) => {
                const editable = isQuarterEditable(q, today);
                return (
                  <SelectItem key={q.id} value={q.id}>
                    <span className="inline-flex items-center gap-2">
                      {!editable && <Lock className="w-3 h-3 text-muted-foreground" />}
                      {q.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Доступ по триместрам</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {sortedQuarters.map((q: any) => {
            const mode = q.access_mode || "auto";
            const editable = isQuarterEditable(q, today);
            return (
              <div key={q.id} className="rounded-lg border border-border p-3 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {!editable && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      {q.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(q.start_date), "dd.MM.yy")} — {format(parseISO(q.end_date), "dd.MM.yy")}
                    </div>
                  </div>
                  <Badge variant={editable ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {editable ? "Открыт" : "Закрыт"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  {(["auto", "open", "closed"] as const).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={mode === m ? "default" : "outline"}
                      className="h-8 px-2 text-xs"
                      onClick={() => setAccess.mutate({ id: q.id, access_mode: m })}
                    >
                      {m === "auto" ? "Авто" : m === "open" ? "Открыть" : "Закрыть"}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Доступ по датам</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedClassId ? (
            <div className="text-sm text-muted-foreground text-center py-10">Выберите класс</div>
          ) : subjectsLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : subjects.length === 0 || dates.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">Нет предметов или дат</div>
          ) : quarterHardClosed ? (
            <div className="text-sm text-muted-foreground text-center py-10 flex flex-col items-center gap-2">
              <Lock className="w-5 h-5" />
              Триместр закрыт. Сначала откройте его кнопкой «Открыть» в блоке выше — после этого можно выделять даты.
            </div>
          ) : (
            <div
              className="overflow-x-auto select-none"
              onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
            >
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="sticky left-0 z-20 bg-card min-w-[190px] text-left px-3 py-2 text-muted-foreground font-medium">Предмет</th>
                    {dates.map((d, colIdx) => {
                      const iso = format(d, "yyyy-MM-dd");
                      const future = !isDateEditable(iso, today);
                      return (
                        <th
                          key={iso}
                          onClick={() => openDateDialog(colIdx)}
                          className={cn(
                            "w-12 min-w-12 px-1 py-2 text-center text-xs font-medium border-r border-border cursor-pointer transition-colors hover:bg-primary/15",
                            hoveredCol === colIdx && "bg-primary/10"
                          )}
                          title="Открыть доступ по предметам на эту дату"
                        >
                          <div className="flex flex-col items-center gap-0.5 leading-none">
                            <span className="flex items-center gap-0.5">
                              {format(d, "dd")}
                              {future && <Lock className="w-2.5 h-2.5 text-muted-foreground/50" />}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{format(d, "EE", { locale: ru })}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject, rowIdx) => (
                    <tr key={subject.id} className="border-b border-border">
                      <td
                        className={cn(
                          "sticky left-0 z-10 bg-card min-w-[190px] px-3 py-2 font-medium text-foreground transition-colors",
                          hoveredRow === rowIdx && "bg-primary/10"
                        )}
                        onMouseEnter={() => setHoveredRow(rowIdx)}
                      >
                        {subject.name}
                      </td>
                      {dates.map((d, colIdx) => {
                        const iso = format(d, "yyyy-MM-dd");
                        const key = `${subject.id}_${iso}`;
                        const opened = openedSet.has(key);
                        const selecting = inRange(rowIdx, colIdx);
                        const natural = isNaturalOpen(iso);
                        const isExact = hoveredRow === rowIdx && hoveredCol === colIdx;
                        return (
                          <td
                            key={key}
                            onMouseDown={() => startDrag(rowIdx, colIdx)}
                            onMouseEnter={() => { setHoveredRow(rowIdx); setHoveredCol(colIdx); extendDrag(rowIdx, colIdx); }}
                            className={cn(
                              "w-12 min-w-12 h-11 text-center border-r border-border cursor-crosshair transition-colors",
                              opened && "bg-primary/70",
                              selecting && "bg-primary/45",
                              !opened && !selecting && natural && "bg-emerald-500/10",
                              !opened && !selecting && isExact && "bg-primary/20"
                            )}
                          >
                            {opened ? (
                              <Check className="w-4 h-4 mx-auto text-primary-foreground" />
                            ) : !natural && isExact && !quarterHardClosed ? (
                              <Lock className="w-3.5 h-3.5 mx-auto text-muted-foreground/60" />
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><MousePointer2 className="w-3.5 h-3.5" /> Зажмите и проведите по строке предмета — откроется диапазон дат.</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Нажмите на число сверху — галочки по предметам.</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-primary/70" /> открыто вручную</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/20" /> доступно по обычным правилам</span>
          </div>
        </CardContent>
      </Card>

      {/* Диапазон дат по предмету */}
      <Dialog open={!!rangeDialog} onOpenChange={(o) => !o && setRangeDialog(null)}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {rangeDialog ? subjects[rangeDialog.rowIdx]?.name : ""}
            </DialogTitle>
          </DialogHeader>
          {rangeDialog && (
            <>
              <div className="text-sm text-muted-foreground">
                с <span className="font-semibold text-foreground">{format(parseISO(rangeDates(rangeDialog)[0]), "d MMMM", { locale: ru })}</span>{" "}
                по{" "}
                <span className="font-semibold text-foreground">
                  {format(parseISO(rangeDates(rangeDialog)[rangeDates(rangeDialog).length - 1]), "d MMMM yyyy", { locale: ru })}
                </span>{" "}
                — {rangeDates(rangeDialog).length} дн.
              </div>
              {quarterHardClosed && (
                <div className="text-xs text-amber-600">Триместр закрыт — сначала откройте триместр кнопкой «Открыть» выше.</div>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" disabled={quarterHardClosed || applyMany.isPending} onClick={() => applyRange("open")}>
                  Открыть доступ
                </Button>
                <Button variant="outline" className="flex-1" disabled={applyMany.isPending} onClick={() => applyRange("close")}>
                  Закрыть
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Дата → предметы галочками */}
      <Dialog open={dateDialogCol !== null} onOpenChange={(o) => !o && setDateDialogCol(null)}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {dateDialogCol !== null && dates[dateDialogCol]
                ? format(dates[dateDialogCol], "d MMMM yyyy, EEEE", { locale: ru })
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground -mt-2">Отметьте предметы, для которых открыт доступ в этот день</div>
          <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
            {subjects.map((sub) => {
              const checked = checkedSubjects.has(sub.id);
              return (
                <label
                  key={sub.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary/60"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setCheckedSubjects((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(sub.id); else next.delete(sub.id);
                        return next;
                      })
                    }
                    className="rounded-full"
                  />
                  <span className="text-sm text-foreground">{sub.name}</span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={quarterHardClosed || applyMany.isPending} onClick={applyDateDialog}>
              Сохранить
            </Button>
            <Button variant="outline" onClick={() => setDateDialogCol(null)}>Отмена</Button>
          </div>
          {quarterHardClosed && (
            <div className="text-xs text-amber-600">Триместр закрыт администратором — сначала откройте триместр.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessControl;
