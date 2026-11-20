import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useClassSchedule } from "@/hooks/useSchoolData";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { homeworkPath } from "@/lib/diaryNotifications";

interface HW {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  subject_id: string;
  subjects?: { name: string } | null;
}

const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DOW_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}
const fmtIso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const fmtRange = (a: Date, b: Date) =>
  `${a.getDate()} ${MONTHS_RU[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS_RU[b.getMonth()].slice(0, 3)}`;

const DiaryTasks = () => {
  const { account } = useDiaryAuth();
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [items, setItems] = useState<HW[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // обновляем задания, когда ученик возвращается на вкладку
  useEffect(() => {
    const onFocus = () => setReloadKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }),
    [weekStart]
  );
  const weekEnd = weekDays[6];

  const { data: schedule } = useClassSchedule(account?.classId, true);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    supabase
      .from("homework")
      .select("id, title, description, due_date, subject_id, subjects(name)")
      .eq("class_id", account.classId)
      .gte("due_date", fmtIso(weekDays[0]))
      .lte("due_date", fmtIso(weekEnd))
      .order("due_date", { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as unknown as HW[]);
        setLoading(false);
      });
  }, [account, weekStart, reloadKey]);

  // строки: предмет + задания на неделе (по дням уроков)
  const rows = useMemo(() => {
    const byDay = new Map<number, { subjectId: string; name: string; lesson: number }[]>();
    (schedule || []).forEach((s: any) => {
      const list = byDay.get(s.day_of_week) || [];
      list.push({ subjectId: s.subject_id, name: s.subjects?.name ?? "—", lesson: s.lesson_number });
      byDay.set(s.day_of_week, list);
    });

    return weekDays.slice(0, 6).map((d, idx) => {
      const dow = idx + 1;
      const iso = fmtIso(d);
      const lessons = (byDay.get(dow) || []).sort((a, b) => a.lesson - b.lesson);
      const lessonRows = lessons.map((l) => ({
        key: `${iso}-${l.subjectId}-${l.lesson}`,
        name: l.name,
        hw: items.filter((h) => h.due_date === iso && h.subject_id === l.subjectId),
      }));
      // задания без урока в расписании
      const extra = items
        .filter((h) => h.due_date === iso && !lessons.some((l) => l.subjectId === h.subject_id))
        .map((h) => ({ key: h.id, name: h.subjects?.name ?? "—", hw: [h] }));
      return { date: d, iso, label: `${DOW_SHORT[idx]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`, rows: [...lessonRows, ...extra] };
    }).filter((d) => d.rows.length > 0);
  }, [schedule, items, weekDays]);

  const isToday = (d: Date) => fmtIso(d) === fmtIso(today);
  const shift = (days: number) => { const n = new Date(weekStart); n.setDate(n.getDate() + days); setWeekStart(n); };

  return (
    <div className="px-3 pb-28 md:px-0">
      <div className="flex items-center gap-2 mt-2 mb-3">
        <button onClick={() => shift(-7)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm" aria-label="Предыдущая неделя">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 bg-white rounded-full px-4 h-9 flex items-center justify-center text-[14px] font-medium text-slate-900 shadow-sm">
          {fmtRange(weekDays[0], weekEnd)}
        </div>
        <button onClick={() => shift(7)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm" aria-label="Следующая неделя">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="bg-white rounded-full px-4 h-9 text-[14px] font-medium text-slate-900 shadow-sm">
          Эта неделя
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-500">Загрузка…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center">
          <div className="text-[48px] leading-none">📘</div>
          <div className="mt-4 text-[17px] font-semibold text-slate-900">На этой неделе уроков нет</div>
          <div className="mt-1 text-[14px] text-slate-500">Полистайте недели стрелками</div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((day) => (
            <div key={day.iso} className="bg-white rounded-2xl overflow-hidden">
              <div className={cn("px-4 pt-4 pb-2 text-[13px] font-bold uppercase tracking-wide", isToday(day.date) ? "text-blue-600" : "text-slate-900")}>
                {day.label}
              </div>
              <div>
                {day.rows.map((r, i) => (
                  <div key={r.key} className={cn("flex items-start gap-3 px-4 py-2.5", i > 0 && "border-t border-slate-100")}>
                    <div className="w-[38%] shrink-0 text-[14px] font-medium text-slate-900">{r.name}</div>
                    <div className="min-w-0 flex-1">
                      {r.hw.length === 0 ? (
                        <div className="text-[14px] text-slate-300">—</div>
                      ) : (
                        r.hw.map((h) => (
                          <div key={h.id} className="mb-1 last:mb-0">
                            <Button asChild variant="link" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left text-diary-fg"><Link to={homeworkPath(h.id)}>{h.title}</Link></Button>
                            {h.description && (
                              <div className="text-[13px] text-slate-500 whitespace-pre-wrap">{h.description}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiaryTasks;
