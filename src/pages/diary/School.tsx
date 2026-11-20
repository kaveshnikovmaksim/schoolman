import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { useDiaryGrades } from "@/hooks/useSchoolData";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { classOverallRanking } from "@/lib/diaryGradeStats";
import { useDisplayDefaults } from "@/hooks/useSchoolData";
import { displayQuarter } from "@/lib/displayDefaults";
import { initials } from "@/components/diary/StudentHeader";
import { cn } from "@/lib/utils";
import { Utensils, CalendarCheck, BookOpen, GraduationCap, Award, AlertTriangle, ChevronDown, Minus } from "lucide-react";

type Quarter = { id: string; name: string; start_date: string; end_date: string };

// Пока только оформление: работает лишь рейтинг.
const services = [
  { icon: Utensils, label: "Питание", tone: "bg-diary-rating" },
  { icon: CalendarCheck, label: "Посещаемость", tone: "bg-primary" },
  { icon: BookOpen, label: "Предметы", tone: "bg-accent" },
  { icon: GraduationCap, label: "Подготовка к ЕГЭ", tone: "bg-primary/80" },
  { icon: Award, label: "Итоговые оценки", tone: "bg-diary-marker" },
  { icon: AlertTriangle, label: "Контрольные", tone: "bg-destructive" },
];

const DiarySchool = () => {
  const { account } = useDiaryAuth();
  const { studentId } = useSelectedStudent();
  const today = useDiaryToday();
  const { data: displayDefaults } = useDisplayDefaults();
  const defaultQuarterId = displayDefaults?.find(r => r.target === "diary")?.quarter_id;
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const { data: grades = [] } = useDiaryGrades(account?.classId, null);

  useEffect(() => {
    if (!account) return;
    supabase.from("academic_quarters").select("*").order("start_date").then(({ data }) => setQuarters(data ?? []));
    supabase.from("students").select("id, name").eq("class_id", account.classId).then(({ data }) => setStudents(data ?? []));
  }, [account]);

  const quarter = useMemo(() => displayQuarter(quarters, null, defaultQuarterId, today), [quarters, today, defaultQuarterId]);
  const ranking = useMemo(() => classOverallRanking(students, grades, quarter, today), [students, grades, quarter, today]);

  return (
    <div className="px-4 pt-2 pb-6 space-y-3 max-w-5xl mx-auto w-full md:px-8 md:pt-6">
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-semibold text-diary-muted uppercase">Сервисы</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-diary-muted uppercase">Развернуть <ChevronDown className="w-4 h-4" /></span>
      </div>
      <div className="bg-diary-surface rounded-2xl p-4 grid grid-cols-3 md:grid-cols-6 gap-y-5">
        {services.map(({ icon: Icon, label, tone }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-center">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", tone)}>
              <Icon className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-[13px] text-diary-fg leading-tight">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_2fr] md:items-start">
      <div className="bg-diary-surface rounded-2xl p-4">
        <span className="inline-block rounded-lg bg-accent px-3 py-1 text-sm font-bold text-accent-foreground uppercase">Посещаемость</span>
        <div className="flex items-center justify-between mt-5">
          <span className="text-[15px] text-diary-muted">план. пропуски</span>
          <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Minus className="w-3.5 h-3.5 text-diary-muted" /></span>
        </div>
      </div>

      <div className="bg-diary-surface rounded-2xl p-4">
        <span className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold text-primary uppercase">Рейтинг</span>
        {ranking.length === 0 ? (
          <div className="text-sm text-diary-muted text-center py-6">В этом триместре ещё нет оценок</div>
        ) : (
          <div className="space-y-4 mt-4">
            {ranking.map(g => {
              const isMe = g.students.some(s => s.id === studentId);
              const shown = g.students.slice(0, 3);
              return (
                <div key={g.rank} className="flex items-center gap-3">
                  <div className="relative flex-1 flex items-center h-10">
                    <div className={cn("absolute left-3 right-6 h-3 rounded-full", isMe ? "bg-diary-rating" : "bg-diary-rating/40")} />
                    <span className={cn("relative z-10 w-7 h-7 rotate-45 rounded-md flex items-center justify-center", isMe ? "bg-diary-rating" : "bg-diary-rating/30")}>
                      <span className="-rotate-45 text-sm font-semibold text-diary-fg">{g.rank}</span>
                    </span>
                    <div className={cn("relative z-10 ml-auto flex items-center gap-2 rounded-full pl-3 pr-1 h-9", isMe ? "bg-diary-rating" : "bg-diary-rating/70")}>
                      <span className="text-xs text-diary-fg whitespace-nowrap">{g.students.length} чел</span>
                      <div className="flex -space-x-2">
                        {shown.map(s => (
                          <span key={s.id} title={s.name} className={cn("w-7 h-7 rounded-full border-2 border-diary-surface text-[10px] font-semibold flex items-center justify-center", s.id === studentId ? "bg-diary-muted text-primary-foreground" : "bg-accent text-accent-foreground")}>
                            {initials(s.name)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="w-12 text-right text-lg font-semibold tabular-nums text-diary-fg">{g.avg.toFixed(2).replace(".", ",")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DiarySchool;
