import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeacherContext } from "@/contexts/TeacherContext";
import { useStudents, useAcademicCalendar } from "@/hooks/useSchoolData";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

const WEEKEND_DAYS = [0, 6];

type Status = "present" | "absent" | "late" | "";
const statusCycle: Status[] = ["present", "absent", "late", ""];

const Attendance = () => {
  const { selectedClassId, selectedSubjectId } = useTeacherContext();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [attendance, setAttendance] = useState<Record<string, Record<string, Status>>>({});

  const { data: students } = useStudents(selectedClassId || undefined);
  const { data: calendarDays } = useAcademicCalendar();

  const dates = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const nonWorkingMap = useMemo(() => {
    const map = new Map<string, { type: string; label: string }>();
    calendarDays?.forEach((d: any) => {
      map.set(d.date, { type: d.day_type, label: d.label || "" });
    });
    return map;
  }, [calendarDays]);

  const isNonWorking = (date: Date) => {
    if (WEEKEND_DAYS.includes(date.getDay())) return true;
    return nonWorkingMap.has(format(date, "yyyy-MM-dd"));
  };

  const toggle = (studentId: string, dateStr: string) => {
    setAttendance((prev) => {
      const current = prev[studentId]?.[dateStr] || "";
      const idx = statusCycle.indexOf(current as Status);
      const next = statusCycle[(idx + 1) % statusCycle.length];
      return { ...prev, [studentId]: { ...prev[studentId], [dateStr]: next } };
    });
  };

  const renderStatus = (status: Status) => {
    if (status === "present") return <Check className="w-4 h-4 text-emerald-500" />;
    if (status === "absent") return <X className="w-4 h-4 text-destructive" />;
    if (status === "late") return <span className="text-xs font-semibold text-amber-500">ОП</span>;
    return null;
  };

  if (!selectedClassId || !selectedSubjectId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Посещаемость</h1>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Выберите класс и предмет в верхней панели</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Посещаемость</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm bg-card" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground sticky left-0 bg-secondary/50 min-w-[200px]">Ученик</th>
                {dates.map((d) => {
                  const nw = isNonWorking(d);
                  return (
                    <th key={d.toISOString()} className={`py-3 px-1.5 font-medium text-center min-w-[40px] text-xs ${nw ? "bg-muted text-muted-foreground" : "text-muted-foreground"}`}>
                      {format(d, "dd")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {students?.map((s: any, i: number) => (
                <tr key={s.id} className={`border-b border-border ${i % 2 === 0 ? "bg-card" : "bg-secondary/20"}`}>
                  <td className="py-3 px-4 font-medium text-foreground sticky left-0 bg-inherit">{s.name}</td>
                  {dates.map((d) => {
                    const nw = isNonWorking(d);
                    const dateStr = format(d, "yyyy-MM-dd");
                    return (
                      <td key={d.toISOString()} className={`py-3 px-1.5 text-center ${nw ? "bg-muted/50" : ""}`}>
                        {nw ? (
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        ) : (
                          <button
                            onClick={() => toggle(s.id, dateStr)}
                            className="w-8 h-8 rounded-md hover:bg-primary/10 transition-colors flex items-center justify-center mx-auto"
                          >
                            {renderStatus(attendance[s.id]?.[dateStr] as Status)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Присутствует</span>
        <span className="flex items-center gap-1.5"><X className="w-4 h-4 text-destructive" /> Отсутствует</span>
        <span className="flex items-center gap-1.5"><span className="text-xs font-semibold text-amber-500">ОП</span> Опоздание</span>
      </div>
    </div>
  );
};

export default Attendance;
