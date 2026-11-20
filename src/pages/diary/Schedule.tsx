import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal, Plus, X, FileText, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { diaryGradeLabel, diaryCorrectionDeadline, isDiaryProvisional } from "@/lib/diaryProvisionalGrades";
import { useClassSchedule, useClassSubjects, useDiaryGrades } from "@/hooks/useSchoolData";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { LESSON_TIMES } from "@/components/admin/ClassScheduleEditor";
import { supabase } from "@/integrations/supabase/client";

const DOW_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const day = x.getDay(); // 0=вс
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  return x;
}

function fmtRange(start: Date, end: Date) {
  const sM = MONTHS_RU[start.getMonth()].slice(0,3);
  const eM = MONTHS_RU[end.getMonth()].slice(0,3);
  return `${start.getDate()} ${sM} – ${end.getDate()} ${eM}`;
}

const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
const fmtIso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

interface HW { id: string; title: string; description: string | null; subject_id: string }
interface LessonGrade { id: string; value: number; subject_id: string; comment: string | null; weight: number | null }
interface LessonCellComment { subject_id: string; comment: string }

const DiarySchedule = () => {
  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);
  const [selected, setSelected] = useState<Date>(today);
  const [openLesson, setOpenLesson] = useState<any | null>(null);

  const weekStart = useMemo(() => startOfWeek(selected), [selected]);
  const weekDays = useMemo(() => Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d;
  }), [weekStart]);
  const weekEnd = weekDays[6];

  const isSameDay = (a: Date, b: Date) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const goPrev = () => { const n = new Date(weekStart); n.setDate(n.getDate()-7); setSelected(n); };
  const goNext = () => { const n = new Date(weekStart); n.setDate(n.getDate()+7); setSelected(n); };
  const goToday = () => setSelected(today);

  const { account } = useDiaryAuth();
  const { studentId } = useSelectedStudent();
  useDiaryToday();
  const { data: schedule } = useClassSchedule(account?.classId, true);
  const { data: classSubjects } = useClassSubjects(account?.classId);

  const teacherBySubject = useMemo(() => {
    const m = new Map<string, string>();
    (classSubjects || []).forEach((cs: any) => {
      if (cs.teachers?.name) m.set(cs.subject_id, cs.teachers.name);
    });
    return m;
  }, [classSubjects]);

  const [homework, setHomework] = useState<HW[]>([]);

  const [lessonComments, setLessonComments] = useState<LessonCellComment[]>([]);
  const selectedIso = fmtIso(selected);
  const { data: lessonGrades = [] } = useDiaryGrades(account?.classId, studentId, undefined, selectedIso);

  useEffect(() => {
    if (!account) return;
    supabase
      .from("homework")
      .select("id, title, description, subject_id")
      .eq("class_id", account.classId)
      .eq("due_date", selectedIso)
      .then(({ data }) => setHomework((data ?? []) as HW[]));
  }, [account, selectedIso]);

  useEffect(() => {
    if (!account || !studentId) return;
    supabase
      .from("cell_comments")
      .select("subject_id, comment")
      .eq("class_id", account.classId)
      .eq("student_id", studentId)
      .eq("date", selectedIso)
      .then(({ data }) => setLessonComments((data ?? []) as LessonCellComment[]));
  }, [account, studentId, selectedIso]);

  const hwBySubject = useMemo(() => {
    const m = new Map<string, HW[]>();
    homework.forEach((h) => {
      if (!m.has(h.subject_id)) m.set(h.subject_id, []);
      m.get(h.subject_id)!.push(h);
    });
    return m;
  }, [homework]);

  const dayLessons = useMemo(() => {
    const dow = selected.getDay() === 0 ? 7 : selected.getDay();
    return (schedule || [])
      .filter((s) => s.day_of_week === dow)
      .sort((a, b) => a.lesson_number - b.lesson_number);
  }, [schedule, selected]);

  const openHw = openLesson ? (hwBySubject.get(openLesson.subject_id) || []) : [];
  const openGrades = openLesson ? lessonGrades.filter((g) => g.subject_id === openLesson.subject_id) : [];
  const commentBySubject = useMemo(() => {
    const m = new Map<string, string>();
    lessonComments.forEach((c) => {
      if (c.comment?.trim()) m.set(c.subject_id, c.comment);
    });
    return m;
  }, [lessonComments]);
  const openCellComment = openLesson ? commentBySubject.get(openLesson.subject_id) || "" : "";

  return (
    <div className="px-3 pb-24 md:px-0">
      {/* Полоска дней недели */}
      <div className="bg-white rounded-2xl px-2 pt-3 pb-2 mt-1">
        <div className="grid grid-cols-7">
          {weekDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className={cn("text-[12px] font-medium", isWeekend(d) ? "text-rose-400" : "text-slate-500")}>{DOW_SHORT[i]}</span>
              <button
                onClick={() => setSelected(d)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-medium transition-colors",
                  isSameDay(d, selected)
                    ? "bg-blue-600 text-white"
                    : isWeekend(d) ? "text-rose-400" : "text-slate-900"
                )}
              >
                {d.getDate()}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Панель управления неделей */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={goPrev}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm"
          aria-label="Предыдущая неделя"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 bg-white rounded-full px-4 h-9 flex items-center justify-center text-[14px] font-medium text-slate-900 shadow-sm">
          {fmtRange(weekDays[0], weekEnd)}
        </div>
        <button
          onClick={goNext}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm"
          aria-label="Следующая неделя"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={goToday}
          className="bg-white rounded-full px-4 h-9 text-[14px] font-medium text-slate-900 shadow-sm"
        >
          Сегодня
        </button>
      </div>

      {/* Кнопки фильтров (декоративные пока) */}
      <div className="flex items-center gap-2 mt-3">
        <button className="bg-white rounded-full px-4 h-9 text-[14px] font-medium text-slate-900 shadow-sm">
          {cap(MONTHS_RU[selected.getMonth()])}
        </button>
        <button className="bg-white rounded-full px-4 h-9 text-[14px] font-medium text-slate-900 shadow-sm">
          Вид
        </button>
        <div className="flex-1" />
        <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {dayLessons.length > 0 ? (
        <div className="mt-4 space-y-2">
          {dayLessons.map((l) => {
            const hws = hwBySubject.get(l.subject_id) || [];
            const hasComment = lessonGrades.some((g) => g.subject_id === l.subject_id && g.comment?.trim()) || !!commentBySubject.get(l.subject_id);
            return (
              <button
                key={l.id}
                onClick={() => setOpenLesson(l)}
                className="w-full text-left bg-white rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[14px] font-semibold shrink-0">
                  {l.lesson_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-slate-900 truncate">{l.subjects?.name}</div>
                  <div className="text-[13px] text-slate-500">{LESSON_TIMES[l.lesson_number - 1]}</div>
                  {hws.length > 0 && (
                    <div className="mt-1 text-[12px] text-slate-500 leading-snug">
                      <span className="text-blue-600 font-medium">Д/З: </span>
                      {hws.map((h) => h.title).join("; ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasComment && <MessageSquare className="w-4 h-4 text-slate-400" />}
                  {l.room && <div className="text-[13px] text-slate-500">Каб. {l.room}</div>}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center text-center px-4">
          <div className="text-[64px] leading-none">🙂</div>
          <div className="mt-6 text-[20px] font-semibold text-slate-900">Уроков и мероприятий нет</div>
          <div className="mt-2 text-[14px] text-slate-500">Уроков и мероприятий на этот день не найдено</div>
        </div>
      )}

      {/* Панель урока */}
      {openLesson && (
        <div className="fixed inset-0 z-50 bg-white" onClick={() => setOpenLesson(null)}>
          <div
            className="h-full w-full overflow-y-auto bg-slate-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-b from-blue-600 to-violet-600 px-4 pt-4 pb-8 text-white">
              <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-white/80">
                    {openLesson.lesson_number} урок · {LESSON_TIMES[openLesson.lesson_number - 1]}
                    {openLesson.room ? ` · каб. ${openLesson.room}` : ""}
                  </div>
                  <div className="text-[28px] font-semibold mt-2">{openLesson.subjects?.name}</div>
                </div>
                <button onClick={() => setOpenLesson(null)} className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center" aria-label="Закрыть">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-4 pb-10 space-y-4">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] text-slate-500">Учитель</div>
                  <div className="text-[16px] font-medium text-slate-900 truncate">
                    {teacherBySubject.get(openLesson.subject_id) ?? "Не назначен"}
                  </div>
                </div>
              </div>

              {openGrades.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Оценки за урок</div>
                  <div className="space-y-3">
                    {openGrades.map((g) => (
                      <div key={g.id} className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-lg font-semibold text-slate-900 relative">
                            {diaryGradeLabel(g)}
                            {(g.weight ?? 1) > 1 && <span className="absolute right-1.5 bottom-1 text-[10px] text-slate-500">{g.weight}</span>}
                          </div>
                          <div className="flex-1 min-w-0 text-[14px] text-slate-700">{isDiaryProvisional(g) && g.provisional_until ? diaryCorrectionDeadline(g.provisional_until) : "Выставлена за этот урок"}</div>
                          {g.comment && g.comment.trim() && <MessageSquare className="w-5 h-5 text-slate-500 shrink-0" />}
                        </div>
                        {g.comment && g.comment.trim() && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3">
                            <MessageSquare className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[12px] font-semibold text-slate-500">Комментарий:</div>
                              <div className="text-[14px] text-slate-900 mt-1 whitespace-pre-wrap">{g.comment}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {openCellComment && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
                    <MessageSquare className="w-4 h-4" /> Комментарий учителя
                  </div>
                  <div className="text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap bg-slate-50 rounded-2xl p-3">
                    {openCellComment}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Домашнее задание</div>
                {openHw.length === 0 ? (
                  <div className="text-[14px] text-slate-500 bg-slate-50 rounded-2xl p-3">Не задано</div>
                ) : (
                  <div className="space-y-2">
                    {openHw.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-slate-900">{h.title}</div>
                          {h.description && (
                            <div className="text-[13px] text-slate-600 mt-0.5 whitespace-pre-wrap">{h.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setOpenLesson(null)} className="w-full h-12 rounded-2xl bg-slate-900 text-white text-[15px] font-medium">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiarySchedule;
