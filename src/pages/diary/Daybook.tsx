import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDiaryGrades } from "@/hooks/useSchoolData";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { diaryGradeLabel } from "@/lib/diaryProvisionalGrades";
import { cn } from "@/lib/utils";

const DOW_RU = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

interface Grade { id: string; value: number; date: string; subject_id: string; work_type_id: string | null; comment: string | null }
interface HW { id: string; title: string; description: string | null; due_date: string; subject_id: string }
interface Subject { id: string; name: string }

const fmtIso = (d: Date) => d.toISOString().slice(0, 10);
const isToday = (d: Date) => fmtIso(d) === fmtIso(new Date());

const Daybook = () => {
  const { account } = useDiaryAuth();
  const { studentId } = useSelectedStudent();
  useDiaryToday();
  const [date, setDate] = useState<Date>(() => { const t = new Date(); t.setHours(0,0,0,0); return t; });
  const navigate = useNavigate();
  const { data: grades = [] } = useDiaryGrades(account?.classId, studentId, undefined, fmtIso(date));
  const [homework, setHomework] = useState<HW[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!account) return;
    supabase.from("subjects").select("id, name").then(({ data }) => setSubjects(data ?? []));
  }, [account]);

  useEffect(() => {
    if (!studentId || !account) return;
    const iso = fmtIso(date);
    supabase
      .from("homework")
      .select("id, title, description, due_date, subject_id")
      .eq("class_id", account.classId)
      .eq("due_date", iso)
      .then(({ data }) => setHomework((data ?? []) as HW[]));
  }, [studentId, account, date]);

  const subjMap = useMemo(() => new Map(subjects.map(s => [s.id, s.name])), [subjects]);

  const goPrev = () => { const n = new Date(date); n.setDate(n.getDate() - 1); setDate(n); };
  const goNext = () => { const n = new Date(date); n.setDate(n.getDate() + 1); setDate(n); };
  const goToday = () => { const t = new Date(); t.setHours(0,0,0,0); setDate(t); };

  // Объединяем уроки по предметам, у которых есть оценка или ДЗ
  const subjectsOnDay = useMemo(() => {
    const ids = new Set<string>([...grades.map(g => g.subject_id), ...homework.map(h => h.subject_id)]);
    return Array.from(ids).map(id => ({
      id,
      name: subjMap.get(id) ?? "—",
      grades: grades.filter(g => g.subject_id === id),
      homework: homework.filter(h => h.subject_id === id),
    })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [grades, homework, subjMap]);

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 md:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Дневник по дням</h1>
          <p className="text-sm text-slate-500 mt-1">
            {DOW_RU[date.getDay()]}, {date.getDate()} {MONTHS_RU[date.getMonth()]}
            {isToday(date) && <span className="ml-2 text-blue-600 font-medium">· сегодня</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-4 h-10 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-900 hover:bg-slate-50">
            Сегодня
          </button>
          <button onClick={goNext} className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {subjectsOnDay.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
          <div className="text-5xl mb-4">📚</div>
          <div className="text-lg font-semibold text-slate-900">Записей за этот день нет</div>
          <div className="text-sm text-slate-500 mt-1">На выбранную дату нет ни оценок, ни домашних заданий</div>
        </div>
      ) : (
        <div className="space-y-3">
          {subjectsOnDay.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-slate-900 text-lg">{s.name}</div>
                {s.grades.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {s.grades.map(g => <Button key={g.id} variant="ghost" size="icon" aria-label={`Оценка ${diaryGradeLabel(g)}`} onClick={() => navigate(`/diary/student/grade/${g.id}`)}><GradePill value={g.value} label={diaryGradeLabel(g)} /></Button>)}
                  </div>
                )}
              </div>
              {s.homework.length > 0 && (
                <div className="space-y-2 mt-3">
                  {s.homework.map(h => (
                    <div key={h.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900">{h.title}</div>
                        {h.description && <div className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{h.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {s.homework.length === 0 && s.grades.length > 0 && (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Домашнее задание не назначено
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GradePill = ({ value, label }: { value: number; label: string }) => {
  const color = value >= 4 ? "bg-emerald-100 text-emerald-700" : value === 3 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-base font-semibold", color)}>
      {label}
    </div>
  );
};

export default Daybook;
