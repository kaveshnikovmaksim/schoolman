import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubjects, useSubjectMutations } from "@/hooks/useSchoolData";

const Subjects = () => {
  const { data: subjects, isLoading } = useSubjects();
  const { create, update, remove } = useSubjectMutations();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hours, setHours] = useState("3");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setEditingId(null); setName(""); setHours("3"); setOpen(true); };
  const openEdit = (s: any) => { setEditingId(s.id); setName(s.name); setHours(String(s.hours_per_week)); setOpen(true); };

  const handleSave = () => {
    if (!name.trim()) return;
    const h = Math.max(1, Math.min(10, parseInt(hours) || 3));
    if (editingId) {
      update.mutate({ id: editingId, name: name.trim(), hours_per_week: h }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate({ name: name.trim(), hours_per_week: h }, { onSuccess: () => setOpen(false) });
    }
  };

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Предметы</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить предмет</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Редактировать предмет" : "Новый предмет"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input placeholder="Название предмета" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>Часов в неделю (1-10)</Label>
              <Input type="number" min={1} max={10} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!name.trim() || create.isPending || update.isPending}>
              {editingId ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Удалить предмет?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button variant="destructive" className="flex-1" onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null); }}>Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {subjects?.map((s: any) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div><p className="font-medium text-foreground">{s.name}</p></div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{s.hours_per_week} ч/нед</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {subjects?.length === 0 && <p className="text-muted-foreground text-center py-8">Нет предметов.</p>}
      </div>
    </div>
  );
};

export default Subjects;
