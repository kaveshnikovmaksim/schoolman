import { NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, Star, BookOpen, User, LogOut, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";

const items = [
  { to: "/diary/student/schedule", label: "Расписание", icon: CalendarDays },
  { to: "/diary/student/tasks", label: "Домашнее задание", icon: BookOpen },
  { to: "/diary/student/grades", label: "Оценки", icon: Star },
  { to: "/diary/student/profile", label: "Профиль", icon: User },
];

export const DiaryDesktopSidebar = () => {
  const navigate = useNavigate();
  const { account } = useDiaryAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("diary_selected_student");
    navigate("/diary/login", { replace: true });
  };

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-slate-900 text-slate-100 min-h-screen sticky top-0">
      <div className="px-5 pt-6 pb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">Дневник класса</div>
          <div className="text-xs text-slate-400 truncate">
            {account?.className ? `${account.className} класс` : "—"}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-500/15 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800/60 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </div>
    </aside>
  );
};
