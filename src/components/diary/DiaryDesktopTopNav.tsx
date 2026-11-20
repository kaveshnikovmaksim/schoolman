import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, Check, LogOut, User, GraduationCap } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HomeworkNotifications } from "@/components/diary/HomeworkNotifications";
import { cn } from "@/lib/utils";
import { initials } from "@/components/diary/StudentHeader";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";

interface Student { id: string; name: string }

interface Props {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const tabs: { to: string; label: string; hasDropdown?: boolean }[] = [
  { to: "/diary/student/schedule", label: "Расписание" },
  { to: "/diary/student/tasks", label: "Домашнее задание" },
  { to: "/diary/student/grades", label: "Оценки", hasDropdown: true },
  { to: "/diary/student/study", label: "Учёба", hasDropdown: true },
  { to: "/diary/student/school", label: "Школа", hasDropdown: true },
];

export const DiaryDesktopTopNav = ({ students, selectedId, onSelect }: Props) => {
  const current = students.find((s) => s.id === selectedId);
  const navigate = useNavigate();
  const { account } = useDiaryAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("diary_selected_student");
    navigate("/diary/login", { replace: true });
  };

  return (
    <>
      {/* Верхняя панель — лого + глобальные иконки */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto h-14 px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded-md bg-violet-600 text-white text-xs font-bold tracking-wide">
                МОЯ
              </div>
              <span className="font-semibold text-slate-900">школа</span>
            </div>
            <nav className="flex items-center gap-1">
              <span className="px-3 py-1.5 text-sm font-medium text-slate-900 border-b-2 border-violet-600">
                Дневник
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <HomeworkNotifications key={selectedId} studentId={selectedId} />

            <Popover open={profileOpen} onOpenChange={setProfileOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-semibold">
                    {current ? initials(current.name) : "?"}
                  </div>
                  <span className="text-xs font-medium text-slate-700">Ученик</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center text-base font-semibold mb-2">
                    {current ? initials(current.name) : "?"}
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {current?.name ?? "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {account?.className ? `${account.className} класс` : ""}
                  </div>
                </div>

                {students.length > 1 && (
                  <div className="p-1 max-h-60 overflow-y-auto border-b border-slate-200">
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      Сменить ученика
                    </div>
                    {students.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelect(s.id);
                          setProfileOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left hover:bg-slate-50 text-sm",
                          s.id === selectedId && "bg-slate-50"
                        )}
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold">
                          {initials(s.name)}
                        </div>
                        <span className="flex-1 truncate text-slate-800">{s.name}</span>
                        {s.id === selectedId && <Check className="w-4 h-4 text-slate-700" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/diary/student/profile");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm text-slate-700"
                  >
                    <User className="w-4 h-4" />
                    Личный кабинет
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm text-rose-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Выход
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Подзаголовок «Дневник» + табы в одну строку */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-semibold text-slate-900">Дневник</span>
          </div>
          <nav className="flex items-center gap-1 flex-1 flex-wrap">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1",
                    isActive
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                {t.label}
                {t.hasDropdown && <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>


    </>
  );
};
