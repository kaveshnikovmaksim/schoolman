import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { StudentHeader, useStudents } from "@/components/diary/StudentHeader";
import { BottomNav } from "@/components/diary/BottomNav";
import { DiaryDesktopTopNav } from "@/components/diary/DiaryDesktopTopNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { pendingHomeworkPath } from "@/lib/diaryNotifications";
import { createContext, useContext } from "react";

interface StudentCtx {
  studentId: string | null;
}
const Ctx = createContext<StudentCtx>({ studentId: null });
export const useSelectedStudent = () => useContext(Ctx);

const TAB_PATHS = [
  "/diary/student/schedule",
  "/diary/student/daybook",
  "/diary/student/grades",
  "/diary/student/tasks",
  "/diary/student/school",
  "/diary/student/profile",
];

const DiaryStudentLayout = () => {
  const { students, selectedId, setSelectedId, loading } = useStudents();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">
        Загрузка…
      </div>
    );
  }

  if (!selectedId) {
    const pending = pendingHomeworkPath(location.pathname);
    if (pending) sessionStorage.setItem("diary_pending_homework", pending);
    return <Navigate to="/diary/select" replace />;
  }

  const isTabRoot = TAB_PATHS.some((p) => location.pathname === p);

  // При смене ученика — на расписание
  const handleSelectStudent = (id: string) => {
    setSelectedId(id);
    navigate("/diary/student/schedule");
  };

  // === Мобильная версия ===
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {isTabRoot && (
          <StudentHeader
            students={students}
            selectedId={selectedId}
            onSelect={handleSelectStudent}
          />
        )}
        <Ctx.Provider value={{ studentId: selectedId }}>
          <div className="flex-1">
            <Outlet />
          </div>
        </Ctx.Provider>
        <BottomNav />
      </div>
    );
  }

  // === Десктопная версия ===
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <DiaryDesktopTopNav
        students={students}
        selectedId={selectedId}
        onSelect={handleSelectStudent}
      />
      <main className="flex-1">
        <Ctx.Provider value={{ studentId: selectedId }}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        </Ctx.Provider>
      </main>
    </div>
  );
};

export default DiaryStudentLayout;
