import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { cn } from "@/lib/utils";
import { ChevronRight, ArrowUp, ArrowDown, CheckSquare, MessageSquare, X, Check } from "lucide-react";
import { isControlWorkTypeName } from "@/lib/gradeWeight";

import { latestGradeTrend, type GradeTrend } from "@/lib/diaryGradeStats";

import { useDiaryGrades } from "@/hooks/useSchoolData";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { visibleDiaryQuarters } from "@/lib/diaryQuarters";
import { diaryAverage, isDiaryProvisional } from "@/lib/diaryProvisionalGrades";
import { useDisplayDefaults } from "@/hooks/useSchoolData";
import { displayQuarter } from "@/lib/displayDefaults";

interface Grade {
  id: string;
  value: number;
  date: string;
  created_at: string;
  subject_id: string;
  work_type_id: string | null;
  weight?: number | null;
  comment?: string | null;
  provisional_until?: string | null;
}
interface Subject { id: string; name: string }
interface WorkType { id: string; name: string }
interface Quarter { id: string; name: string; start_date: string; end_date: string }
interface CellComment { subject_id: string; date: string; comment: string }

const MONTHS_RU = ["ЯНВАРЯ","ФЕВРАЛЯ","МАРТА","АПРЕЛЯ","МАЯ","ИЮНЯ","ИЮЛЯ","АВГУСТА","СЕНТЯБРЯ","ОКТЯБРЯ","НОЯБРЯ","ДЕКАБРЯ"];
const formatRuDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
};
const relativeDay = (iso: string) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "сегодня";
  if (diff === -1) return "вчера";
  const dow = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
  return dow[d.getDay()];
};

const round = (n: number) => Math.round(n * 100) / 100;
const avg = (arr: number[]) => arr.length ? round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;

const trimesterLabel = (name: string) => {
  // Преобразуем "1 четверть" / "I триместр" в "1 триместр"
  const m = name.match(/(\d+)/);
  if (m) return `${m[1]} триместр`;
  return name;
};

const DiaryGrades = () => {
  const { account } = useDiaryAuth();
  const { studentId } = useSelectedStudent();
  const today = useDiaryToday();
  const { data: displayDefaults } = useDisplayDefaults();
  const defaultQuarterId = displayDefaults?.find(r => r.target === "diary")?.quarter_id;
  const navigate = useNavigate();
  const [mode, setMode] = useState<"date"|"subject">("date");
  const { data: grades = [] } = useDiaryGrades(account?.classId, studentId);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [trimesterGrades, setTrimesterGrades] = useState<{ subject_id: string; quarter_id: string; value: number }[]>([]);
  const [cellComments, setCellComments] = useState<CellComment[]>([]);
  const [openComment, setOpenComment] = useState<{ subject: string; date: string; comment: string } | null>(null);

  useEffect(() => {
    if (!studentId || !account) return;
    supabase.from("subjects").select("id, name").then(({ data }) => setSubjects(data ?? []));
    supabase.from("work_types").select("id, name").then(({ data }) => setWorkTypes(data ?? []));
    supabase.from("academic_quarters").select("*").order("start_date").then(({ data }) => setQuarters(data ?? []));
    supabase.from("trimester_grades").select("subject_id, quarter_id, value").eq("student_id", studentId).then(({ data }) => setTrimesterGrades(data ?? []));
    supabase.from("cell_comments")
      .select("subject_id, date, comment")
      .eq("student_id", studentId)
      .eq("class_id", account.classId)
      .then(({ data }) => setCellComments((data ?? []) as CellComment[]));
  }, [studentId, account]);

  const subjMap = useMemo(() => new Map(subjects.map(s => [s.id, s.name])), [subjects]);
  const wtMap = useMemo(() => new Map(workTypes.map(w => [w.id, w.name])), [workTypes]);
  const cellCommentMap = useMemo(() => {
    const map = new Map<string, string>();
    cellComments.forEach((c) => {
      if (c.comment?.trim()) map.set(`${c.subject_id}_${c.date}`, c.comment);
    });
    return map;
  }, [cellComments]);

  const activeQuarter = useMemo(() => displayQuarter(quarters, null, defaultQuarterId, today), [quarters, today, defaultQuarterId]);

  // === Группировка по дате ===
  const currentQuarter = useMemo(() => displayQuarter(quarters, null, defaultQuarterId, today), [quarters, today, defaultQuarterId]);
  const [dateQuarterId, setDateQuarterId] = useState<string | null>(null);
  const dateQuarter = quarters.find(q => q.id === dateQuarterId) ?? currentQuarter;
  const dateQuarterOptions = useMemo(() => visibleDiaryQuarters(quarters, today, q => q.id === defaultQuarterId || grades.some(g => g.date >= q.start_date && g.date <= q.end_date)).reverse(), [quarters, today, grades, defaultQuarterId]);
  const byDate = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of grades) {
      if (dateQuarter && (g.date < dateQuarter.start_date || g.date > dateQuarter.end_date)) continue;
      if (!map.has(g.date)) map.set(g.date, []);
      map.get(g.date)!.push(g);
    }
    return Array.from(map.entries());
  }, [grades, dateQuarter]);

  // === Группировка по предмету (для активного триместра) ===
  const bySubject = useMemo(() => {
    if (!activeQuarter) return [] as { subject: Subject; grades: Grade[]; final: number | null; trimester: number | null; quarterName: string }[];
    const inQuarter = grades.filter(g => g.date >= activeQuarter.start_date && g.date <= activeQuarter.end_date);
    const subjIds = Array.from(new Set([
      ...inQuarter.map(g => g.subject_id),
      ...trimesterGrades.filter(t => t.quarter_id === activeQuarter.id).map(t => t.subject_id),
    ]));
    return subjIds
      .map(sid => {
        const subject = subjects.find(s => s.id === sid);
        if (!subject) return null;
        const sg = inQuarter.filter(g => g.subject_id === sid);
        const finalRow = trimesterGrades.find(t => t.subject_id === sid && t.quarter_id === activeQuarter.id);
        return {
          subject,
          grades: sg,
          trend: latestGradeTrend(sg, today),
          final: finalRow?.value ?? null,
          trimester: diaryAverage(sg, today),
          quarterName: trimesterLabel(activeQuarter.name),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.subject.name.localeCompare(b!.subject.name, "ru")) as any;
  }, [grades, trimesterGrades, activeQuarter, subjects, today]);

  return (
    <div className="px-3 pb-32">
      {mode === "date" ? (
        <div className="space-y-3 mt-2">
          {dateQuarterOptions.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {dateQuarterOptions.map(q => (
                <button key={q.id} onClick={() => setDateQuarterId(q.id)} className={cn("shrink-0 rounded-full px-4 h-9 text-sm font-medium", dateQuarter?.id === q.id ? "bg-primary text-primary-foreground" : "bg-white text-slate-700")}>
                  {trimesterLabel(q.name)}
                </button>
              ))}
            </div>
          )}
          {byDate.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-500">
              Оценок пока нет
            </div>
          )}
          {byDate.map(([date, gs]) => (
            <div key={date} className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="text-[13px] font-bold text-slate-900 tracking-wide">{formatRuDate(date)}</div>
                <div className="text-[13px] text-slate-500 mt-0.5">{relativeDay(date)}</div>
              </div>
              <div>
                {gs.map((g, i) => {
                  const subjectName = subjMap.get(g.subject_id) ?? "—";
                  const comment = g.comment?.trim() || cellCommentMap.get(`${g.subject_id}_${g.date}`) || "";
                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left",
                        i > 0 && "border-t border-slate-100"
                      )}
                    >
                      <button onClick={() => navigate(`/diary/student/grade/${g.id}`)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                        <SquareGrade value={g.value} weight={g.weight ?? 1} provisional={isDiaryProvisional(g, today)} control={isControlWorkTypeName(wtMap.get(g.work_type_id ?? ""))} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold text-slate-900 truncate">
                            {subjectName}
                          </div>
                          <div className="text-[13px] text-slate-500 truncate">
                            {g.work_type_id ? wtMap.get(g.work_type_id) ?? "Текущая оценка" : "Текущая оценка"}
                          </div>
                        </div>
                      </button>
                      {comment && (
                        <button
                          onClick={() => setOpenComment({ subject: subjectName, date, comment })}
                          className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
                          aria-label="Комментарий"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => navigate(`/diary/student/grade/${g.id}`)} className="w-6 h-9 flex items-center justify-center shrink-0" aria-label="Детали оценки">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 mt-2">
          {bySubject.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-500">
              В этом триместре ещё нет оценок
            </div>
          )}
          {bySubject.map((row: any) => {
            const display = row.final ?? row.trimester;
            const isFinal = row.final != null;
            return (
              <button
                key={row.subject.id}
                onClick={() => navigate(`/diary/student/subject/${row.subject.id}`)}
                className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 active:bg-slate-50 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-medium text-slate-900 truncate leading-tight">{row.subject.name}</div>
                  <div className="text-[13px] text-slate-500 mt-1">{row.quarterName}</div>
                </div>
                {isFinal ? (
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-2 text-[17px] font-semibold text-slate-900">
                      <Check className="w-5 h-5 text-success" strokeWidth={3} />
                      <span>{row.final}</span>
                    </div>
                    <span className="text-xs text-slate-500">итог.оценка</span>
                  </div>
                ) : (
                  <ScoreChip value={display} isFinal={false} trend={row.trend} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Переключатель внизу — фиксированный (над BottomNav) */}
      <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pt-6 pb-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-20 pointer-events-none">
        <div className="bg-slate-200/80 backdrop-blur rounded-full p-1 flex pointer-events-auto shadow-sm">
          <button
            onClick={() => setMode("date")}
            className={cn(
              "flex-1 h-10 rounded-full text-[15px] font-medium transition-colors",
              mode === "date" ? "bg-white text-slate-900 shadow-sm" : "text-slate-700"
            )}
          >
            По дате
          </button>
          <button
            onClick={() => setMode("subject")}
            className={cn(
              "flex-1 h-10 rounded-full text-[15px] font-medium transition-colors",
              mode === "subject" ? "bg-white text-slate-900 shadow-sm" : "text-slate-700"
            )}
          >
            По предмету
          </button>
        </div>
      </div>

      {openComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end justify-center" onClick={() => setOpenComment(null)}>
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[17px] font-semibold text-slate-900 truncate">{openComment.subject}</div>
                <div className="text-[13px] text-slate-500 mt-0.5">{formatRuDate(openComment.date)}</div>
              </div>
              <button onClick={() => setOpenComment(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center" aria-label="Закрыть">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-5 flex items-start gap-3 bg-slate-50 rounded-2xl p-4">
              <MessageSquare className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Комментарий:</div>
                <div className="text-[15px] text-slate-900 mt-2 whitespace-pre-wrap">{openComment.comment}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Большая квадратная оценка с подстрочным весом (как на референсе) */
const SquareGrade = ({ value, weight = 1, control, provisional }: { value: number; weight?: number; control?: boolean; provisional?: boolean }) => (
  <div className={cn(
    "relative w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0",
    control && "ring-2 ring-rose-500 bg-rose-50",
    provisional && "outline outline-2 outline-primary/40"
  )}>
    <span className="text-[22px] font-semibold text-slate-900 leading-none">{value}{provisional && <span className="text-primary">•</span>}</span>
    <span className={cn("absolute right-1.5 bottom-1 text-[10px]", control ? "text-rose-600 font-semibold" : "text-slate-500")}>{weight}</span>
  </div>
);

const ScoreChip = ({ value, isFinal, trend }: { value: number | null; isFinal: boolean; trend: GradeTrend }) => {
  if (value == null) {
    return (
      <div className="border border-dashed border-slate-300 rounded-lg px-3 py-2 text-[15px] text-slate-400 min-w-[78px] text-center">
        —
      </div>
    );
  }
  if (isFinal) {
    const intVal = Math.round(value);
    return (
      <div className="bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2 flex items-center gap-2 font-semibold min-w-[78px] justify-center">
        <CheckSquare className="w-4 h-4 fill-emerald-500 text-white" />
        <span className="text-[15px]">{intVal}</span>
      </div>
    );
  }
  const icon = trend === "up" ? <ArrowUp strokeWidth={3.5} className="w-4 h-4 text-success" aria-label="Средний балл вырос" />
    : trend === "down" ? <ArrowDown strokeWidth={3.5} className="w-4 h-4 text-destructive" aria-label="Средний балл снизился" /> : null;
  return (
    <div className="border border-dashed border-slate-300 rounded-lg px-3 py-2 flex items-center gap-1.5 text-[15px] font-semibold text-slate-900 min-w-[78px] justify-center">
      {icon}
      <span>{value.toFixed(2)}</span>
    </div>
  );
};

export default DiaryGrades;
