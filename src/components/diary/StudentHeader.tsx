import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HomeworkNotifications } from "@/components/diary/HomeworkNotifications";
import { cn } from "@/lib/utils";

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const StudentHeader = ({ students, selectedId, onSelect }: Props) => {
  const current = students.find((s) => s.id === selectedId);

  return (
    <header className="flex items-center justify-between px-4 pt-5 pb-3 bg-slate-50">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-3 group max-w-[80%]">
            <div className="w-11 h-11 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-sm font-semibold shrink-0">
              {current ? initials(current.name) : "?"}
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-900 truncate">
                  {current?.name ?? "—"}
                </span>
                {students.length > 1 && (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </div>
              <div className="text-xs text-slate-500">Ученик</div>
            </div>
          </button>
        </PopoverTrigger>
        {students.length > 1 && (
          <PopoverContent align="start" className="w-72 p-1 max-h-[60vh] overflow-y-auto">
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

/** Хук, загружающий учеников класса и хранящий выбранного. */
export function useStudents() {
  const { account, loading: authLoading } = useDiaryAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!account) {
      setStudents([]);
      setSelectedIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("students")
      .select("id, name")
      .eq("class_id", account.classId)
      .order("name")
      .then(({ data }) => {
        const list = data ?? [];
        setStudents(list);
        const stored = localStorage.getItem("diary_selected_student");
        const valid = stored && list.find((s) => s.id === stored) ? stored : null;
        setSelectedIdState(valid);
        setLoading(false);
      });
  }, [account, authLoading]);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    localStorage.setItem("diary_selected_student", id);
  };

  return { students, selectedId, setSelectedId, loading };
}
