import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ChevronRight, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses, useClassMutations, useTeachers } from "@/hooks/useSchoolData";
import { Skeleton } from "@/components/ui/skeleton";

const Classes = () => {
  const navigate = useNavigate();
  const { data: classes, isLoading } = useClasses();
  const { data: teachers } = useTeachers();
  const { create, remove } = useClassMutations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), teacher_id: teacherId || null, year: "2025-2026" }, {
      onSuccess: () => { setOpen(false); setName(""); setTeacherId(""); },
    });
  };

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Классы</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Добавить класс</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый класс</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Название <span className="text-destructive">*</span></Label>
                <Input placeholder="11Б" value={name} onChange={(e) => setName(e.target.value)} maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Классный руководитель</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Выберите учителя" /></SelectTrigger>
                  <SelectContent>
                    {teachers?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!name.trim() || create.isPending}>
                {create.isPending ? "Создание..." : "Создать"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Удалить класс?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Все ученики и оценки этого класса будут удалены.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button variant="destructive" className="flex-1" onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null); }}>Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {classes?.map((c: any) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-5 flex items-center justify-between" onClick={() => navigate(`/admin/classes/${c.id}`)}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">{c.name}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{c.teachers?.name || "Без руководителя"}</p>
                  <p className="text-sm text-muted-foreground">{c.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {c.students?.[0]?.count ?? 0}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
        {classes?.length === 0 && <p className="text-muted-foreground text-center py-8">Нет классов. Создайте первый.</p>}
      </div>
    </div>
  );
};

export default Classes;
