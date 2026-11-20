import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isControlWorkTypeName } from "@/lib/gradeWeight";

import { useDiaryGrades } from "@/hooks/useSchoolData";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { diaryCountedGrades, diaryGradeLabel, diaryCorrectionDeadline, isDiaryProvisional } from "@/lib/diaryProvisionalGrades";

interface Grade {
  id: string;
  value: number;
  date: string;
  student_id: string;
  subject_id: string;
  work_type_id: string | null;
  class_id: string;
  weight?: number | null;
  comment?: string | null;
  provisional_until?: string | null;
}

const MONTHS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const formatShort = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

const DiaryGradeDetail = () => {
  const { gradeId } = useParams();
  const navigate = useNavigate();
  const { account } = useDiaryAuth();
  const { studentId } = useSelectedStudent();
  const today = useDiaryToday();

  const { data: gradeRows = [], isLoading: gradeLoading } = useDiaryGrades(account?.classId, studentId, undefined, undefined, gradeId);
  const grade = gradeRows[0] ?? null;
  const [subjectName, setSubjectName] = useState("");
  const [workTypeName, setWorkTypeName] = useState<string | null>(null);
  const [classGrades, setClassGrades] = useState<{ value: number; provisional_until?: string | null }[]>([]);
  const [cellComment, setCellComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gradeId || !account || !studentId) return;
    if (!grade) return;
    setLoading(true);
    (async () => {
      const g = grade;
      const [subj, wt, peers, cell] = await Promise.all([
        supabase.from("subjects").select("name").eq("id", g.subject_id).maybeSingle(),
        g.work_type_id
          ? supabase.from("work_types").select("name").eq("id", g.work_type_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        // Класс по той же работе/дате/предмету
        g.work_type_id
          ? supabase.from("grades")
              .select("value, provisional_until")
              .eq("class_id", g.class_id)
              .eq("subject_id", g.subject_id)
              .eq("work_type_id", g.work_type_id)
              .eq("date", g.date)
          : supabase.from("grades")
              .select("value, provisional_until")
              .eq("class_id", g.class_id)
              .eq("subject_id", g.subject_id)
              .eq("date", g.date)
              .is("work_type_id", null),
        supabase.from("cell_comments")
          .select("comment")
          .eq("student_id", g.student_id)
          .eq("class_id", g.class_id)
          .eq("subject_id", g.subject_id)
          .eq("date", g.date)
          .maybeSingle(),
      ]);
      setSubjectName(subj.data?.name ?? "");
      setWorkTypeName(wt.data?.name ?? null);
      setClassGrades(peers.data ?? []);
      setCellComment(cell.data?.comment ?? "");
      setLoading(false);
    })();
  }, [gradeId, account, studentId, grade]);

  const displayComment = grade?.comment?.trim() || cellComment.trim();

  const distribution = useMemo(() => {
    const counted = diaryCountedGrades(classGrades, today);
    const total = counted.length;
    const counts = new Map<number, number>();
    for (const g of counted) counts.set(g.value, (counts.get(g.value) ?? 0) + 1);
    const rows = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, pct: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value);
    return { total, rows };
  }, [classGrades, today]);

  const myShare = useMemo(() => {
    if (!grade) return null;
    return distribution.rows.find(r => r.value === grade.value) ?? null;
  }, [distribution, grade]);

  const barColor = (v: number) => {
    if (v === 5) return "bg-emerald-300";
    if (v === 4) return "bg-lime-300";
    if (v === 3) return "bg-orange-300";
    return "bg-rose-300";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Фиолетовый градиент-хедер */}
      <div className="bg-gradient-to-b from-violet-500 to-fuchsia-500 px-4 pt-4 pb-14 text-white">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2" aria-label="Назад">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-base font-medium">Детали оценки</div>
          <div className="w-10" />
        </div>

        {loading || gradeLoading || !grade ? (
          <div className="text-center text-sm text-white/80 py-10">Загрузка…</div>
        ) : (
          <div className="flex flex-col items-center mt-6">
            <div className={cn(
              "w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg relative",
              isControlWorkTypeName(workTypeName) && "ring-4 ring-rose-500",
              isDiaryProvisional(grade, today) && "outline outline-4 outline-primary/40"
            )}>
              <span className="text-4xl font-bold text-slate-900">{diaryGradeLabel(grade, today)}</span>
              <span className="absolute right-2 bottom-1 text-[11px] text-slate-500 font-normal">{grade.weight ?? 1}</span>
            </div>
            <h1 className="text-2xl font-bold text-center mt-4">{subjectName || "—"}</h1>
            {workTypeName && (
              <div className="text-sm text-white/90 mt-1">
                {workTypeName}
                {(grade.weight ?? 1) > 1 && <span className="ml-1 font-semibold">· вес ×{grade.weight}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="-mt-8 px-3 space-y-3 pb-8">
        {grade && (
          <button
            onClick={() => navigate(`/diary/student/subject/${grade.subject_id}`)}
            className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm text-left hover:shadow-md transition"
          >
            <div className="min-w-0">
              <div className="text-base text-slate-900">Оценка за урок {formatShort(grade.date)}</div>
              <div className="text-xs text-slate-500 mt-0.5">Выставлена {formatShort(grade.date)}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </button>
        )}

        {grade && isDiaryProvisional(grade, today) && grade.provisional_until && (
          <div className="border-l-4 border-primary bg-primary/10 px-4 py-4 text-sm font-semibold text-primary">{diaryCorrectionDeadline(grade.provisional_until)}</div>
        )}

        {displayComment && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <MessageSquare className="w-4 h-4" /> Комментарий:
            </div>
            <div className="mt-3 text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap">
              {displayComment}
            </div>
          </div>
        )}

        {/* Результаты класса */}
        {grade && !isDiaryProvisional(grade, today) && distribution.total > 0 && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Результаты класса</div>
              {expanded && (
                <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-600" aria-label="Свернуть">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {!expanded ? (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-900">
                    {grade.value}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900">
                      {myShare?.pct ?? 0}% получили такой результат
                    </div>
                    <div className="text-xs text-slate-500">
                      {myShare?.count ?? 0} {pluralStudents(myShare?.count ?? 0)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setExpanded(true)} className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-700">
                  Подробнее
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-900">
                    {grade.value}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900">
                      {myShare?.pct ?? 0}% получили такой результат
                    </div>
                    <div className="text-xs text-slate-500">
                      {myShare?.count ?? 0} {pluralStudents(myShare?.count ?? 0)}
                    </div>
                  </div>
                </div>

                <button onClick={() => setExpanded(false)} className="mt-3 mb-4 text-sm font-medium text-violet-600 hover:text-violet-700 block">
                  Свернуть
                </button>

                <div className="text-sm text-slate-900 mb-3">
                  Оценку за эту работу получили<br />
                  <span className="font-semibold">{distribution.total} {pluralStudents(distribution.total)}:</span>
                </div>

                <div className="space-y-2.5">
                  {distribution.rows.map((row) => (
                    <div key={row.value} className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-base font-semibold text-slate-900 shrink-0">
                        {row.value}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("absolute inset-y-0 left-0 rounded-full", barColor(row.value))} style={{ width: `${row.pct}%` }} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{row.pct}%</div>
                      </div>
                      <div className="text-xs text-slate-500 w-12 text-right shrink-0">{row.count} уч.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {grade && !isDiaryProvisional(grade, today) && distribution.total === 0 && (
          <div className="bg-white rounded-2xl p-4 text-sm text-slate-500 text-center">
            Нет данных о результатах класса
          </div>
        )}
      </div>
    </div>
  );
};

function pluralStudents(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ученик";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "ученика";
  return "учеников";
}

export default DiaryGradeDetail;
