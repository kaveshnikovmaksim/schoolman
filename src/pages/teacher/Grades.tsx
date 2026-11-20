import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudents, useAcademicCalendar, useGrades, useGradeMutations, useWorkTypes, useScheduledWorks, useScheduledWorkMutations, useTrimesterGrades, useTrimesterGradeMutations, useQuarters, useTrimesterGradesByClassSubject, useAbsences, useAbsenceMutations, useCellComments, useCellCommentMutations, useClasses, useSubjects, useClassSchedule, useJournalDateAccess } from "@/hooks/useSchoolData";
import { useTeacherContext } from "@/contexts/TeacherContext";
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import GradeCell from "@/components/grades/GradeCell";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileGrades from "@/components/grades/MobileGrades";
import { Download, Upload } from "lucide-react";
import { exportGradesToExcel, parseGradesXlsx, type ImportedGrade } from "@/lib/excelExport";
import { useToast } from "@/hooks/use-toast";
import ClassStatsPanel from "@/components/grades/ClassStatsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { weightedAverage } from "@/lib/gradeWeight";
import { isQuarterEditable, quarterLockReason, isDateEditable, todayStr, hasEditableDateInQuarter, isCellEditable } from "@/lib/journalAccess";
import HomeworkDateButton from "@/components/grades/HomeworkDateButton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import AutoTrimesterButton from "@/components/grades/AutoTrimesterButton";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { useDisplayDefaults } from "@/hooks/useSchoolData";
import { displayQuarter } from "@/lib/displayDefaults";
import { isJournalColumnVisible } from "@/lib/journalCrosshair";


const gradeColor = (g: number, isProvisional: boolean) => {
  const base = g === 5 ? "text-emerald-600" : g === 4 ? "text-primary" : g === 3 ? "text-amber-500" : g === 2 ? "text-destructive" : "";
  return `${base} ${isProvisional ? "font-medium opacity-60" : "font-semibold"}`;
};

const WEEKEND_DAYS = [0, 6];
const TRIMESTER_GRADES = [5, 4, 3, 2] as const;

export type GradeEntry = { id: string; value: number; provisional_until: string | null; work_type_id: string | null; work_type_name?: string; work_type_short?: string; comment?: string | null; weight?: number };

export const isProvisionalActive = (provisionalUntil: string | null) => {
  if (!provisionalUntil) return false;
  return !isBefore(parseISO(provisionalUntil), startOfDay(new Date()));
};

export { gradeColor };

const calcYearlyGrade = (trimesterValues: number[]): string => {
  if (trimesterValues.length === 0) return "—";
  const avg = trimesterValues.reduce((s, v) => s + v, 0) / trimesterValues.length;
  if (trimesterValues.length < 3) return avg.toFixed(2);
  const rounded = avg - Math.floor(avg) > 0.5 ? Math.ceil(avg) : Math.floor(avg);
  return String(rounded);
};

const Grades = () => {
  const isMobile = useIsMobile();
  const { selectedClassId, selectedSubjectId, isCurrentSubjectPending, teacherId } = useTeacherContext();
  const [selectedQuarterId, setSelectedQuarterId] = useState<string | null>(null);
  const [openCell, setOpenCell] = useState<string | null>(null);
  
  const [openTrimesterCell, setOpenTrimesterCell] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [importDialog, setImportDialog] = useState<{ rows: ImportedGrade[]; resolved: { studentId: string; date: string; value: number; studentName: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: classesData } = useClasses();
  const { data: subjectsData } = useSubjects();

  const { data: students } = useStudents(selectedClassId || undefined);
  const { data: grades } = useGrades(selectedClassId || undefined, selectedSubjectId || undefined);
  const { data: calendarDays } = useAcademicCalendar();
  const { data: workTypes } = useWorkTypes(selectedSubjectId || undefined);
  const { data: scheduledWorks } = useScheduledWorks(selectedClassId || undefined, selectedSubjectId || undefined);
  const { add, remove, update } = useGradeMutations();
  const scheduledWorkMutations = useScheduledWorkMutations();
  const { data: quarters } = useQuarters();
  const { data: absencesData } = useAbsences(selectedClassId || undefined, selectedSubjectId || undefined);
  const absenceMutations = useAbsenceMutations();
  const { data: cellCommentsData } = useCellComments(selectedClassId || undefined, selectedSubjectId || undefined);
  const cellCommentMutations = useCellCommentMutations();

  const cellCommentsMap = useMemo(() => {
    const map = new Map<string, string>();
    cellCommentsData?.forEach((c: any) => {
      map.set(`${c.student_id}_${c.date}`, c.comment || "");
    });
    return map;
  }, [cellCommentsData]);

  const sortedQuarters = useMemo(() => {
    if (!quarters?.length) return [];
    return [...quarters].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date));
  }, [quarters]);

  const today = useDiaryToday();
  const { data: displayDefaults } = useDisplayDefaults();
  const activeQuarter = displayQuarter(sortedQuarters, selectedQuarterId, displayDefaults?.find(r => r.target === "journal")?.quarter_id, today);
  const activeQuarterId = activeQuarter?.id || null;
  const quarterEditable = isQuarterEditable(activeQuarter, today);
  const quarterLockText = quarterLockReason(activeQuarter, today);
  const quarterHardClosed = (activeQuarter?.access_mode || "auto") === "closed";

  const { data: trimesterGradesData } = useTrimesterGrades(
    selectedClassId || undefined, selectedSubjectId || undefined, activeQuarterId || undefined
  );
  const { data: allTrimesterGradesData } = useTrimesterGradesByClassSubject(
    selectedClassId || undefined, selectedSubjectId || undefined
  );
  const trimesterMutations = useTrimesterGradeMutations();

  const trimesterGradesMap = useMemo(() => {
    const map: Record<string, number> = {};
    trimesterGradesData?.forEach((tg: any) => { map[tg.student_id] = tg.value; });
    return map;
  }, [trimesterGradesData]);

  const yearlyGradesMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    allTrimesterGradesData?.forEach((tg: any) => {
      if (!map[tg.student_id]) map[tg.student_id] = [];
      map[tg.student_id].push(tg.value);
    });
    return map;
  }, [allTrimesterGradesData]);

  const nonWorkingMap = useMemo(() => {
    const map = new Map<string, { type: string; label: string }>();
    calendarDays?.forEach((d: any) => {
      map.set(d.date, { type: d.day_type, label: d.label || "" });
    });
    return map;
  }, [calendarDays]);

  const isNonWorking = (date: Date) => {
    if (WEEKEND_DAYS.includes(date.getDay())) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return nonWorkingMap.has(dateStr);
  };

  // Утверждённое расписание класса (если есть) ограничивает даты днями уроков предмета
  const { data: publishedSchedule } = useClassSchedule(selectedClassId || undefined, true);
  const { data: openedDateRows } = useJournalDateAccess(selectedClassId || undefined, selectedSubjectId || undefined);

  const openedDates = useMemo(() => {
    return new Set((openedDateRows || []).map((row: any) => row.date));
  }, [openedDateRows]);

  const subjectWeekdays = useMemo(() => {
    if (!publishedSchedule || publishedSchedule.length === 0) return null;
    const forSubject = publishedSchedule.filter((s) => s.subject_id === selectedSubjectId);
    if (forSubject.length === 0) return null;
    return new Set(forSubject.map((s) => s.day_of_week % 7)); // 7=вс -> 0
  }, [publishedSchedule, selectedSubjectId]);

  // Домашние задания класса по этому предмету — для «домика» над датой
  const { data: journalHomework } = useQuery({
    queryKey: ["journal_homework", selectedClassId, selectedSubjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("id, title, description, due_date")
        .eq("class_id", selectedClassId!)
        .eq("subject_id", selectedSubjectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClassId && !!selectedSubjectId,
  });

  const homeworkByDate = useMemo(() => {
    const map = new Map<string, { id: string; title: string; description: string | null }>();
    (journalHomework || []).forEach((hw: any) => map.set(hw.due_date, { id: hw.id, title: hw.title, description: hw.description }));
    return map;
  }, [journalHomework]);

  // Only working dates
  const workingDates = useMemo(() => {
    if (!activeQuarter) return [];
    const allDates = eachDayOfInterval({ start: parseISO(activeQuarter.start_date), end: parseISO(activeQuarter.end_date) });
    return allDates.filter(d => !isNonWorking(d) && (!subjectWeekdays || subjectWeekdays.has(d.getDay())));
  }, [activeQuarter, nonWorkingMap, subjectWeekdays]);

  // Триместровую оценку можно ставить только когда есть хотя бы одна доступная дата
  const trimesterEditable = useMemo(
    () => hasEditableDateInQuarter(workingDates.map((d) => format(d, "yyyy-MM-dd")), activeQuarter, openedDates, today),
    [workingDates, activeQuarter, openedDates, today]
  );
  const trimesterLockText = trimesterEditable
    ? null
    : quarterLockText || "Нет ни одной открытой даты для выставления оценок — триместровую оценку поставить нельзя";

  const scheduledWorksMap = useMemo(() => {
    const map = new Map<string, { work_type_id: string; short_name: string; name: string }>();
    scheduledWorks?.forEach((sw: any) => {
      map.set(sw.date, {
        work_type_id: sw.work_type_id,
        short_name: sw.work_types?.short_name || "?",
        name: sw.work_types?.name || "",
      });
    });
    return map;
  }, [scheduledWorks]);

  const gradesMap = useMemo(() => {
    const map = new Map<string, GradeEntry[]>();
    grades?.forEach((g: any) => {
      const key = `${g.student_id}_${g.date}`;
      const arr = map.get(key) || [];
      arr.push({ id: g.id, value: g.value, provisional_until: g.provisional_until, work_type_id: g.work_type_id, work_type_name: g.work_types?.name, work_type_short: g.work_types?.short_name, comment: g.comment, weight: g.weight ?? 1 });
      map.set(key, arr);
    });
    return map;
  }, [grades]);

  // Last work type used per date column (most recently created grade in that date)
  const columnLastWorkTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...(grades || [])].sort((a: any, b: any) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    );
    sorted.forEach((g: any) => {
      if (!g.work_type_id) return;
      if (!map.has(g.date)) map.set(g.date, g.work_type_id);
    });
    return map;
  }, [grades]);

  const absencesMap = useMemo(() => {
    const map = new Map<string, string>();
    absencesData?.forEach((a: any) => {
      map.set(`${a.student_id}_${a.date}`, a.type);
    });
    return map;
  }, [absencesData]);

  const handleAddGrade = (studentId: string, dateStr: string, value: number, provisionalUntil?: string, workTypeId?: string, comment?: string, weight?: number) => {
    if (isCurrentSubjectPending) return;
    if (!isCellEditable(dateStr, activeQuarter, openedDates as Set<string>, today)) return;
    add.mutate({
      student_id: studentId,
      subject_id: selectedSubjectId!,
      class_id: selectedClassId!,
      date: dateStr,
      value,
      provisional_until: provisionalUntil || null,
      work_type_id: workTypeId || null,
      comment: comment || null,
      weight: weight && weight > 1 ? weight : 1,
    });
  };

  const handleRemoveGrade = (gradeId: string) => {
    if (isCurrentSubjectPending) return;
    remove.mutate({ id: gradeId });
  };

  const handleUpdateGrade = (gradeId: string, value: number) => {
    if (isCurrentSubjectPending) return;
    update.mutate({ id: gradeId, value });
  };

  const getAverage = (studentId: string): string => {
    if (!activeQuarter) return "—";
    const qStart = parseISO(activeQuarter.start_date);
    const qEnd = parseISO(activeQuarter.end_date);
    const studentGrades = grades?.filter((g: any) => {
      if (g.student_id !== studentId) return false;
      const gDate = parseISO(g.date);
      return isWithinInterval(gDate, { start: qStart, end: qEnd }) && !isProvisionalActive(g.provisional_until);
    }) || [];
    if (studentGrades.length === 0) return "—";
    const avg = weightedAverage(studentGrades.map((g: any) => ({ value: g.value, weight: g.weight })));
    return avg == null ? "—" : avg.toFixed(2);
  };

  const handleCellHover = useCallback((rowIdx: number | null, colIdx: number | null) => {
    // Lock crosshair while a popover is open
    if (openCell) return;
    setHoveredRow(rowIdx);
    setHoveredCol(colIdx);
  }, [openCell]);

  const clearCrosshair = useCallback(() => {
    setHoveredRow(null);
    setHoveredCol(null);
  }, []);

  // ===== Export to Excel =====
  const handleExport = () => {
    if (!students || !workingDates.length || !activeQuarter) return;
    const className = classesData?.find((c: any) => c.id === selectedClassId)?.name || "Класс";
    const subjectName = subjectsData?.find((s: any) => s.id === selectedSubjectId)?.name || "Предмет";
    const dates = workingDates.map((d) => format(d, "yyyy-MM-dd"));
    const rows = students.map((s: any) => ({
      studentName: s.name,
      cells: dates.map((dateStr) => {
        const absence = absencesMap.get(`${s.id}_${dateStr}`);
        if (absence) return { date: dateStr, values: absence === "excused" ? "Н" : "Н" };
        const cellGrades = gradesMap.get(`${s.id}_${dateStr}`) || [];
        return {
          date: dateStr,
          values: cellGrades.filter((g) => !isProvisionalActive(g.provisional_until)).map((g) => g.value).join(","),
        };
      }),
      average: getAverage(s.id),
      trimester: trimesterGradesMap[s.id] ?? "",
    }));
    exportGradesToExcel({ className, subjectName, quarterName: activeQuarter.name, dates, rows });
    toast({ title: "Экспортировано", description: "Файл Excel сохранён" });
  };

  // ===== Import from Excel =====
  const handleImportFile = async (file: File) => {
    if (!students || !workingDates.length) return;
    try {
      const dates = workingDates.map((d) => format(d, "yyyy-MM-dd"));
      const parsed = await parseGradesXlsx(file, dates);
      // Resolve student names → ids (case-insensitive, trimmed)
      const nameMap = new Map<string, string>();
      students.forEach((s: any) => nameMap.set(s.name.trim().toLowerCase(), s.id));
      const resolved = parsed.flatMap((p) => {
        const id = nameMap.get(p.studentName.trim().toLowerCase());
        if (!id) return [];
        return [{ studentId: id, date: p.date, value: p.value, studentName: p.studentName }];
      });
      if (resolved.length === 0) {
        toast({ title: "Нечего импортировать", description: "Не найдено новых оценок или ученики не сопоставлены", variant: "destructive" });
        return;
      }
      setImportDialog({ rows: parsed, resolved });
    } catch (e: any) {
      toast({ title: "Ошибка импорта", description: e.message || String(e), variant: "destructive" });
    }
  };

  const confirmImport = () => {
    if (!importDialog) return;
    importDialog.resolved.forEach((r) => {
      add.mutate({
        student_id: r.studentId,
        subject_id: selectedSubjectId!,
        class_id: selectedClassId!,
        date: r.date,
        value: r.value,
        provisional_until: null,
        work_type_id: null,
        comment: null,
      });
    });
    toast({ title: "Импорт завершён", description: `Добавлено: ${importDialog.resolved.length}` });
    setImportDialog(null);
  };

  // Class statistics
  const classAverages = useMemo(
    () => (students || []).map((s: any) => getAverage(s.id)),
    [students, grades, activeQuarter]
  );
  const twosCount = useMemo(() => {
    if (!activeQuarter) return 0;
    const qStart = parseISO(activeQuarter.start_date);
    const qEnd = parseISO(activeQuarter.end_date);
    return (grades || []).filter((g: any) => {
      const d = parseISO(g.date);
      return g.value === 2 && isWithinInterval(d, { start: qStart, end: qEnd }) && !isProvisionalActive(g.provisional_until);
    }).length;
  }, [grades, activeQuarter]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const handleJournalScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || hoveredCol === null) return;
    const column = container.querySelector<HTMLElement>(`[data-journal-column="${hoveredCol}"]`);
    const studentsHeader = container.querySelector<HTMLElement>("[data-journal-students]");
    const averageHeader = container.querySelector<HTMLElement>("[data-journal-average]");
    if (!column || !studentsHeader || !averageHeader) {
      clearCrosshair();
      return;
    }
    const columnRect = column.getBoundingClientRect();
    if (!isJournalColumnVisible(columnRect.left, columnRect.right, studentsHeader.getBoundingClientRect().right, averageHeader.getBoundingClientRect().left)) {
      clearCrosshair();
    }
  }, [hoveredCol, clearCrosshair]);

  useEffect(() => {
    clearCrosshair();
  }, [selectedClassId, selectedSubjectId, activeQuarterId, clearCrosshair]);
  const dateColumnWidth = workingDates.length > 0 && workingDates.length <= 10 ? 84 : workingDates.length <= 14 ? 64 : 42;
  const dateColumnClass = dateColumnWidth === 84
    ? "w-[84px] min-w-[84px]"
    : dateColumnWidth === 64
    ? "w-[64px] min-w-[64px]"
    : "w-[42px] min-w-[42px]";
  const scrollByColumns = useCallback((direction: 1 | -1) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * dateColumnWidth, behavior: "smooth" });
    }
  }, [dateColumnWidth]);

  // Hold-to-scroll: smooth continuous scroll using requestAnimationFrame
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const scrollingRef = useRef(false);

  const startSmoothScroll = useCallback((direction: 1 | -1) => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    const SPEED_PX_PER_FRAME = 10;
    const step = () => {
      if (!scrollingRef.current || !scrollRef.current) return;
      scrollRef.current.scrollLeft += direction * SPEED_PX_PER_FRAME;
      rafIdRef.current = requestAnimationFrame(step);
    };
    rafIdRef.current = requestAnimationFrame(step);
  }, []);

  const startHoldScroll = useCallback((direction: 1 | -1) => {
    scrollByColumns(direction);
    holdTimerRef.current = setTimeout(() => {
      startSmoothScroll(direction);
    }, 250);
  }, [scrollByColumns, startSmoothScroll]);

  const stopHoldScroll = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    scrollingRef.current = false;
    if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
  }, []);

  useEffect(() => {
    return () => stopHoldScroll();
  }, [stopHoldScroll]);

  if (isMobile) {
    return <MobileGrades />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Журнал оценок</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <AutoTrimesterButton classId={selectedClassId} subjectId={selectedSubjectId} quarter={activeQuarter} students={students} grades={grades} disabled={isCurrentSubjectPending || !trimesterEditable} disabledReason={isCurrentSubjectPending ? "Предмет доступен только для просмотра" : trimesterLockText} />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!students?.length || !activeQuarter}>
            <Download className="w-4 h-4 mr-1.5" /> Экспорт
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isCurrentSubjectPending || !students?.length || !activeQuarter}>
            <Upload className="w-4 h-4 mr-1.5" /> Импорт
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }}
          />
          <Select value={activeQuarterId || ""} onValueChange={(v) => setSelectedQuarterId(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Выберите триместр" />
            </SelectTrigger>
            <SelectContent>
              {sortedQuarters.map((q: any) => (
                <SelectItem key={q.id} value={q.id}>
                  <span className="inline-flex items-center gap-2">
                    {!isQuarterEditable(q, today) && <Lock className="w-3 h-3 text-muted-foreground" />}
                    {q.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeQuarter && !quarterEditable && (
        <div className="mb-4 p-3 rounded-lg bg-secondary border border-border flex items-start gap-2 text-sm">
          <Lock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <div className="font-semibold text-foreground">Триместр закрыт для выставления оценок</div>
            <div className="text-xs text-muted-foreground">{quarterLockText} Просмотр оценок и дат доступен.</div>
          </div>
        </div>
      )}

      {isCurrentSubjectPending && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-sm">
          <span className="text-base">🔒</span>
          <div>
            <div className="font-semibold text-amber-700">Только для просмотра</div>
            <div className="text-xs text-muted-foreground">
              Ваша заявка на отказ от этого предмета на рассмотрении у администратора. Редактирование временно недоступно — вы можете только просматривать оценки и пропуски.
            </div>
          </div>
        </div>
      )}

      {!selectedClassId || !selectedSubjectId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Выберите класс и предмет в верхней панели</CardContent></Card>
      ) : !activeQuarter ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет настроенных триместров. Добавьте их в учебном календаре.</CardContent></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between gap-1 px-3 py-1.5 border-b border-border bg-secondary/30">
              <span className="text-xs text-muted-foreground">
                {format(parseISO(activeQuarter.start_date), "dd.MM.yyyy")} — {format(parseISO(activeQuarter.end_date), "dd.MM.yyyy")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={() => startHoldScroll(-1)}
                  onMouseUp={stopHoldScroll}
                  onMouseLeave={stopHoldScroll}
                  onTouchStart={() => startHoldScroll(-1)}
                  onTouchEnd={stopHoldScroll}
                  className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" aria-label="Scroll left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button
                  onMouseDown={() => startHoldScroll(1)}
                  onMouseUp={stopHoldScroll}
                  onMouseLeave={stopHoldScroll}
                  onTouchStart={() => startHoldScroll(1)}
                  onTouchEnd={stopHoldScroll}
                  className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" aria-label="Scroll right">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            <CardContent className="p-0 overflow-x-auto scrollbar-hide isolate" ref={scrollRef} onScroll={handleJournalScroll}>
              <table className="text-sm border-collapse min-w-full" onMouseLeave={clearCrosshair}>
                <thead>
                  {/* Month labels row */}
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="sticky left-0 bg-card z-20 min-w-[180px]" style={{ boxShadow: 'inset -1px 0 0 0 hsl(var(--border))' }} />
                    {(() => {
                      const spans: { month: number; year: number; label: string; count: number }[] = [];
                      workingDates.forEach((d) => {
                        const m = d.getMonth();
                        const y = d.getFullYear();
                        const last = spans[spans.length - 1];
                        if (last && last.month === m && last.year === y) {
                          last.count++;
                        } else {
                          spans.push({ month: m, year: y, label: format(d, "LLL", { locale: ru }), count: 1 });
                        }
                      });
                      return spans.map((span, i) => (
                        <th
                          key={`month-${i}`}
                          colSpan={span.count}
                          className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1 border-r border-border"
                        >
                          {span.label}
                        </th>
                      ));
                    })()}
                    <th className="w-[56px] min-w-[56px] sticky right-[56px] z-20 bg-[hsl(0,70%,95%)]" style={{ boxShadow: 'inset 1px 0 0 0 hsl(0 70% 60%), inset -1px 0 0 0 hsl(0 70% 60%)' }} />
                    <th className="w-[56px] min-w-[56px] sticky right-0 z-20 bg-[hsl(0,70%,95%)]" style={{ boxShadow: 'inset 1px 0 0 0 hsl(0 70% 60%), inset -1px 0 0 0 hsl(0 70% 60%)' }} />
                  </tr>
                  <tr className="border-b border-border bg-secondary/50">
                    <th data-journal-students className="text-left py-2 px-3 font-medium text-muted-foreground sticky left-0 bg-card min-w-[180px] z-20" style={{ boxShadow: 'inset -1px 0 0 0 hsl(var(--border))' }} onMouseEnter={clearCrosshair}>Ученик</th>
                    {workingDates.map((d, colIdx) => {
                      const isHovered = hoveredCol === colIdx;
                      const dStr = format(d, "yyyy-MM-dd");
                      const hasAnyManualOpen = openedDates.has(dStr);
                      const dateLocked = !isCellEditable(dStr, activeQuarter, openedDates as Set<string>, today);
                      return (
                        <th
                          key={d.toISOString()}
                          data-journal-column={colIdx}
                          className={`py-1 px-0 font-medium text-center ${dateColumnClass} text-xs border-r border-border transition-colors ${
                            isHovered ? "bg-primary/15" : ""
                          } text-muted-foreground`}
                        >
                          <div className="flex flex-col items-center gap-0.5 leading-none">
                            <span className="flex items-center gap-0.5">
                              {format(d, "dd")}
                              {dateLocked && <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />}
                            </span>
                            {selectedClassId && selectedSubjectId && (
                              <HomeworkDateButton
                                dateStr={dStr}
                                classId={selectedClassId}
                                subjectId={selectedSubjectId}
                                teacherId={teacherId}
                                homework={homeworkByDate.get(dStr) || null}
                                disabled={isCurrentSubjectPending}
                              />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th data-journal-average className="py-2 px-2 font-semibold text-center w-[56px] min-w-[56px] bg-[hsl(0,70%,95%)] text-destructive sticky right-[56px] z-20" style={{ boxShadow: 'inset 1px 0 0 0 hsl(0 70% 60%), inset -1px 0 0 0 hsl(0 70% 60%)' }} onMouseEnter={clearCrosshair}>Ср.</th>
                    <th className="py-2 px-2 font-semibold text-center w-[56px] min-w-[56px] bg-[hsl(0,70%,95%)] text-destructive sticky right-0 z-20" style={{ boxShadow: 'inset 1px 0 0 0 hsl(0 70% 60%), inset -1px 0 0 0 hsl(0 70% 60%)' }} onMouseEnter={() => handleCellHover(null, null)}>Трим.</th>
                  </tr>
                </thead>
                <tbody>
                  {students?.map((s: any, rowIdx: number) => {
                    const isRowHovered = hoveredRow === rowIdx;
                    return (
                      <tr key={s.id} className="border-b border-border">
                        <td
                          className={`py-0 px-3 font-medium text-foreground sticky left-0 z-10 text-sm transition-colors ${isRowHovered ? "journal-student-highlight" : "bg-card"}`}
                          style={{ boxShadow: 'inset -1px 0 0 0 hsl(var(--border))' }}
                          onMouseEnter={clearCrosshair}
                        >
                          {s.name}
                        </td>
                        {workingDates.map((d, colIdx) => {
                          const dateStr = format(d, "yyyy-MM-dd");
                          const cellGrades = gradesMap.get(`${s.id}_${dateStr}`) || [];
                          const cellKey = `${s.id}_${dateStr}`;
                          const isCellHoveredRow = hoveredRow === rowIdx;
                          const isCellHoveredCol = hoveredCol === colIdx;
                          const isCrossHair = isCellHoveredRow || isCellHoveredCol;
                          const isExact = isCellHoveredRow && isCellHoveredCol;
                          const nwBg = rowIdx % 2 === 0 ? "bg-card" : "bg-secondary/20";
                          const absenceKey = `${s.id}_${dateStr}`;
                          const absenceType = absencesMap.get(absenceKey) || null;
                          const manuallyOpened = openedDates.has(dateStr);
                          const cellLocked = !isCellEditable(dateStr, activeQuarter, openedDates as Set<string>, today);

                          return (
                            <td
                              key={d.toISOString()}
                              className={`py-0 px-0 text-center border-r border-border ${dateColumnClass} h-[38px] transition-colors ${
                                isExact ? "bg-[hsl(270,60%,75%,0.35)]" : isCrossHair ? "bg-primary/10" : nwBg
                              }`}
                              onMouseEnter={() => handleCellHover(rowIdx, colIdx)}
                            >
                              <GradeCell
                                cellKey={cellKey}
                                grades={cellGrades}
                                isOpen={openCell === cellKey}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setHoveredRow(rowIdx);
                                    setHoveredCol(colIdx);
                                    setOpenCell(cellKey);
                                  } else {
                                    setOpenCell(null);
                                  }
                                }}
                                onAddGrade={(value, provisionalUntil, workTypeId, comment, weight) => handleAddGrade(s.id, dateStr, value, provisionalUntil, workTypeId, comment, weight)}
                                onRemoveGrade={handleRemoveGrade}
                                onUpdateGrade={handleUpdateGrade}
                                workTypes={workTypes || []}
                                dateStr={dateStr}
                                columnLastWorkType={columnLastWorkTypeMap.get(dateStr) || ""}
                                cellComment={cellCommentsMap.get(cellKey) || ""}
                                onSaveComment={(text) => { if (!isCurrentSubjectPending) cellCommentMutations.upsert.mutate({ student_id: s.id, class_id: selectedClassId!, subject_id: selectedSubjectId!, date: dateStr, comment: text }); }}
                                studentName={s.name}
                                studentId={s.id}
                                subjectId={selectedSubjectId || undefined}
                                absenceType={absenceType}
                                onSetAbsence={(type) => { if (!isCurrentSubjectPending) absenceMutations.upsert.mutate({ student_id: s.id, class_id: selectedClassId!, subject_id: selectedSubjectId!, date: dateStr, type }); }}
                                onRemoveAbsence={() => { if (!isCurrentSubjectPending) absenceMutations.remove.mutate({ student_id: s.id, class_id: selectedClassId!, subject_id: selectedSubjectId!, date: dateStr }); }}
                                readOnly={isCurrentSubjectPending}
                                locked={cellLocked}
                                showLock={isExact}
                                lockReason={
                                  !quarterEditable
                                    ? quarterLockText || undefined
                                    : "Урок ещё не состоялся — оценку можно поставить не раньше дня урока"
                                }
                              />
                            </td>
                          );
                        })}
                        {/* Average cell */}
                        <td className="py-0 px-2 text-center sticky right-[56px] z-10 bg-[hsl(0,70%,97%)]" style={{ boxShadow: 'inset 1px 0 0 0 hsl(0 70% 60%), inset -1px 0 0 0 hsl(0 70% 60%)' }} onMouseEnter={() => handleCellHover(null, null)}>
                          <span className="font-semibold text-foreground text-sm">{getAverage(s.id)}</span>
                        </td>
                        {/* Trimester grade cell */}
                        <td className="py-0 px-0 text-center sticky right-0 z-10 bg-[hsl(0,70%,97%)]" style={{ boxShadow: 'inset 1px 0 0 0 hsl(0 70% 60%), inset -1px 0 0 0 hsl(0 70% 60%)' }} onMouseEnter={() => handleCellHover(null, null)}>
                          <Popover open={openTrimesterCell === s.id} onOpenChange={(open) => { if (isCurrentSubjectPending || !trimesterEditable) return; setOpenTrimesterCell(open ? s.id : null); }}>
                            <PopoverTrigger asChild>
                              <button
                                disabled={isCurrentSubjectPending || !trimesterEditable}
                                title={trimesterLockText || undefined}
                                className="w-full h-full min-h-[36px] flex items-center justify-center text-sm font-semibold text-foreground hover:bg-destructive/20 transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent group"
                              >
                                {trimesterGradesMap[s.id] ?? (!trimesterEditable ? <Lock className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /> : "")}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="left" align="center">
                              <div className="text-xs text-muted-foreground mb-1.5">Триместровая оценка:</div>
                              <div className="flex gap-1">
                                {TRIMESTER_GRADES.map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => {
                                      if (activeQuarterId) {
                                        trimesterMutations.upsert.mutate({ student_id: s.id, subject_id: selectedSubjectId!, class_id: selectedClassId!, quarter_id: activeQuarterId, value: v });
                                      }
                                      setOpenTrimesterCell(null);
                                    }}
                                    className="w-9 h-9 rounded-md text-sm font-semibold transition-colors border border-border hover:border-destructive/50 bg-card hover:bg-destructive/10 text-foreground"
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                              {trimesterGradesMap[s.id] && (
                                <button
                                  onClick={() => {
                                    if (activeQuarterId) {
                                      trimesterMutations.remove.mutate({ student_id: s.id, subject_id: selectedSubjectId!, class_id: selectedClassId!, quarter_id: activeQuarterId });
                                    }
                                    setOpenTrimesterCell(null);
                                  }}
                                  className="mt-1.5 text-xs text-destructive hover:underline"
                                >
                                  Убрать
                                </button>
                              )}
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5"><span className="text-sm opacity-60">3<span className="text-destructive">•</span></span><span className="text-muted-foreground">С точкой (не в среднем)</span></div>
            <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-emerald-600">Н</span><span className="text-muted-foreground">Уваж. причина</span></div>
            <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-destructive">Н</span><span className="text-muted-foreground">Неуваж. причина</span></div>
          </div>

          <ClassStatsPanel
            averages={classAverages}
            totalStudents={students?.length || 0}
            twosCount={twosCount}
          />
        </>
      )}

      {/* Import confirmation dialog */}
      <Dialog open={!!importDialog} onOpenChange={(o) => !o && setImportDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Подтвердите импорт</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Будет добавлено оценок: <span className="font-semibold text-foreground">{importDialog?.resolved.length ?? 0}</span>.
            Существующие оценки не удаляются — импорт только добавляет новые записи.
          </div>
          {importDialog && importDialog.rows.length !== importDialog.resolved.length && (
            <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
              Не сопоставлено: {importDialog.rows.length - importDialog.resolved.length}. Проверьте имена учеников в файле.
            </div>
          )}
          <div className="max-h-[200px] overflow-auto text-xs space-y-1 border border-border rounded-md p-2 bg-secondary/30">
            {importDialog?.resolved.slice(0, 20).map((r, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="truncate">{r.studentName}</span>
                <span className="text-muted-foreground">{r.date}</span>
                <span className="font-semibold text-foreground">{r.value}</span>
              </div>
            ))}
            {importDialog && importDialog.resolved.length > 20 && (
              <div className="text-muted-foreground text-center pt-1">… и ещё {importDialog.resolved.length - 20}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(null)}>Отмена</Button>
            <Button onClick={confirmImport}>Импортировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grades;
