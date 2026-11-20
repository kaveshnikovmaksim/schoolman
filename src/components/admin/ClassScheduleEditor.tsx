import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useClassSchedule, useClassScheduleMutations, useClassSubjects } from "@/hooks/useSchoolData";

const DAYS = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
];

export const LESSON_TIMES = [
  "8:30 – 9:15",
  "9:25 – 10:10",
  "10:30 – 11:15",
  "11:25 – 12:10",
  "12:30 – 13:15",
  "13:25 – 14:10",
  "14:20 – 15:05",
  "15:15 – 16:00",
];

interface Props {
  classId: string;
}

const ClassScheduleEditor = ({ classId }: Props) => {
  const { data: slots } = useClassSchedule(classId);
  const { data: classSubjects } = useClassSubjects(classId);
  const { add, remove, publish, unpublish } = useClassScheduleMutations();

  const [day, setDay] = useState("1");
  const [lesson, setLesson] = useState("1");
  const [subjectId, setSubjectId] = useState("");
  const [dirty, setDirty] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<number, typeof slots>();
    DAYS.forEach((d) => map.set(d.value, []));
    (slots || []).forEach((s) => {
      map.set(s.day_of_week, [...(map.get(s.day_of_week) || []), s] as any);
    });
    return map;
  }, [slots]);

  const total = slots?.length ?? 0;
  const pendingCount = (slots || []).filter((s) => !s.published).length;
  const approved = total > 0 && pendingCount === 0 && !dirty;

  const handleAdd = () => {
    if (!subjectId) return;
    add.mutate({
      class_id: classId,
      subject_id: subjectId,
      day_of_week: Number(day),
      lesson_number: Number(lesson),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Расписание класса</CardTitle>
          <div className="flex items-center gap-2">
            {total === 0 ? (
              <Badge variant="secondary">Расписание не заполнено</Badge>
            ) : approved ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Утверждено
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Не утверждено ({pendingCount})
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(pendingCount > 0 || dirty) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Расписание изменено. Нажмите «Утвердить», чтобы сохранить изменения — они сразу появятся в журнале учителей и в дневнике учеников.
              </span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.5fr_auto] items-end">
            <div className="space-y-2">
              <Label>День</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Урок</Label>
              <Select value={lesson} onValueChange={setLesson}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LESSON_TIMES.map((t, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{i + 1}. {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Выберите предмет" /></SelectTrigger>
                <SelectContent>
                  {classSubjects?.map((cs: any) => (
                    <SelectItem key={cs.subject_id} value={cs.subject_id}>{cs.subjects?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!subjectId}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DAYS.map((d) => {
              const items = (byDay.get(d.value) || []) as any[];
              return (
                <div key={d.value} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-foreground mb-2">{d.label}</p>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Уроков нет</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <span className="text-muted-foreground mr-2">{s.lesson_number}.</span>
                            <span className="text-foreground">{s.subjects?.name}</span>
                            <span className="block text-xs text-muted-foreground">{LESSON_TIMES[s.lesson_number - 1]}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!s.published && <span className="text-[10px] text-amber-600">новое</span>}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDirty(true); remove.mutate(s.id); }}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              После утверждения даты в журнале учителей и в дневнике учеников синхронизируются с этим расписанием.
            </p>
            <div className="flex gap-2 shrink-0">
              {approved && (
                <Button variant="outline" onClick={() => unpublish.mutate(classId)}>Снять утверждение</Button>
              )}
              <Button onClick={() => { publish.mutate(classId); setDirty(false); }} disabled={total === 0 || approved}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Утвердить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassScheduleEditor;
