import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Trash2, Loader2, BookOpen, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherContext } from "@/contexts/TeacherContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useClassSchedule } from "@/hooks/useSchoolData";

const Homework = () => {
  const { selectedClassId, teacherId, teacherClasses, teacherSubjects } = useTeacherContext();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [tab, setTab] = useState<"active" | "past" | "all">("active");
  const { toast } = useToast();
  const qc = useQueryClient();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setSelectedSubject("");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (hw: any) => {
    setEditingId(hw.id);
    setTitle(hw.title);
    setDescription(hw.description || "");
    setDueDate(hw.due_date);
    setSelectedSubject(hw.subject_id);
    setOpen(true);
  };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) resetForm();
  };

  const { data: homework, isLoading } = useQuery({
    queryKey: ["homework", selectedClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("*, subjects(name), classes(name)")
        .eq("class_id", selectedClassId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClassId,
  });

  // Утверждённое расписание класса: ДЗ можно задать только на дни, когда есть урок этого предмета
  const { data: publishedSchedule } = useClassSchedule(selectedClassId || undefined, true);

  const lessonWeekdays = useMemo(() => {
    if (!selectedSubject || !publishedSchedule?.length) return null;
    const forSubject = publishedSchedule.filter((s: any) => s.subject_id === selectedSubject);
    if (!forSubject.length) return null;
    return new Set(forSubject.map((s: any) => s.day_of_week % 7));
  }, [publishedSchedule, selectedSubject]);

  const lessonDates = useMemo(() => {
    if (!lessonWeekdays) return null;
    const out: string[] = [];
    const d = startOfDay(new Date());
    for (let i = 0; i < 90; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() + i);
      if (lessonWeekdays.has(cur.getDay())) out.push(format(cur, "yyyy-MM-dd"));
    }
    return out;
  }, [lessonWeekdays]);

  // Если выбранная дата не совпадает с днями уроков — сбрасываем
  const dueDateValid = !lessonDates || !dueDate || lessonDates.includes(dueDate);

  const activeHomework = useMemo(() =>
    homework?.filter((hw: any) => !isBefore(parseISO(hw.due_date), startOfDay(new Date()))) || [], [homework]);
  const pastHomework = useMemo(() =>
    homework?.filter((hw: any) => isBefore(parseISO(hw.due_date), startOfDay(new Date()))) || [], [homework]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("homework").update({
          subject_id: selectedSubject,
          title,
          description,
          due_date: dueDate,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        if (!teacherId) throw new Error("Учитель не найден");
        const { data: created, error } = await supabase.from("homework").insert({
          teacher_id: teacherId,
          subject_id: selectedSubject,
          class_id: selectedClassId,
          title,
          description,
          due_date: dueDate,
        }).select("id").single();
        if (error) throw error;
        if (created?.id) {
          await supabase.functions.invoke("notify-homework", { body: { homework_id: created.id } });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      qc.invalidateQueries({ queryKey: ["journal_homework"] });
      toast({ title: editingId ? "ДЗ обновлено" : "ДЗ задано" });
      handleClose(false);
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("homework").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Не удалось удалить задание — нет прав на изменение");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      qc.invalidateQueries({ queryKey: ["journal_homework"] });
      toast({ title: "Задание удалено" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (!selectedClassId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Домашние задания</h1>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Выберите класс в верхней панели</CardContent></Card>
      </div>
    );
  }

  const canSubmit = title && dueDate && selectedSubject;
  const displayedHomework = tab === "past" ? pastHomework : tab === "all" ? (homework || []) : activeHomework;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Домашние задания</h1>
        <Button onClick={openCreate}><BookOpen className="w-4 h-4 mr-2" /> Задать ДЗ</Button>
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать ДЗ" : "Задать домашнее задание"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Предмет</Label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card">
                <option value="">Выберите предмет</option>
                {teacherSubjects?.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Задание</Label>
              <Input placeholder="§15 упр. 5–12" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea placeholder="Подробное описание задания..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>На какое число</Label>
              {lessonDates ? (
                <>
                  <select
                    value={dueDateValid ? dueDate : ""}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card"
                  >
                    <option value="">Выберите дату урока</option>
                    {lessonDates.map((d) => (
                      <option key={d} value={d}>
                        {format(parseISO(d), "d MMMM, EEEE", { locale: ru })}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Доступны только дни, когда у этого класса есть урок по предмету.
                  </p>
                </>
              ) : (
                <>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Расписание по этому предмету не утверждено — доступна любая дата.
                  </p>
                </>
              )}
            </div>
            <Button className="w-full" disabled={!canSubmit || !dueDateValid || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Сохранить" : "Задать ДЗ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === "active" ? "default" : "outline"} size="sm" onClick={() => setTab("active")}>Активные ({activeHomework.length})</Button>
        <Button variant={tab === "past" ? "default" : "outline"} size="sm" onClick={() => setTab("past")}>Прошедшие ({pastHomework.length})</Button>
        <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>Все ({homework?.length || 0})</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : displayedHomework.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{tab === "past" ? "Прошедших заданий нет" : tab === "all" ? "Заданий нет" : "Активных заданий нет"}</p>
      ) : (
        <div className="grid gap-3">
          {displayedHomework.map((hw: any) => (
            <Card key={hw.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{hw.title}</span>
                      <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{hw.subjects?.name}</span>
                    </div>
                    {hw.description && <p className="text-sm text-muted-foreground mb-2">{hw.description}</p>}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(parseISO(hw.due_date), "dd.MM.yyyy")}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => openEdit(hw)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(hw.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Homework;
