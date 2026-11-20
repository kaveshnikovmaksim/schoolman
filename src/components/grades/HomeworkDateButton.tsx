import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Props {
  dateStr: string;
  classId: string;
  subjectId: string;
  teacherId: string | null;
  homework?: { id: string; title: string; description: string | null } | null;
  disabled?: boolean;
}

/** Домик над датой в журнале: быстро задать ДЗ на этот урок */
export default function HomeworkDateButton({ dateStr, classId, subjectId, teacherId, homework, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTitle(homework?.title || "");
      setDescription(homework?.description || "");
    }
  }, [open, homework]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["homework"] }),
      qc.invalidateQueries({ queryKey: ["journal_homework"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (homework) {
        const { data, error } = await supabase.from("homework").update({ title, description }).eq("id", homework.id).select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Не удалось сохранить задание — нет прав на изменение");
      } else {
        if (!teacherId) throw new Error("Учитель не найден");
        const { error } = await supabase.from("homework").insert({
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          title,
          description,
          due_date: dateStr,
        });
        if (error) throw error;
      }
    },
    onSuccess: async () => { setOpen(false); await invalidate(); toast({ title: homework ? "ДЗ обновлено" : "ДЗ задано" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("homework").delete().eq("id", homework!.id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Не удалось удалить задание — нет прав на изменение");
    },
    onSuccess: async () => { setTitle(""); setDescription(""); setOpen(false); await invalidate(); toast({ title: "Задание удалено" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          title={homework ? `Д/З: ${homework.title}` : "Задать домашнее задание"}
          className={`mx-auto flex items-center justify-center w-4 h-4 rounded transition-colors ${
            homework ? "text-primary" : "text-muted-foreground/40 hover:text-primary"
          }`}
        >
          <Home className="w-3 h-3" fill={homework ? "currentColor" : "none"} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[260px] p-3 space-y-2 z-50">
        <div>
          <div className="text-[13px] font-semibold text-foreground">Домашнее задание</div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {format(parseISO(dateStr), "d MMMM, EEEE", { locale: ru })}
          </div>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="§15 упр. 5–12" className="h-8 text-xs" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" className="min-h-[54px] text-xs resize-none" />
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 h-8 text-xs" disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {homework ? "Сохранить" : "Задать"}
          </Button>
          {homework && (
            <Button size="sm" variant="outline" className="h-8 px-2" disabled={remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
