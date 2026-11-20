import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubjects, useAllWorkTypes, useWorkTypeMutations } from "@/hooks/useSchoolData";

const WorkTypes = () => {
  const { data: workTypes, isLoading } = useAllWorkTypes();
  const { data: subjects } = useSubjects();
  const { create, update, remove } = useWorkTypeMutations();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contextSubjectId, setContextSubjectId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("__global__");

  const openCreate = (subjectId: string | null) => {
    setEditingId(null);
    setName("");
    setContextSubjectId(subjectId);
    setOpen(true);
  };

  const openEdit = (wt: any) => {
    setEditingId(wt.id);
    setName(wt.name);
    setContextSubjectId(wt.subject_id);
    setOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const autoShort = name.trim().substring(0, 4);
    if (editingId) {
      update.mutate({ id: editingId, name: name.trim(), short_name: autoShort }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate({ subject_id: contextSubjectId, name: name.trim(), short_name: autoShort }, { onSuccess: () => setOpen(false) });
    }
  };

  const getWorkTypesForTab = (tabId: string) => {
    if (tabId === "__global__") {
      return workTypes?.filter((wt: any) => !wt.subject_id) || [];
    }
    return workTypes?.filter((wt: any) => wt.subject_id === tabId) || [];
  };

  const getSubjectIdForTab = (tabId: string): string | null => {
    return tabId === "__global__" ? null : tabId;
  };

  if (isLoading) return <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Виды работ</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="__global__" className="gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Общие
          </TabsTrigger>
          {subjects?.map((s: any) => (
            <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="__global__">
          <WorkTypeList
            items={getWorkTypesForTab("__global__")}
            onAdd={() => openCreate(null)}
            onEdit={openEdit}
            onDelete={setDeleteId}
            isGlobal
          />
        </TabsContent>

        {subjects?.map((s: any) => (
          <TabsContent key={s.id} value={s.id}>
            <WorkTypeList
              items={getWorkTypesForTab(s.id)}
              globalItems={getWorkTypesForTab("__global__")}
              onAdd={() => openCreate(s.id)}
              onEdit={openEdit}
              onDelete={setDeleteId}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать вид работы" : "Новый вид работы"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              {contextSubjectId
                ? <>Предмет: <span className="font-medium text-foreground">{subjects?.find((s: any) => s.id === contextSubjectId)?.name}</span></>
                : <>Общий вид работы — доступен <span className="font-medium text-foreground">для всех предметов</span></>
              }
            </div>
            <div className="space-y-2">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input placeholder="Самостоятельная работа" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!name.trim() || create.isPending || update.isPending}>
              {editingId ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Удалить вид работы?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button variant="destructive" className="flex-1" onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null); }}>Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface WorkTypeListProps {
  items: any[];
  globalItems?: any[];
  onAdd: () => void;
  onEdit: (wt: any) => void;
  onDelete: (id: string) => void;
  isGlobal?: boolean;
}

function WorkTypeList({ items, globalItems, onAdd, onEdit, onDelete, isGlobal }: WorkTypeListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isGlobal
            ? "Эти виды работ доступны для всех предметов"
            : `Специфичные для этого предмета${globalItems && globalItems.length > 0 ? ` + ${globalItems.length} общих` : ""}`
          }
        </p>
        <Button size="sm" onClick={onAdd}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>

      <div className="grid gap-2">
        {items.map((wt: any) => (
          <Card key={wt.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{wt.short_name}</Badge>
                <p className="font-medium text-foreground">{wt.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(wt)}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(wt.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Нет видов работ. Нажмите «Добавить» чтобы создать.</p>
      )}

      {!isGlobal && globalItems && globalItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Общие виды работ (доступны автоматически):
          </p>
          <div className="grid gap-1.5">
            {globalItems.map((wt: any) => (
              <div key={wt.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/30 text-sm">
                <Badge variant="secondary" className="font-mono text-xs">{wt.short_name}</Badge>
                <span className="text-muted-foreground">{wt.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkTypes;
