import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, CalendarX } from "lucide-react";
import { useMemo } from "react";
import { useTeacherContext } from "@/contexts/TeacherContext";
import { useClassSchedule, useSubjects } from "@/hooks/useSchoolData";
import { LESSON_TIMES } from "@/components/admin/ClassScheduleEditor";

const DAYS = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
];

const Schedule = () => {
  const { selectedClassId, teacherClasses, allTeacherSubjects } = useTeacherContext();
  const { data: schedule } = useClassSchedule(selectedClassId || undefined, true);
  const { data: subjects } = useSubjects();

  const className = teacherClasses?.find((c: any) => c.id === selectedClassId)?.name || "";
  const subjectName = (id: string) => subjects?.find((s: any) => s.id === id)?.name || "Предмет";

  // Только предметы, которые ведёт этот учитель
  const mySubjectIds = useMemo(
    () => new Set((allTeacherSubjects || []).map((s: any) => s.id)),
    [allTeacherSubjects]
  );

  const byDay = useMemo(() => {
    const map = new Map<number, any[]>();
    (schedule || [])
      .filter((s: any) => mySubjectIds.size === 0 || mySubjectIds.has(s.subject_id))
      .forEach((s: any) => {
        const list = map.get(s.day_of_week) || [];
        list.push(s);
        map.set(s.day_of_week, list);
      });
    map.forEach((list) => list.sort((a, b) => a.lesson_number - b.lesson_number));
    return map;
  }, [schedule, mySubjectIds]);

  const hasAny = Array.from(byDay.values()).some((l) => l.length > 0);

  if (!selectedClassId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Расписание</h1>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Выберите класс вверху страницы.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Расписание</h1>
        {className && <span className="text-sm text-muted-foreground">класс {className}</span>}
      </div>

      {!hasAny ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CalendarX className="w-8 h-8 opacity-40" />
            <div>Для этого класса пока нет утверждённого расписания с вашими уроками.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {DAYS.map((day) => {
            const lessons = byDay.get(day.value) || [];
            if (lessons.length === 0) return null;
            return (
              <Card key={day.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{day.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lessons.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-6 text-sm font-semibold text-muted-foreground shrink-0">{lesson.lesson_number}</div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground w-32 shrink-0">
                        <Clock className="w-4 h-4" />
                        {LESSON_TIMES[lesson.lesson_number - 1]}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{subjectName(lesson.subject_id)}</span>
                        <span className="ml-2 text-sm text-primary font-medium">{className}</span>
                      </div>
                      {lesson.room && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          Каб. {lesson.room}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Schedule;
