import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllStudents, useStudentMutations, useClasses } from "@/hooks/useSchoolData";
import { Plus, Pencil, Trash2, Search, ArrowRightLeft } from "lucide-react";

const Students = () => {
  const { data: students, isLoading } = useAllStudents();
  const { data: classes } = useClasses();
  const { create, update, remove, bulkTransfer } = useStudentMutations();

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<{ id: string; name: string; class_id: string } | null>(null);
  const [form, setForm] = useState({ name: "", class_id: "" });

  // Bulk transfer state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferClassId, setTransferClassId] = useState("");

  const filtered = students?.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass === "all" || s.class_id === filterClass;
    return matchesSearch && matchesClass;
  }) || [];

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s: any) => s.id)));
    }
  };

  const openCreate = () => {
    setEditingStudent(null);
    setForm({ name: "", class_id: classes?.[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingStudent({ id: s.id, name: s.name, class_id: s.class_id });
    setForm({ name: s.name, class_id: s.class_id });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.class_id) return;
    if (editingStudent) {
      update.mutate({ id: editingStudent.id, name: form.name.trim(), class_id: form.class_id });
    } else {
      create.mutate({ name: form.name.trim(), class_id: form.class_id });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Удалить ученика "${name}"? Все связанные данные (оценки, посещаемость) будут удалены.`)) {
      remove.mutate(id);
    }
  };

  const handleBulkTransfer = () => {
    if (!transferClassId || selected.size === 0) return;
    bulkTransfer.mutate({ studentIds: Array.from(selected), classId: transferClassId });
    setTransferDialogOpen(false);
    setSelected(new Set());
    setTransferClassId("");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ученики</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="outline" onClick={() => { setTransferClassId(""); setTransferDialogOpen(true); }}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Перевести ({selected.size})
            </Button>
          )}
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Добавить ученика</Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Все классы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все классы</SelectItem>
            {classes?.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-[50px]">№</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Класс</TableHead>
                <TableHead className="w-[120px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Ученики не найдены</TableCell></TableRow>
              ) : (
                filtered.map((s: any, i: number) => (
                  <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggleSelect(s.id)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{(s as any).classes?.name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.name)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-3 text-sm text-muted-foreground">
        Всего: {filtered.length} учеников
        {selected.size > 0 && <span className="ml-2">· Выбрано: {selected.size}</span>}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Редактировать ученика" : "Добавить ученика"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ФИО ученика</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="space-y-2">
              <Label>Класс</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.class_id}>
              {editingStudent ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk transfer dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перевести учеников в другой класс</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Выбрано учеников: <strong>{selected.size}</strong>
            </p>
            <div className="space-y-2">
              <Label>Новый класс</Label>
              <Select value={transferClassId} onValueChange={setTransferClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleBulkTransfer} disabled={!transferClassId}>
              Перевести
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
