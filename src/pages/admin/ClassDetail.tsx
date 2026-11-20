import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Pencil, UserPlus, BookOpen, UserCheck, CalendarClock } from "lucide-react";
import ClassScheduleEditor from "@/components/admin/ClassScheduleEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useStudents, useStudentMutations, useClassSubjects, useClassSubjectMutations, useTeachers, useSubjects, useClassMutations } from "@/hooks/useSchoolData";
import { useQuery } from "@tanstack/react-query";

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: classInfo, isLoading: classLoading } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*, teachers(id, name)").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: students, isLoading: studentsLoading } = useStudents(id);
  const { create: createStudent, update: updateStudent, remove: removeStudent } = useStudentMutations();
  const { data: classSubjects } = useClassSubjects(id);
  const { create: createClassSubject, remove: removeClassSubject } = useClassSubjectMutations();
  const { data: teachers } = useTeachers();
  const { data: subjects } = useSubjects();
  const { update: updateClass } = useClassMutations();

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<{ id: string; name: string } | null>(null);
  const [studentName, setStudentName] = useState("");
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newHours, setNewHours] = useState("3");

  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentName("");
    setStudentDialogOpen(true);
  };

  const openEditStudent = (s: any) => {
    setEditingStudent({ id: s.id, name: s.name });
    setStudentName(s.name);
    setStudentDialogOpen(true);
  };

  const saveStudent = () => {
    if (!studentName.trim() || !id) return;
    if (editingStudent) {
      updateStudent.mutate({ id: editingStudent.id, name: studentName.trim(), class_id: id }, {
        onSuccess: () => { setStudentDialogOpen(false); setEditingStudent(null); setStudentName(""); },
      });
    } else {
      createStudent.mutate({ name: studentName.trim(), class_id: id }, {
        onSuccess: () => { setStudentDialogOpen(false); setStudentName(""); },
      });
    }
  };

  const addSubject = () => {
    if (!newSubjectId || !newTeacherId || !id) return;
    createClassSubject.mutate({
      class_id: id, subject_id: newSubjectId, teacher_id: newTeacherId,
      hours_per_week: Math.max(1, Math.min(10, parseInt(newHours) || 3)),
    }, {
      onSuccess: () => { setNewSubjectId(""); setNewTeacherId(""); setNewHours("3"); setSubjectDialogOpen(false); },
    });
  };

  const changeTeacher = (teacherId: string) => {
    if (!id || !classInfo) return;
    updateClass.mutate({ id, name: classInfo.name, teacher_id: teacherId || null, year: classInfo.year });
  };

  if (classLoading) return <div className="p-6"><Skeleton className="h-10 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  if (!classInfo) return <div className="p-6"><p>Класс не найден</p></div>;

  return (
    <div className="p-6 max-w-6xl">
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/admin/classes")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Назад к классам
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Класс {classInfo.name}</h1>
        <p className="text-muted-foreground mt-1">Классный руководитель: {classInfo.teachers?.name || "Не назначен"}</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList className="mb-4 bg-muted p-1.5 h-auto rounded-xl gap-2">
          <TabsTrigger value="students" className="gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-border bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md">
            <UserPlus className="w-4 h-4" /> Ученики ({students?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-border bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md">
            <BookOpen className="w-4 h-4" /> Предметы ({classSubjects?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="teacher" className="gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-border bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md">
            <UserCheck className="w-4 h-4" /> Кл. руководитель
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-border bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md">
            <CalendarClock className="w-4 h-4" /> Расписание
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Список учеников</CardTitle>
              <Button size="sm" onClick={openAddStudent}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
            </CardHeader>
            <CardContent>
              {studentsLoading ? <Skeleton className="h-32 w-full" /> : students?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Учеников пока нет.</p>
              ) : (
                <div className="divide-y divide-border">
                  {students?.map((s: any, idx: number) => (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                        <span className="text-foreground">{s.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStudent(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStudent.mutate(s.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Предметы класса</CardTitle>
              <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Добавить</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Добавить предмет</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Предмет</Label>
                      <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Выберите предмет" /></SelectTrigger>
                        <SelectContent>
                          {subjects?.filter((s: any) => !classSubjects?.some((cs: any) => cs.subject_id === s.id)).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Учитель</Label>
                      <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                        <SelectTrigger><SelectValue placeholder="Выберите учителя" /></SelectTrigger>
                        <SelectContent>
                          {teachers?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Часов в неделю</Label>
                      <Input type="number" min={1} max={10} value={newHours} onChange={(e) => setNewHours(e.target.value)} />
                    </div>
                    <Button className="w-full" onClick={addSubject} disabled={!newSubjectId || !newTeacherId}>Добавить</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {classSubjects?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Предметы не назначены.</p>
              ) : (
                <div className="divide-y divide-border">
                  {classSubjects?.map((cs: any) => (
                    <div key={cs.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-foreground">{cs.subjects?.name}</p>
                        <p className="text-sm text-muted-foreground">{cs.teachers?.name || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{cs.hours_per_week} ч/нед</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeClassSubject.mutate(cs.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teacher">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Классный руководитель</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Назначить классного руководителя</Label>
                <Select value={classInfo.teachers?.id || ""} onValueChange={changeTeacher}>
                  <SelectTrigger><SelectValue placeholder="Выберите учителя" /></SelectTrigger>
                  <SelectContent>
                    {teachers?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Текущий руководитель:</p>
                <p className="font-medium text-foreground mt-1">{classInfo.teachers?.name || "Не назначен"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schedule">
          {id && <ClassScheduleEditor classId={id} />}
        </TabsContent>
      </Tabs>

      {/* Add/Edit student dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStudent ? "Редактировать ученика" : "Добавить ученика"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ФИО ученика <span className="text-destructive">*</span></Label>
              <Input placeholder="Фамилия Имя" value={studentName} onChange={(e) => setStudentName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveStudent()} maxLength={100} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveStudent} disabled={!studentName.trim()}>
              {editingStudent ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassDetail;
