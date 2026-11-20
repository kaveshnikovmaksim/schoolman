import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { GradeBadge } from "@/components/diary/GradeBadge";
import { ChevronLeft, MessageSquare, Star, Award, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { isControlWorkTypeName } from "@/lib/gradeWeight";

import { useDiaryGrades, useTrimesterGradesByClassSubject } from "@/hooks/useSchoolData";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { diaryAverage, isDiaryProvisional } from "@/lib/diaryProvisionalGrades";
import { classSubjectRanking } from "@/lib/diaryGradeStats";
import { visibleDiaryQuarters, oldestFirst } from "@/lib/diaryQuarters";
import { useDisplayDefaults } from "@/hooks/useSchoolData";
import { displayQuarter } from "@/lib/displayDefaults";

interface Grade { id: string; value: number; date: string; student_id: string; work_type_id: string | null; weight?: number | null; comment?: string | null }
interface Quarter { id: string; name: string; start_date: string; end_date: string }
interface Student { id: string; name: string }
interface CellComment { student_id: string; date: string; comment: string }

const DiarySubject = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { account } = useDiaryAuth();
  const { studentId } = useSelectedStudent();
  const today = useDiaryToday();
  const { data: displayDefaults } = useDisplayDefaults();
  const defaultQuarterId = displayDefaults?.find(r => r.target === "diary")?.quarter_id;

  const [subjectName, setSubjectName] = useState("");
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const { data: grades = [] } = useDiaryGrades(account?.classId, null, subjectId);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const { data: trimesterGrades = [] } = useTrimesterGradesByClassSubject(account?.classId, subjectId);
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);
  const [cellComments, setCellComments] = useState<CellComment[]>([]);

  useEffect(() => {
    if (!subjectId || !account || !studentId) return;
    supabase.from("subjects").select("name").eq("id", subjectId).maybeSingle().then(({ data }) => setSubjectName(data?.name ?? ""));
    supabase.from("academic_quarters").select("*").order("start_date").then(({ data }) => setQuarters(data ?? []));
    supabase.from("work_types").select("id, name").then(({ data }) => setWorkTypes(data ?? []));
    supabase.from("students").select("id, name").eq("class_id", account.classId).then(({ data }) => setClassmates(data ?? []));
    supabase.from("cell_comments")
      .select("student_id, date, comment")
      .eq("subject_id", subjectId)
      .eq("class_id", account.classId)
      .eq("student_id", studentId)
      .then(({ data }) => setCellComments((data ?? []) as CellComment[]));
  }, [subjectId, account, studentId]);

  const myGrades = useMemo(() => grades.filter(g => g.student_id === studentId), [grades, studentId]);
  const wtMap = useMemo(() => new Map(workTypes.map(w => [w.id, w.name])), [workTypes]);
  const cellCommentMap = useMemo(() => {
    const map = new Map<string, string>();
    cellComments.forEach((c) => {
      if (c.comment?.trim()) map.set(`${c.student_id}_${c.date}`, c.comment);
    });
    return map;
  }, [cellComments]);

  const activeQuarter = useMemo(() => displayQuarter(quarters, null, defaultQuarterId, today), [quarters, today, defaultQuarterId]);

  // Рейтинг класса в активном триместре по среднему баллу
  const ranking = useMemo(() => {
    if (!activeQuarter) return [];
    return classSubjectRanking(classmates, grades, activeQuarter, today);
  }, [classmates, grades, activeQuarter, today]);

  return (
    <div className="pb-8 min-h-screen flex flex-col bg-diary-bg text-diary-fg">
      {/* Фиолетовый градиент-хедер */}
      <div className="bg-diary-subject px-4 pt-5 pb-7 text-primary-foreground rounded-b-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Назад">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="text-base font-medium">Предмет</div>
          <div className="w-10" />
        </div>
        <h1 className="text-3xl font-bold text-center mt-4">{subjectName || "—"}</h1>
      </div>

      {/* Карточки триместров */}
      <div className="px-3 pt-5 space-y-5">
        {visibleDiaryQuarters(quarters, today, (q) => q.id === defaultQuarterId || myGrades.some(g => g.date >= q.start_date && g.date <= q.end_date) || trimesterGrades.some(t => t.quarter_id === q.id && t.student_id === studentId)).sort((a, b) => Number(b.id === defaultQuarterId) - Number(a.id === defaultQuarterId)).map((q) => {
          const qGrades = oldestFirst(myGrades.filter(g => g.date >= q.start_date && g.date <= q.end_date));
          const finalRow = trimesterGrades.find(t => t.quarter_id === q.id && t.student_id === studentId);
          const trimesterAvg = diaryAverage(qGrades, today);
          return (
            <div key={q.id} className="bg-diary-surface rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-diary-marker flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary-foreground fill-current" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-diary-fg uppercase">{q.name}</span>
                    <span className="block text-sm text-diary-muted">{format(parseISO(q.start_date), "d MMMM", { locale: ru })} – {format(parseISO(q.end_date), "d MMMM", { locale: ru })}</span>
                  </div>
                </div>
                {finalRow ? (
                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-2 font-semibold">
                        <Check className="w-5 h-5 text-success" strokeWidth={3} />
                        <span>{finalRow.value}</span>
                      </div>
                      <span className="text-xs text-diary-muted">итог.оценка</span>
                    </div>
                  ) : trimesterAvg != null ? (
                    <div className="shrink-0 text-right">
                      <span className="block font-semibold">{trimesterAvg.toFixed(2)}</span>
                      <span className="text-xs text-diary-muted">средний балл</span>
                    </div>
                  ) : null}
              </div>
              {qGrades.length > 0 ? (
                <div className="flex flex-wrap gap-x-5 gap-y-4">
                  {qGrades.map(g => {
                    const comment = g.comment?.trim() || cellCommentMap.get(`${g.student_id}_${g.date}`) || "";
                    return (
                      <Button variant="ghost" key={g.id} onClick={() => navigate(`/diary/student/grade/${g.id}`)} className="relative h-12 w-12 shrink-0 p-0 hover:bg-transparent" aria-label={`Оценка ${g.value}`}>
                        <GradeBadge value={g.value} weight={g.weight ?? 1} provisional={isDiaryProvisional(g, today)} control={isControlWorkTypeName(wtMap.get(g.work_type_id ?? ""))} size="md" className="!w-12 !h-12 !font-medium" />
                        {comment && (
                          <span className="absolute -right-0.5 -top-0.5 w-4 h-4 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                            <MessageSquare className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-diary-muted text-center py-2">нет оценок</div>
              )}
            </div>
          );
        })}

        {/* Рейтинг по предмету */}
        {ranking.length > 0 && (
          <div className="bg-diary-surface rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-diary-marker flex items-center justify-center">
                <Award className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-diary-fg uppercase">Рейтинг в классе</span>
            </div>
            <div className="space-y-2">
              {ranking.map((g) => {
                const isMe = g.students.some(s => s.id === studentId);
                return (
                  <div key={g.rank} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-semibold text-diary-fg">{g.rank}</span>
                    <div className="min-w-0 flex-1">
                      <div className="h-7 rounded-md bg-muted overflow-hidden">
                        <div className={isMe ? "h-full rounded-md bg-diary-rating flex items-center px-2 ring-2 ring-inset ring-primary" : "h-full rounded-md bg-diary-rating/70 flex items-center px-2"} style={{ width: `${Math.max(18, (g.avg / 5) * 100)}%` }}>
                          <span className="text-xs font-medium text-diary-fg whitespace-nowrap">{isMe ? "Вы" : `${g.students.length} чел.`}</span>
                        </div>
                      </div>
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-diary-fg">{g.avg.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiarySubject;
