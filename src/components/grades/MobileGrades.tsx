import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStudents, useAcademicCalendar, useGrades, useGradeMutations, useWorkTypes, useTrimesterGrades, useTrimesterGradeMutations, useQuarters, useTrimesterGradesByClassSubject, useJournalDateAccess } from "@/hooks/useSchoolData";
import { hasEditableDateInQuarter, quarterLockReason } from "@/lib/journalAccess";
import { useTeacherContext } from "@/contexts/TeacherContext";
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { GradeEntry, isProvisionalActive, gradeColor } from "@/pages/teacher/Grades";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import AutoTrimesterButton from "@/components/grades/AutoTrimesterButton";
import { weightedAverage } from "@/lib/gradeWeight";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { useDisplayDefaults } from "@/hooks/useSchoolData";
import { displayQuarter } from "@/lib/displayDefaults";

const WEEKEND_DAYS = [0, 6];
const TRIMESTER_GRADES = [5, 4, 3, 2] as const;

const calcYearlyGrade = (trimesterValues: number[]): string => {
  if (trimesterValues.length === 0) return "—";
  const avg = trimesterValues.reduce((s, v) => s + v, 0) / trimesterValues.length;
  if (trimesterValues.length < 3) return avg.toFixed(2);
  const rounded = avg - Math.floor(avg) > 0.5 ? Math.ceil(avg) : Math.floor(avg);
  return String(rounded);
};

export default function MobileGrades() {
  const { selectedClassId, selectedSubjectId, isCurrentSubjectPending } = useTeacherContext();
  const [selectedQuarterId, setSelectedQuarterId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [openGradeDate, setOpenGradeDate] = useState<string | null>(null);
  const [openTrimester, setOpenTrimester] = useState(false);

  const { data: students } = useStudents(selectedClassId || undefined);
  const { data: grades } = useGrades(selectedClassId || undefined, selectedSubjectId || undefined);
  const { data: calendarDays } = useAcademicCalendar();
  const { data: workTypes } = useWorkTypes(selectedSubjectId || undefined);
  const { add, remove, update } = useGradeMutations();
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const { data: quarters } = useQuarters();

  const sortedQuarters = useMemo(() => {
    if (!quarters?.length) return [];
    return [...quarters].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date));
  }, [quarters]);

  const today = useDiaryToday();
  const { data: displayDefaults } = useDisplayDefaults();
  const activeQuarter = displayQuarter(sortedQuarters, selectedQuarterId, displayDefaults?.find(r => r.target === "journal")?.quarter_id, today);
  const activeQuarterId = activeQuarter?.id || null;

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

  const dates = useMemo(() => {
    if (!activeQuarter) return [];
    return eachDayOfInterval({ start: parseISO(activeQuarter.start_date), end: parseISO(activeQuarter.end_date) });
  }, [activeQuarter]);

  const isNonWorking = (date: Date) => {
    if (WEEKEND_DAYS.includes(date.getDay())) return { is: true, type: "weekend", label: "Выходной" };
    const dateStr = format(date, "yyyy-MM-dd");
    const found = nonWorkingMap.get(dateStr);
    if (found) return { is: true, ...found };
    return { is: false, type: "", label: "" };
  };

  const gradesMap = useMemo(() => {
    const map = new Map<string, GradeEntry[]>();
    grades?.forEach((g: any) => {
      const key = `${g.student_id}_${g.date}`;
      const arr = map.get(key) || [];
      arr.push({ id: g.id, value: g.value, provisional_until: g.provisional_until, work_type_id: g.work_type_id, work_type_name: g.work_types?.name, work_type_short: g.work_types?.short_name });
      map.set(key, arr);
    });
    return map;
  }, [grades]);

  // Working dates only for selected student
  const workingDates = useMemo(() => dates.filter(d => !isNonWorking(d).is), [dates, nonWorkingMap]);

  const { data: openedDateRows } = useJournalDateAccess(selectedClassId || undefined, selectedSubjectId || undefined);
  const openedDates = useMemo(() => new Set((openedDateRows || []).map((r: any) => r.date)), [openedDateRows]);
  const trimesterEditable = useMemo(
    () => hasEditableDateInQuarter(workingDates.map((d) => format(d, "yyyy-MM-dd")), activeQuarter, openedDates, today),
    [workingDates, activeQuarter, openedDates, today]
  );

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
    const avg = weightedAverage(studentGrades);
    return avg == null ? "—" : avg.toFixed(2);
  };

  // Navigate between students
  const studentIdx = students?.findIndex((s: any) => s.id === selectedStudentId) ?? -1;
  const prevStudent = () => {
    if (students && studentIdx > 0) setSelectedStudentId(students[studentIdx - 1].id);
  };
  const nextStudent = () => {
    if (students && studentIdx < students.length - 1) setSelectedStudentId(students[studentIdx + 1].id);
  };

  return (
    <div className="p-3">
      {/* Trimester selector */}
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-lg font-bold text-foreground flex-1">Оценки</h1>
        <Select value={activeQuarterId || ""} onValueChange={(v) => setSelectedQuarterId(v)}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Триместр" />
          </SelectTrigger>
          <SelectContent>
            {sortedQuarters.map((q: any) => (
              <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-3">
        <AutoTrimesterButton classId={selectedClassId} subjectId={selectedSubjectId} quarter={activeQuarter} students={students} grades={grades} disabled={isCurrentSubjectPending || !trimesterEditable} disabledReason={isCurrentSubjectPending ? "Предмет доступен только для просмотра" : quarterLockReason(activeQuarter, today) || "Нет открытых дат для выставления оценок"} />
      </div>
      {!selectedClassId || !selectedSubjectId ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Выберите класс и предмет через меню ☰</CardContent></Card>
      ) : !activeQuarter ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Нет триместров</CardContent></Card>
      ) : !selectedStudentId ? (
        /* Student list */
        <div className="space-y-1.5">
          {students?.map((s: any, i: number) => {
            const avg = getAverage(s.id);
            const trim = trimesterGradesMap[s.id];
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Ср: {avg}{trim !== undefined ? ` · Трим: ${trim}` : ""}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        /* Student detail - grades by date */
        <div>
          {/* Student navigation */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setSelectedStudentId(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={prevStudent} disabled={studentIdx <= 0} className="p-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold text-foreground truncate">
                {students?.find((s: any) => s.id === selectedStudentId)?.name}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {studentIdx + 1} из {students?.length}
              </div>
            </div>
            <button onClick={nextStudent} disabled={!students || studentIdx >= students.length - 1} className="p-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-card border border-border rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Средняя</div>
              <div className="text-lg font-bold text-foreground">{getAverage(selectedStudentId)}</div>
            </div>
            <Popover open={openTrimester} onOpenChange={(o) => { if (!trimesterEditable) return; setOpenTrimester(o); }}>
              <PopoverTrigger asChild>
                <button disabled={!trimesterEditable} className="bg-[hsl(0,70%,97%)] border border-[hsl(0,70%,85%)] rounded-xl p-2.5 text-center disabled:opacity-60 disabled:cursor-not-allowed">
                  <div className="text-[10px] text-destructive uppercase tracking-wide">Трим.</div>
                  <div className="text-lg font-bold text-foreground">{trimesterGradesMap[selectedStudentId] ?? "—"}</div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" side="bottom">
                <div className="text-xs text-muted-foreground mb-2">Триместровая оценка:</div>
                <div className="flex gap-1.5">
                  {TRIMESTER_GRADES.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        if (activeQuarterId) {
                          trimesterMutations.upsert.mutate({ student_id: selectedStudentId, subject_id: selectedSubjectId!, class_id: selectedClassId!, quarter_id: activeQuarterId, value: v });
                        }
                        setOpenTrimester(false);
                      }}
                      className="w-10 h-10 rounded-lg text-sm font-semibold transition-colors border border-border hover:border-destructive/50 bg-card hover:bg-destructive/10"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {trimesterGradesMap[selectedStudentId] !== undefined && (
                  <button
                    onClick={() => {
                      if (activeQuarterId) {
                        trimesterMutations.remove.mutate({ student_id: selectedStudentId, subject_id: selectedSubjectId!, class_id: selectedClassId!, quarter_id: activeQuarterId });
                      }
                      setOpenTrimester(false);
                    }}
                    className="mt-2 text-xs text-destructive hover:underline"
                  >
                    Убрать
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <div className="bg-[hsl(220,70%,97%)] border border-[hsl(220,70%,85%)] rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-blue-600 uppercase tracking-wide">Год</div>
              <div className="text-lg font-bold text-foreground">{calcYearlyGrade(yearlyGradesMap[selectedStudentId] || [])}</div>
            </div>
          </div>

          {/* Grades by date */}
          <div className="space-y-0.5">
            {workingDates.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const cellGrades = gradesMap.get(`${selectedStudentId}_${dateStr}`) || [];
              const isOpen = openGradeDate === dateStr;

              return (
                <Popover key={dateStr} open={isOpen} onOpenChange={(open) => { setOpenGradeDate(open ? dateStr : null); setEditingGradeId(null); }}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left">
                      <div className="w-16 shrink-0">
                        <div className="text-xs font-medium text-foreground">{format(d, "dd.MM")}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{format(d, "EEE", { locale: ru })}</div>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                        {cellGrades.length > 0 ? cellGrades.map((g) => {
                          const isProv = isProvisionalActive(g.provisional_until);
                          return (
                            <span
                              key={g.id}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold border ${
                                isProv ? "border-dashed border-muted-foreground/40 opacity-60" : "border-border"
                              } bg-card ${gradeColor(g.value, isProv)}`}
                            >
                              {g.value}
                            </span>
                          );
                        }) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                      {cellGrades.some(g => g.work_type_short) && (
                        <span className="text-[10px] text-primary font-medium shrink-0">
                          {cellGrades[0].work_type_short}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" side="bottom" align="center">
                    <div className="text-xs text-muted-foreground mb-2">{format(d, "d MMMM, EEEE", { locale: ru })}</div>
                    {/* Existing grades */}
                    {cellGrades.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {cellGrades.map((g) => (
                          <div key={g.id}>
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-semibold ${gradeColor(g.value, isProvisionalActive(g.provisional_until))}`}>
                              {g.value} {g.work_type_short ? `(${g.work_type_short})` : ""}
                            </span>
                            <span className="flex items-center gap-2">
                              <button onClick={() => setEditingGradeId(editingGradeId === g.id ? null : g.id)} className={`rounded px-1.5 py-0.5 text-xs ${editingGradeId === g.id ? "bg-primary text-primary-foreground" : "text-primary"}`}>Изменить</button>
                              <button onClick={() => remove.mutate({ id: g.id })} className="text-destructive text-xs hover:underline">{"\u00D7"}</button>
                            </span>
                          </div>
                          {editingGradeId === g.id && (
                            <div className="flex gap-1.5 pb-1">
                              {[5, 4, 3, 2].map((v) => (
                                <button key={v} disabled={v === g.value} onClick={() => { update.mutate({ id: g.id, value: v }); setEditingGradeId(null); setOpenGradeDate(null); }} className={`h-8 flex-1 rounded-md border border-border text-sm font-bold disabled:opacity-40 ${gradeColor(v, false)}`}>{v}</button>
                              ))}
                            </div>
                          )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Category select */}
                    {!editingGradeId && <MobileGradeAdder
                      workTypes={workTypes || []}
                      onAdd={(value, workTypeId, provisionalUntil) => {
                        add.mutate({
                          student_id: selectedStudentId!,
                          subject_id: selectedSubjectId!,
                          class_id: selectedClassId!,
                          date: dateStr,
                          value,
                          provisional_until: provisionalUntil || null,
                          work_type_id: workTypeId || null,
                        });
                        setOpenGradeDate(null);
                      }}
                    />}
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileGradeAdder({ workTypes, onAdd }: {
  workTypes: any[];
  onAdd: (value: number, workTypeId?: string, provisionalUntil?: string) => void;
}) {
  const [selectedWt, setSelectedWt] = useState<string>("");
  const [showError, setShowError] = useState(false);
  const [provisionalDate, setProvisionalDate] = useState("");

  const tryAdd = (value: number, provisional?: boolean) => {
    if (workTypes.length > 0 && !selectedWt) {
      setShowError(true);
      return;
    }
    onAdd(value, selectedWt || undefined, provisional && provisionalDate ? provisionalDate : undefined);
  };

  return (
    <div className="space-y-2">
      {workTypes.length > 0 && (
        <Select value={selectedWt} onValueChange={(v) => { setSelectedWt(v); setShowError(false); }}>
          <SelectTrigger className={`h-8 text-xs ${showError ? "border-destructive" : ""}`}>
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            {workTypes.map((wt: any) => (
              <SelectItem key={wt.id} value={wt.id} className="text-xs">{wt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showError && <p className="text-[10px] text-destructive">Выберите категорию</p>}
      <div className="flex gap-1.5">
        {[5, 4, 3, 2].map(v => (
          <button
            key={v}
            onClick={() => tryAdd(v)}
            className="flex-1 h-10 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-secondary transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={provisionalDate}
          onChange={(e) => setProvisionalDate(e.target.value)}
          className="h-8 text-xs flex-1"
          placeholder="С точкой до"
        />
        {[5, 4, 3].map(v => (
          <button
            key={`p${v}`}
            onClick={() => tryAdd(v, true)}
            className="w-8 h-8 rounded-lg text-xs border border-dashed border-muted-foreground/40 hover:bg-secondary transition-colors"
          >
            {v}•
          </button>
        ))}
      </div>
    </div>
  );
}

