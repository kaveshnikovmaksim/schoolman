import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Award, AlertTriangle } from "lucide-react";
import { useClasses, useAllStudents, useSubjects, useQuarters, useAllTrimesterGrades } from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { parseISO, isWithinInterval } from "date-fns";

const Reports = () => {
  const { data: classes } = useClasses();
  const { data: students } = useAllStudents();
  const { data: subjects } = useSubjects();
  const { data: quarters } = useQuarters();
  const { data: trimesterGrades } = useAllTrimesterGrades();

  const [classId, setClassId] = useState<string>("all");
  const [quarterId, setQuarterId] = useState<string>("all");

  const { data: allGrades } = useQuery({
    queryKey: ["all-grades-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id, value, date, student_id, subject_id, class_id, provisional_until");
      if (error) throw error;
      return data;
    },
  });

  const sortedQuarters = useMemo(() => [...(quarters || [])].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)), [quarters]);
  const activeQuarter = quarterId === "all" ? null : sortedQuarters.find((q: any) => q.id === quarterId);

  // Filter grades
  const filteredGrades = useMemo(() => {
    if (!allGrades) return [];
    return allGrades.filter((g: any) => {
      if (g.provisional_until && new Date(g.provisional_until) >= new Date()) return false;
      if (classId !== "all" && g.class_id !== classId) return false;
      if (activeQuarter) {
        const d = parseISO(g.date);
        if (!isWithinInterval(d, { start: parseISO(activeQuarter.start_date), end: parseISO(activeQuarter.end_date) })) return false;
      }
      return true;
    });
  }, [allGrades, classId, activeQuarter]);

  const overall = useMemo(() => {
    const values = filteredGrades.map((g: any) => g.value);
    const avg = values.length ? (values.reduce((s: number, v: number) => s + v, 0) / values.length) : 0;
    const totalStudents = classId === "all" ? (students?.length || 0) : (students?.filter((s: any) => s.class_id === classId).length || 0);
    const passing = values.length ? Math.round((values.filter((v: number) => v >= 3).length / values.length) * 100) : 0;
    const quality = values.length ? Math.round((values.filter((v: number) => v >= 4).length / values.length) * 100) : 0;
    const twos = values.filter((v: number) => v === 2).length;
    return { avg: avg ? avg.toFixed(2) : "—", totalStudents, passing, quality, twos, count: values.length };
  }, [filteredGrades, students, classId]);

  // Per-subject breakdown
  const bySubject = useMemo(() => {
    const map = new Map<string, { sum: number; count: number; name: string }>();
    filteredGrades.forEach((g: any) => {
      const key = g.subject_id;
      const subj = subjects?.find((s: any) => s.id === key);
      if (!subj) return;
      const e = map.get(key) || { sum: 0, count: 0, name: subj.name };
      e.sum += g.value; e.count++;
      map.set(key, e);
    });
    return Array.from(map.values()).map((e) => ({ name: e.name, avg: +(e.sum / e.count).toFixed(2) })).sort((a, b) => b.avg - a.avg);
  }, [filteredGrades, subjects]);

  // Per-class breakdown
  const byClass = useMemo(() => {
    if (!classes) return [];
    return classes.map((c: any) => {
      const grades = (allGrades || []).filter((g: any) => g.class_id === c.id && (!g.provisional_until || new Date(g.provisional_until) < new Date()));
      const filtered = activeQuarter
        ? grades.filter((g: any) => isWithinInterval(parseISO(g.date), { start: parseISO(activeQuarter.start_date), end: parseISO(activeQuarter.end_date) }))
        : grades;
      const values = filtered.map((g: any) => g.value);
      const avg = values.length ? values.reduce((s: number, v: number) => s + v, 0) / values.length : 0;
      const passing = values.length ? Math.round((values.filter((v: number) => v >= 3).length / values.length) * 100) : 0;
      const studentCount = students?.filter((s: any) => s.class_id === c.id).length || 0;
      return { name: c.name, avg: +avg.toFixed(2), passing, students: studentCount };
    }).filter((c: any) => c.avg > 0).sort((a, b) => b.avg - a.avg);
  }, [classes, allGrades, students, activeQuarter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Отчёты и статистика</h1>
        <div className="flex items-center gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все классы</SelectItem>
              {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={quarterId} onValueChange={setQuarterId}>
            <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Весь год</SelectItem>
              {sortedQuarters.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Средний балл", value: overall.avg, icon: TrendingUp, color: "text-primary" },
          { label: "Учеников", value: String(overall.totalStudents), icon: Users, color: "text-accent" },
          { label: "Успеваемость", value: `${overall.passing}%`, icon: Award, color: "text-emerald-600" },
          { label: "Качество", value: `${overall.quality}%`, icon: BarChart3, color: "text-amber-500" },
          { label: "Двоек", value: String(overall.twos), icon: AlertTriangle, color: overall.twos > 0 ? "text-destructive" : "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl bg-secondary flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-subject chart */}
      {bySubject.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Средний балл по предметам</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, bySubject.length * 32)}>
              <BarChart data={bySubject} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-class breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-lg">По классам</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Класс</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Учеников</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ср. балл</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Успеваемость</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Шкала</th>
              </tr>
            </thead>
            <tbody>
              {byClass.map((c, i) => (
                <tr key={c.name} className={`border-b border-border ${i % 2 === 0 ? "bg-card" : "bg-secondary/20"}`}>
                  <td className="py-3 px-4 font-semibold text-accent">{c.name}</td>
                  <td className="py-3 px-4 text-center text-foreground">{c.students}</td>
                  <td className="py-3 px-4 text-center font-medium text-foreground">{c.avg.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center text-foreground">{c.passing}%</td>
                  <td className="py-3 px-4 text-right">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(c.avg / 5) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {byClass.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">Нет данных за выбранный период</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
