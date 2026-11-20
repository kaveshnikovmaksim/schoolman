import { useRef } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrimesterGradeMutations } from "@/hooks/useSchoolData";
import { useToast } from "@/hooks/use-toast";
import { useDiaryToday } from "@/hooks/useDiaryToday";
import { automaticTrimesterGrades } from "@/lib/trimesterAutoGrades";
import type { ProvisionalGrade } from "@/lib/diaryProvisionalGrades";

interface Props {
  classId: string | null;
  subjectId: string | null;
  quarter?: { id: string; start_date: string; end_date: string };
  students?: { id: string }[];
  grades?: (ProvisionalGrade & { student_id: string; date: string })[];
  disabled: boolean;
  disabledReason?: string | null;
}

export default function AutoTrimesterButton({ classId, subjectId, quarter, students, grades, disabled, disabledReason }: Props) {
  const { upsertMany } = useTrimesterGradeMutations();
  const { toast } = useToast();
  const today = useDiaryToday();
  const saving = useRef(false);
  const rows = quarter ? automaticTrimesterGrades(students ?? [], grades ?? [], quarter, today) : [];
  const unavailableReason = !classId || !subjectId ? "Выберите класс и предмет"
    : !quarter ? "Нет доступного триместра"
    : !students || !grades ? "Оценки и список учеников загружаются"
    : disabled ? disabledReason || "Выставление оценок сейчас недоступно"
    : !rows.length ? "Нет оценок для расчёта итогов в этом триместре"
    : null;
  const submit = async () => {
    if (saving.current || unavailableReason || !classId || !subjectId || !quarter) return;
    saving.current = true;
    try {
      await upsertMany.mutateAsync(rows.map(row => ({ ...row, class_id: classId, subject_id: subjectId, quarter_id: quarter.id })));
      toast({ title: "Триместровые оценки сохранены", description: `Выставлено: ${rows.length}. Без оценок: ${(students?.length ?? 0) - rows.length}.` });
    } catch (error) {
      toast({ title: "Не удалось сохранить оценки", description: error instanceof Error ? error.message : "Повторите попытку", variant: "destructive" });
    } finally { saving.current = false; }
  };
  return <Button size="sm" className="shrink-0 disabled:opacity-100" onClick={submit} disabled={!!unavailableReason || upsertMany.isPending} title={unavailableReason || "Выставить триместровые оценки всем по среднему баллу"} aria-busy={upsertMany.isPending}>
    <CheckCheck className="mr-1.5 h-4 w-4" />Выставить всем
  </Button>;
}