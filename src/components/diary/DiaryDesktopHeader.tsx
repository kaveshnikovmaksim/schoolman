import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HomeworkNotifications } from "@/components/diary/HomeworkNotifications";
import { cn } from "@/lib/utils";
import { initials } from "@/components/diary/StudentHeader";

interface Student { id: string; name: string }

interface Props {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export const DiaryDesktopHeader = ({ students, selectedId, onSelect, className }: Props) => {
  const current = students.find((s) => s.id === selectedId);

  return (
    <header className={cn("flex items-center justify-between bg-white border-b border-slate-200 px-8 h-16 sticky top-0 z-10", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-semibold">
              {current ? initials(current.name) : "?"}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-900">{current?.name ?? "—"}</span>
                {students.length > 1 && <ChevronDown className="w-4 h-4 text-slate-500" />}
              </div>
              <div className="text-xs text-slate-500">Ученик</div>
            </div>
          </button>
        </PopoverTrigger>
        {students.length > 1 && (
          <PopoverContent align="start" className="w-80 p-1 max-h-[60vh] overflow-y-auto">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100",
                  s.id === selectedId && "bg-slate-50"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                  {initials(s.name)}
                </div>
                <span className="flex-1 text-sm text-slate-900 truncate">{s.name}</span>
                {s.id === selectedId && <Check className="w-4 h-4 text-slate-700" />}
              </button>
            ))}
          </PopoverContent>
        )}
      </Popover>

      <HomeworkNotifications key={selectedId} studentId={selectedId} />


    </header>
  );
};
