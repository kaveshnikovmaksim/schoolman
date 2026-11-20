import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Calendar, FileText, LogOut, GraduationCap, Menu, Maximize2, Minimize2, Sun, Moon } from "lucide-react";
import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { TeacherProvider, useTeacherContext } from "@/contexts/TeacherContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";

export const ExpandContext = createContext<{ expanded: boolean; setExpanded: (v: boolean) => void }>({ expanded: false, setExpanded: () => {} });
export const useExpandMode = () => useContext(ExpandContext);

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
      className={cn(
        "rounded-lg transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground",
        compact ? "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50" : "p-2"
      )}
    >
      {theme === "dark" ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
      {compact && <span>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>}
    </button>
  );
}

const journalNavItems = [
  { to: "/teacher/grades", icon: BookOpen, label: "Оценки" },
  { to: "/teacher/schedule", icon: Calendar, label: "Расписание" },
  { to: "/teacher/homework", icon: FileText, label: "Д/З" },
];

const topTabs = [
  { to: "/teacher/grades", label: "Организация обучения", emoji: "🎓", matchPaths: ["/teacher/grades", "/teacher/schedule", "/teacher/homework"] },
  { to: "/teacher/profile", label: "Кабинет учителя", emoji: "🪪", matchPaths: ["/teacher/profile"] },
];

function ClassSubjectSelector({ compact = false }: { compact?: boolean }) {
  const {
    selectedClassId, setSelectedClassId,
    selectedSubjectId, setSelectedSubjectId,
    teacherClasses, teacherSubjects, pendingSubjects,
  } = useTeacherContext();
  const location = useLocation();
  const hideSubject = location.pathname === "/teacher/homework" || location.pathname === "/teacher/schedule";

  // Show active subjects first, then pending ones (still selectable, but read-only)
  const allSelectable = [...(teacherSubjects || []), ...(pendingSubjects || [])];

  return (
    <div className={cn("flex items-center gap-2", compact && "flex-col w-full")}>
      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
        <SelectTrigger className={cn("bg-card border-border", compact ? "w-full" : "w-32")}>
          <SelectValue placeholder="Класс" />
        </SelectTrigger>
        <SelectContent>
          {teacherClasses?.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!hideSubject && (
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className={cn("bg-card border-border", compact ? "w-full" : "w-52")}>
            <SelectValue placeholder="Предмет" />
          </SelectTrigger>
          <SelectContent>
            {allSelectable.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-1.5">
                  {s.name}
                  {s.pending_removal && (
                    <span className="text-[10px] text-amber-600 font-medium">🔒 на рассмотрении</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function TopTabs() {
  const location = useLocation();
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-secondary/30">
      {topTabs.map((tab) => {
        const isActive = tab.matchPaths.some(p => location.pathname.startsWith(p));
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="text-base leading-none" style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif' }}>{tab.emoji}</span>
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}

function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isProfile = location.pathname === "/teacher/profile";

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Top bar with logo */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-3 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary shrink-0" />
          <span className="text-base font-semibold text-foreground">Журнал</span>
        </div>
        {!isProfile && (
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Menu className="w-5 h-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Настройки</SheetTitle>
              <div className="p-4 border-b border-border">
                <div className="text-sm font-medium text-muted-foreground mb-3">Класс и предмет</div>
                <ClassSubjectSelector compact />
              </div>
              <div className="p-4 space-y-1">
                <ThemeToggle compact />
                <button
                  onClick={async () => {
                    const { supabase } = await import('@/integrations/supabase/client');
                    await supabase.auth.signOut();
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span>Выйти</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        )}
        {isProfile && (
          <button
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <LogOut className="w-5 h-5 text-destructive" />
          </button>
        )}
      </div>

      {/* Top tabs — always visible, above everything */}
      <TopTabs />

      {/* Main content */}
      <main className={cn("flex-1 overflow-auto", !isProfile && "pb-16")}>
        <Outlet />
      </main>

      {/* Bottom tab bar — only in journal mode */}
      {!isProfile && (
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-30 safe-area-bottom">
          {journalNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors min-w-[60px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

function DesktopLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { expanded, setExpanded } = useExpandMode();
  const isProfile = location.pathname === "/teacher/profile";

  // Profile mode — no sidebar, no class/subject selector
  if (isProfile) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary shrink-0" />
            <span className="text-base font-semibold text-foreground">Журнал</span>
          </div>
          <button
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
        <TopTabs />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Expanded mode — no sidebar, but class/subject selector visible
  if (expanded) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary shrink-0" />
            <span className="text-base font-semibold text-foreground">Журнал</span>
          </div>
          <div className="flex items-center gap-3">
            <ClassSubjectSelector />
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Быстрый режим
            </button>
          </div>
        </div>
        <TopTabs />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Normal mode — sidebar + class/subject selector
  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="bg-sidebar text-sidebar-foreground flex flex-col w-64 shrink-0">
          <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
            <GraduationCap className="w-6 h-6 text-sidebar-primary shrink-0" />
            <span className="ml-3 text-base font-semibold text-sidebar-accent-foreground truncate">Журнал</span>
          </div>

          <nav className="flex-1 py-4 space-y-1 px-2">
            {journalNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-2 border-t border-sidebar-border">
            <ThemeToggle compact />
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
            >
              <Maximize2 className="w-5 h-5 shrink-0" />
              <span>Расширить</span>
            </button>
            <button
              onClick={async () => {
                const { supabase } = await import('@/integrations/supabase/client');
                await supabase.auth.signOut();
                navigate("/login");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Выйти</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 overflow-auto">
          {/* Top tabs above the class/subject row, but only over the main content (not over sidebar) */}
          <TopTabs />
          <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
            <span className="text-sm text-muted-foreground font-medium">
              {location.pathname === "/teacher/schedule" ? "Класс:" : "Класс и предмет:"}
            </span>
            <ClassSubjectSelector />
          </div>
          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function TeacherLayoutInner() {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  return (
    <ExpandContext.Provider value={{ expanded, setExpanded }}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </ExpandContext.Provider>
  );
}

const TeacherLayout = () => {
  return (
    <TeacherProvider>
      <TeacherLayoutInner />
    </TeacherProvider>
  );
};

export default TeacherLayout;
