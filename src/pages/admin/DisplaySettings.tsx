import { useMemo } from "react";
import { Monitor, BookOpen, Users } from "lucide-react";
import { useClasses, useAllClassSubjects, useTeachers, useQuarters, useDisplayDefaults, useTeacherDisplayDefaults, useDisplayDefaultMutations } from "@/hooks/useSchoolData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function DisplaySettings() {
  const quarters = useQuarters();
  const teachers = useTeachers();
  const classes = useClasses();
  const assignments = useAllClassSubjects();
  const defaults = useDisplayDefaults();
  const teacherDefaults = useTeacherDisplayDefaults();
  const { period, teacher } = useDisplayDefaultMutations();
  const sortedQuarters = useMemo(() => [...(quarters.data ?? [])].sort((a, b) => a.start_date.localeCompare(b.start_date)), [quarters.data]);
  const loading = [quarters, teachers, classes, assignments, defaults, teacherDefaults].some(q => q.isLoading);
  const error = [quarters, teachers, classes, assignments, defaults, teacherDefaults].some(q => q.isError);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl w-full mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-3"><Monitor className="h-6 w-6 text-accent" />Отображение</h1>
      {error ? <p role="alert" className="text-destructive">Не удалось загрузить настройки. Обновите страницу.</p> : loading ? <p className="text-muted-foreground">Загрузка…</p> : <>
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Триместр по умолчанию</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {([{ target: "journal", label: "Журнал учителя", icon: Users }, { target: "diary", label: "Дневник ученика", icon: BookOpen }] as const).map(({ target, label, icon: Icon }) => (
              <div key={target} className="space-y-2">
                <Label htmlFor={`period-${target}`} className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</Label>
                <Select value={defaults.data?.find(r => r.target === target)?.quarter_id ?? "auto"} disabled={period.isPending} onValueChange={value => period.mutate({ target, quarter_id: value === "auto" ? null : value })}>
                  <SelectTrigger id={`period-${target}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Текущий по календарю</SelectItem>
                    {sortedQuarters.map(q => <SelectItem key={q.id} value={q.id}>{q.name} · {q.year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Класс при входе учителя</h2>
          <div className="divide-y divide-border">
            {teachers.data?.map(t => {
              const assignedIds = new Set([
                ...(t.teacher_classes ?? []).map(r => r.class_id),
                ...(assignments.data ?? []).filter(r => r.teacher_id === t.id).map(r => r.class_id),
                ...(classes.data ?? []).filter(c => c.teacher_id === t.id).map(c => c.id),
              ]);
              const options = (classes.data ?? []).filter(c => assignedIds.has(c.id));
              const storedId = teacherDefaults.data?.find(r => r.teacher_id === t.id)?.class_id;
              const value = options.some(c => c.id === storedId) ? storedId ?? "auto" : "auto";
              return <div key={t.id} className="grid gap-2 sm:grid-cols-[1fr_240px] items-center py-4">
                <Label htmlFor={`class-${t.id}`} className="text-sm font-medium">{t.name}</Label>
                <Select value={value} disabled={teacher.isPending || !options.length} onValueChange={value => teacher.mutate({ teacher_id: t.id, class_id: value === "auto" ? null : value })}>
                  <SelectTrigger id={`class-${t.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{options.length ? "Первый назначенный класс" : "Нет назначенных классов"}</SelectItem>
                    {options.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>;
            })}
          </div>
        </section>
      </>}
    </div>
  );
}