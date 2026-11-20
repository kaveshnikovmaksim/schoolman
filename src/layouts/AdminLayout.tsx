import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Users, UserCheck, BookMarked, BarChart3, LogOut, Shield, CalendarDays, ShieldCheck, GraduationCap, ClipboardList, FileText, KeyRound, SlidersHorizontal, Monitor } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/classes", icon: Users, label: "Классы" },
  { to: "/admin/students", icon: GraduationCap, label: "Ученики" },
  { to: "/admin/teachers", icon: UserCheck, label: "Учителя" },
  { to: "/admin/admins", icon: ShieldCheck, label: "Админы" },
  { to: "/admin/subjects", icon: BookMarked, label: "Предметы" },
  { to: "/admin/work-types", icon: ClipboardList, label: "Виды работ" },
  { to: "/admin/calendar", icon: CalendarDays, label: "Календарь" },
  { to: "/admin/access", icon: SlidersHorizontal, label: "Управление" },
  { to: "/admin/display", icon: Monitor, label: "Отображение" },
  { to: "/admin/reports", icon: BarChart3, label: "Отчёты" },
  { to: "/admin/requests", icon: FileText, label: "Заявки" },
  { to: "/admin/class-accounts", icon: KeyRound, label: "Дневник" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex w-full">
      <aside
        className={cn(
          "flex flex-col transition-all duration-300 shrink-0",
          "bg-[hsl(262,47%,13%)] text-[hsl(262,20%,80%)]",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-[hsl(262,30%,20%)]">
          <Shield className="w-7 h-7 text-accent shrink-0" />
          {!collapsed && (
            <span className="ml-3 text-lg font-semibold text-white truncate">
              Админ
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/20 text-white"
                    : "hover:bg-[hsl(262,30%,20%)] hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-[hsl(262,30%,20%)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-[hsl(262,30%,20%)] hover:text-white transition-colors"
          >
            <svg className={cn("w-5 h-5 shrink-0 transition-transform", collapsed && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!collapsed && <span>Свернуть</span>}
          </button>
          <button
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-[hsl(262,30%,20%)] hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
