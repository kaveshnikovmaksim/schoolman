import { useGradeHistory } from "@/hooks/useGradeHistory";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { History } from "lucide-react";

interface Props {
  studentId: string;
  subjectId: string;
  date: string;
}

const actionLabel: Record<string, string> = {
  added: "Поставлено",
  changed: "Изменено",
  removed: "Удалено",
};

const actionColor: Record<string, string> = {
  added: "text-emerald-600",
  changed: "text-primary",
  removed: "text-destructive",
};

export default function GradeHistorySection({ studentId, subjectId, date }: Props) {
  const { data, isLoading } = useGradeHistory(studentId, subjectId, date);
  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <div className="border-t border-border pt-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium mb-1.5">
        <History className="w-3 h-3" />
        История изменений
      </div>
      <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
        {data.slice(0, 5).map((h) => {
          const when = format(parseISO(h.changed_at), "dd.MM HH:mm", { locale: ru });
          return (
            <div key={h.id} className="text-[10px] leading-tight flex items-start gap-1.5">
              <span className={`font-semibold ${actionColor[h.action] || ""}`}>{actionLabel[h.action] || h.action}</span>
              <span className="text-foreground">
                {h.action === "changed" ? `${h.old_value} → ${h.new_value}` : (h.new_value ?? h.old_value ?? "")}
              </span>
              <span className="text-muted-foreground ml-auto whitespace-nowrap">{when}</span>
            </div>
          );
        })}
        {data.length > 0 && (
          <div className="text-[9px] text-muted-foreground/70 pt-0.5">
            {data[data.length - 1].changed_by_name && `последнее: ${data[0].changed_by_name}`}
          </div>
        )}
      </div>
    </div>
  );
}
