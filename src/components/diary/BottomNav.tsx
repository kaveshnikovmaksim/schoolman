import { NavLink } from "react-router-dom";
import { CalendarDays, Star, CheckCircle2, LayoutGrid, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/diary/student/schedule", label: "Расписание", icon: CalendarDays },
  { to: "/diary/student/grades", label: "Оценки", icon: Star },
  { to: "/diary/student/tasks", label: "Д/З", icon: CheckCircle2 },
  { to: "/diary/student/school", label: "Школа", icon: LayoutGrid },
  { to: "/diary/student/profile", label: "Профиль", icon: User },
];

export const BottomNav = () => (
  <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[456px] rounded-lg bg-diary-surface border border-border shadow-sm z-30" aria-label="Разделы дневника">
    <div className="grid grid-cols-5 h-16">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
              isActive ? "text-slate-900" : "text-slate-400"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn("w-5 h-5", isActive && "fill-slate-900")} strokeWidth={isActive ? 0 : 1.75} />
              <span className={cn(isActive && "font-medium")}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);
