import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeachers, useTeacherMutations, useSubjects, useClasses } from "@/hooks/useSchoolData";

const getInitials = (name: string) => name.split(" ").slice(0, 2).map(n => n[0]).join("");

const Teachers = () => {
  const { data: teachers, isLoading } = useTeachers();
  const { data: allSubjects } = useSubjects();
  const { data: allClasses } = useClasses();
  const { create, update, remove } = useTeacherMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", status: "active" as string, subjects: [] as string[], classes: [] as string[] });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", password: "", status: "active", subjects: [], classes: [] });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name, email: t.email, phone: t.phone || "", password: "", status: t.status,
      subjects: t.teacher_subjects?.map((ts: any) => ts.subject_id) || [],
      classes: t.teacher_classes?.map((tc: any) => tc.class_id) || [],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!editingId && (!form.password || form.password.length < 6)) return;
    if (editingId && form.password && form.password.length < 6) return;
    if (editingId) {
      update.mutate({ id: editingId, ...form, password: form.password || undefined }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const toggleSubject = (id: string) => {
    setForm(prev => ({ ...prev, subjects: prev.subjects.includes(id) ? prev.subjects.filter(s => s !== id) : [...prev.subjects, id] }));
  };

  const toggleClass = (id: string) => {
    setForm(prev => ({ ...prev, classes: prev.classes.includes(id) ? prev.classes.filter(c => c !== id) : [...prev.classes, id] }));
  };

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Учителя</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить учителя</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Редактировать учителя" : "Новый учитель"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ФИО <span className="text-destructive">*</span></Label>
              <Input placeholder="Фамилия Имя Отчество" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="email@school.ru" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input placeholder="+7 (999) 123-45-67" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>Пароль {!editingId && <span className="text-destructive">*</span>}</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder={editingId ? "Оставьте пустым, чтобы не менять" : "Минимум 6 символов"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} maxLength={100} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {editingId && <p className="text-xs text-muted-foreground">Оставьте пустым, если не хотите менять пароль</p>}
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Предметы</Label>
              <div className="flex flex-wrap gap-1.5 p-3 border border-border rounded-lg bg-muted/30 max-h-36 overflow-y-auto">
                {allSubjects?.map((s: any) => (
                  <Badge key={s.id} variant={form.subjects.includes(s.id) ? "default" : "outline"} className="cursor-pointer select-none" onClick={() => toggleSubject(s.id)}>{s.name}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Классы</Label>
              <div className="flex flex-wrap gap-1.5 p-3 border border-border rounded-lg bg-muted/30">
                {allClasses?.map((c: any) => (
                  <Badge key={c.id} variant={form.classes.includes(c.id) ? "default" : "outline"} className="cursor-pointer select-none" onClick={() => toggleClass(c.id)}>{c.name}</Badge>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name.trim() || !form.email.trim() || (!editingId && form.password.length < 6) || (!!editingId && !!form.password && form.password.length < 6) || create.isPending || update.isPending}>
              {create.isPending || update.isPending ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Удалить учителя?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Отмена</Button>
            <Button variant="destructive" className="flex-1" onClick={() => { if (deleteConfirmId) remove.mutate(deleteConfirmId); setDeleteConfirmId(null); }}>Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {teachers?.map((t: any) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="w-12 h-12 bg-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(t.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{t.name}</p>
                  <Badge variant={t.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
                    {t.status === "active" ? "Активен" : "Неактивен"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {t.email}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 max-w-xs">
                {t.teacher_subjects?.map((ts: any) => (
                  <Badge key={ts.subject_id} variant="secondary" className="text-xs">{ts.subjects?.name}</Badge>
                ))}
                {t.teacher_classes?.map((tc: any) => (
                  <Badge key={tc.class_id} className="bg-accent/15 text-accent border-0 text-xs">{tc.classes?.name}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirmId(t.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {teachers?.length === 0 && <p className="text-muted-foreground text-center py-8">Нет учителей.</p>}
      </div>
    </div>
  );
};

export default Teachers;
