import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, Trash2, CalendarDays, Pencil, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAcademicCalendar, useCalendarMutations, useQuarters, useQuarterMutations, useAllTrimesterGrades, useClasses, useStudents, useSubjects } from "@/hooks/useSchoolData";

type DayType = "holiday" | "vacation" | "weekend";

function useResponsiveMonths() {
  const [count, setCount] = useState(() => {
    const w = window.innerWidth;
    return w < 768 ? 1 : w < 1024 ? 2 : 3;
  });
  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      setCount(w < 768 ? 1 : w < 1024 ? 2 : 3);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return count;
}

const AcademicCalendar = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Учебный календарь</h1>
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="data-[state=inactive]:bg-muted/50 data-[state=inactive]:border data-[state=inactive]:border-border">
            <CalendarDays className="w-4 h-4 mr-2" /> Календарь
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=inactive]:bg-muted/50 data-[state=inactive]:border data-[state=inactive]:border-border">
            <Database className="w-4 h-4 mr-2" /> База
          </TabsTrigger>
        </TabsList>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="database"><DatabaseTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// ============ CALENDAR TAB ============
function CalendarTab() {
  const numberOfMonths = useResponsiveMonths();
  const { data: calendarDays, isLoading: calLoading } = useAcademicCalendar();
  const { create: createDays, remove: removeDay, removeBatch } = useCalendarMutations();
  const { data: quarters, isLoading: qLoading } = useQuarters();
  const { create: createQuarter, update: updateQuarter, remove: removeQuarter } = useQuarterMutations();

  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rangeStart, setRangeStart] = useState<Date | undefined>();
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();
  const [dayType, setDayType] = useState<DayType>("holiday");
  const [label, setLabel] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(2026, 2, 1));

  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qName, setQName] = useState("");
  const [qStart, setQStart] = useState<Date | undefined>();
  const [qEnd, setQEnd] = useState<Date | undefined>();

  const handleAddDays = () => {
    const days: { date: string; day_type: string; label: string }[] = [];
    const lbl = label || (dayType === "holiday" ? "Праздник" : dayType === "vacation" ? "Каникулы" : "Выходной");
    if (mode === "single" && selectedDate) {
      days.push({ date: format(selectedDate, "yyyy-MM-dd"), day_type: dayType, label: lbl });
    } else if (mode === "range" && rangeStart && rangeEnd) {
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        days.push({ date: format(cur, "yyyy-MM-dd"), day_type: dayType, label: lbl });
        cur.setDate(cur.getDate() + 1);
      }
    }
    if (days.length > 0) {
      createDays.mutate(days, { onSuccess: () => { setDayDialogOpen(false); setSelectedDate(undefined); setRangeStart(undefined); setRangeEnd(undefined); setLabel(""); } });
    }
  };

  const openCreateQuarter = () => { setEditingQId(null); setQName(""); setQStart(undefined); setQEnd(undefined); setQDialogOpen(true); };
  const openEditQuarter = (q: any) => { setEditingQId(q.id); setQName(q.name); setQStart(new Date(q.start_date + "T00:00:00")); setQEnd(new Date(q.end_date + "T00:00:00")); setQDialogOpen(true); };

  const handleSaveQuarter = () => {
    if (!qName.trim() || !qStart || !qEnd) return;
    if (qEnd <= qStart) return;
    const payload = { name: qName.trim(), start_date: format(qStart, "yyyy-MM-dd"), end_date: format(qEnd, "yyyy-MM-dd"), year: "2025-2026" };
    if (editingQId) {
      updateQuarter.mutate({ id: editingQId, ...payload }, { onSuccess: () => setQDialogOpen(false) });
    } else {
      createQuarter.mutate(payload, { onSuccess: () => setQDialogOpen(false) });
    }
  };

  const holidays = calendarDays?.filter((d: any) => d.day_type === "holiday") || [];
  const vacations = calendarDays?.filter((d: any) => d.day_type === "vacation") || [];

  const modifiers = {
    holiday: holidays.map((d: any) => new Date(d.date + "T00:00:00")),
    vacation: vacations.map((d: any) => new Date(d.date + "T00:00:00")),
  };
  const modifiersClassNames = {
    holiday: "!bg-destructive/20 !text-destructive font-bold",
    vacation: "!bg-primary/20 !text-primary font-bold",
  };

  if (calLoading || qLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">Праздники, каникулы, триместры</p>
        <Button onClick={() => setDayDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Добавить дни</Button>
      </div>

      {/* Add days dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Добавить нерабочие дни</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Режим</Label>
              <Select value={mode} onValueChange={(v: "single" | "range") => setMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Один день</SelectItem>
                  <SelectItem value="range">Диапазон дат</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={dayType} onValueChange={(v: DayType) => setDayType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Праздник</SelectItem>
                  <SelectItem value="vacation">Каникулы</SelectItem>
                  <SelectItem value="weekend">Выходной</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "single" ? (
              <div className="space-y-2">
                <Label>Дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>С</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !rangeStart && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                        {rangeStart ? format(rangeStart, "dd.MM.yyyy") : "Начало"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={rangeStart} onSelect={setRangeStart} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>По</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !rangeEnd && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                        {rangeEnd ? format(rangeEnd, "dd.MM.yyyy") : "Конец"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={rangeEnd} onSelect={setRangeEnd} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Название</Label>
              <Input placeholder="Например: Весенние каникулы" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} />
            </div>
            <Button className="w-full" onClick={handleAddDays} disabled={mode === "single" ? !selectedDate : (!rangeStart || !rangeEnd) || createDays.isPending}>
              {createDays.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quarter dialog */}
      <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingQId ? "Редактировать триместр" : "Новый триместр"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input placeholder="1 триместр" value={qName} onChange={(e) => setQName(e.target.value)} maxLength={50} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Начало <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !qStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {qStart ? format(qStart, "dd.MM.yyyy") : "Выберите"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={qStart} onSelect={setQStart} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Конец <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !qEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {qEnd ? format(qEnd, "dd.MM.yyyy") : "Выберите"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={qEnd} onSelect={setQEnd} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {qStart && qEnd && qEnd <= qStart && <p className="text-sm text-destructive">Дата окончания должна быть позже даты начала</p>}
            <Button className="w-full" onClick={handleSaveQuarter} disabled={!qName.trim() || !qStart || !qEnd || (qEnd <= qStart)}>
              {editingQId ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visual calendar */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Визуальный календарь</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" numberOfMonths={numberOfMonths} month={calendarMonth} onMonthChange={setCalendarMonth} modifiers={modifiers} modifiersClassNames={modifiersClassNames} className="p-3 pointer-events-auto w-full" />
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/30" /><span className="text-muted-foreground">Праздники</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30" /><span className="text-muted-foreground">Каникулы</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trimesters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Триместры
              <Button size="sm" variant="outline" onClick={openCreateQuarter}><Plus className="w-3 h-3 mr-1" /> Добавить</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quarters?.length === 0 && <p className="text-sm text-muted-foreground">Нет триместров</p>}
            {quarters?.map((q: any) => {
              return (
                <div key={q.id} className="py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{q.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(q.start_date + "T00:00:00"), "dd.MM.yy")} — {format(new Date(q.end_date + "T00:00:00"), "dd.MM.yy")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditQuarter(q)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeQuarter.mutate(q.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Праздники <Badge variant="destructive" className="text-xs">{holidays.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-48 overflow-y-auto">
            {holidays.length === 0 ? <p className="text-sm text-muted-foreground">Нет</p> :
              holidays.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">{format(new Date(d.date + "T00:00:00"), "dd.MM")}</span>
                    <span className="ml-2 text-foreground">{d.label}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDay.mutate(d.date)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              ))
            }
          </CardContent>
        </Card>

        {/* Vacations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Каникулы <Badge className="text-xs">{vacations.length} дн.</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-48 overflow-y-auto">
            {vacations.length === 0 ? <p className="text-sm text-muted-foreground">Нет</p> :
              (() => {
                const sorted = [...vacations].sort((a: any, b: any) => a.date.localeCompare(b.date));
                const groups: { start: string; end: string; label: string; dates: string[] }[] = [];
                sorted.forEach((d: any) => {
                  const last = groups[groups.length - 1];
                  if (last && last.label === d.label) { last.end = d.date; last.dates.push(d.date); }
                  else groups.push({ start: d.date, end: d.date, label: d.label || "Каникулы", dates: [d.date] });
                });
                return groups.map((g) => (
                  <div key={g.start} className="flex items-center justify-between py-1.5 text-sm">
                    <div>
                      <span className="text-muted-foreground">{format(new Date(g.start + "T00:00:00"), "dd.MM")} — {format(new Date(g.end + "T00:00:00"), "dd.MM")}</span>
                      <span className="ml-2 text-foreground">{g.label}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBatch.mutate(g.dates)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ));
              })()
            }
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ============ DATABASE TAB ============
function DatabaseTab() {
  const { data: trimesterGrades, isLoading: tgLoading } = useAllTrimesterGrades();
  const { data: classes, isLoading: clLoading } = useClasses();
  const { data: allStudents, isLoading: stLoading } = useStudents();
  const { data: subjects, isLoading: subLoading } = useSubjects();
  const { data: quarters, isLoading: qLoading } = useQuarters();
  const { data: allClassSubjects } = useQuery({
    queryKey: ["class_subjects", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_subjects").select("class_id, subject_id");
      if (error) throw error;
      return data;
    },
  });
  const [classPick, setClassPick] = useState<string>();
  const [quarterPick, setQuarterPick] = useState<string>();

  if (tgLoading || clLoading || stLoading || subLoading || qLoading) return <Skeleton className="h-64 w-full" />;

  const sortedClasses = [...(classes || [])].sort((a: any, b: any) => a.name.localeCompare(b.name, "ru", { numeric: true }));
  const classId = classPick ?? (sortedClasses.find((c: any) => c.name.replace(/\s/g, "").toUpperCase() === "8А") ?? sortedClasses[0])?.id;
  const sortedQuarters = [...(quarters || [])].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date));
  const today = format(new Date(), "yyyy-MM-dd");
  const quarterId = quarterPick ?? (sortedQuarters.find((q: any) => q.start_date <= today && today <= q.end_date) ?? [...sortedQuarters].reverse().find((q: any) => q.start_date <= today) ?? sortedQuarters[0])?.id;

  const classGrades = (trimesterGrades || []).filter((g: any) => g.class_id === classId && g.quarter_id === quarterId);
  const students = (allStudents || []).filter((s: any) => s.class_id === classId).sort((a: any, b: any) => a.name.localeCompare(b.name, "ru"));
  const gradeMap = new Map<string, number>(classGrades.map((g: any) => [`${g.student_id}_${g.subject_id}`, g.value]));
  const subjectIds = new Set([...classGrades.map((g: any) => g.subject_id), ...(allClassSubjects || []).filter((cs: any) => cs.class_id === classId).map((cs: any) => cs.subject_id)]);
  const classSubjects = (subjects || []).filter((s: any) => subjectIds.has(s.id));

  const rated = students.flatMap((s: any) => {
    const vals = classGrades.filter((g: any) => g.student_id === s.id).map((g: any) => g.value);
    return vals.length ? [{ student: s, avg: Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 100) / 100 }] : [];
  }).sort((a, b) => b.avg - a.avg || a.student.name.localeCompare(b.student.name, "ru"));
  let rank = 0; let prev: number | null = null;
  const ranking = rated.map(r => { if (r.avg !== prev) { rank++; prev = r.avg; } return { ...r, rank }; });

  const tone = (v: number) => v <= 2 ? "text-destructive" : v === 3 ? "text-warning" : v === 4 ? "text-grade-good" : "text-success";

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-muted-foreground text-sm">Триместровые оценки класса</p>
        <div className="flex gap-2">
          <Select value={classId} onValueChange={setClassPick}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Класс" /></SelectTrigger>
            <SelectContent>{sortedClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={quarterId} onValueChange={setQuarterPick}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Триместр" /></SelectTrigger>
            <SelectContent>{sortedQuarters.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-0">
          {classSubjects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Нет триместровых оценок</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse mr-32">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-card text-left align-bottom px-4 py-2 font-medium text-muted-foreground min-w-48">Ученик</th>
                    {classSubjects.map((s: any) => (
                      <th key={s.id} className="h-44 w-12 min-w-12 align-bottom p-0">
                        <div className="relative h-44 w-12">
                          <span title={s.name} className="absolute bottom-3 left-1/2 block max-w-44 truncate origin-left -rotate-45 whitespace-nowrap text-left text-xs font-medium text-muted-foreground">{s.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st: any) => (
                    <tr key={st.id} className="border-t border-border">
                      <td className="sticky left-0 bg-card px-4 py-2 whitespace-nowrap text-foreground">{st.name}</td>
                      {classSubjects.map((s: any) => {
                        const v = gradeMap.get(`${st.id}_${s.id}`);
                        return <td key={s.id} className={cn("text-center py-2 font-semibold", v ? tone(v) : "text-muted-foreground")}>{v ?? "—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Рейтинг класса</CardTitle></CardHeader>
        <CardContent className="p-0">
          {ranking.length === 0 ? <p className="p-6 text-center text-muted-foreground text-sm">Нет данных</p> : (
            <Table>
              <TableHeader><TableRow><TableHead className="w-16 text-center">Место</TableHead><TableHead>Ученик</TableHead><TableHead className="text-right pr-6">Средний балл</TableHead></TableRow></TableHeader>
              <TableBody>
                {ranking.map(r => (
                  <TableRow key={r.student.id}>
                    <TableCell className="text-center font-semibold">{r.rank}</TableCell>
                    <TableCell>{r.student.name}</TableCell>
                    <TableCell className="text-right pr-6 font-semibold tabular-nums">{r.avg.toFixed(2).replace(".", ",")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default AcademicCalendar;
