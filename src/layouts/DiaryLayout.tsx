import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useIsMobile } from "@/hooks/use-mobile";

const DiaryLayout = () => {
  const { account, loading } = useDiaryAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500 text-sm">Загрузка…</div>
      </div>
    );
  }

  if (!account) {
    return <Navigate to="/diary/login" replace state={{ from: location }} />;
  }

  // Мобильный — узкая «колонка телефона»
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-200">
        <div className="mx-auto w-full max-w-[480px] min-h-screen bg-slate-50 shadow-sm">
          <Outlet />
        </div>
      </div>
    );
  }

  // Десктоп — full-width, разметку задаёт DiaryStudentLayout
  return (
    <div className="min-h-screen bg-slate-100">
      <Outlet />
    </div>
  );
};

export default DiaryLayout;
