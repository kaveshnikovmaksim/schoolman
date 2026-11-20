import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogOut, Users } from "lucide-react";
import { initials } from "@/components/diary/StudentHeader";
import { useIsMobile } from "@/hooks/use-mobile";

import { pendingHomeworkPath } from "@/lib/diaryNotifications";

interface Student {
  id: string;
  name: string;
}

const SelectStudent = () => {
  const navigate = useNavigate();
  const { account } = useDiaryAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!account) return;
    supabase
      .from("students")
      .select("id, name")
      .eq("class_id", account.classId)
      .order("name")
      .then(({ data }) => {
        setStudents(data ?? []);
        setLoading(false);
      });
  }, [account]);

  const handleSelect = (id: string) => {
    localStorage.setItem("diary_selected_student", id);
    const pending = pendingHomeworkPath(sessionStorage.getItem("diary_pending_homework") ?? undefined);
    sessionStorage.removeItem("diary_pending_homework");
    navigate(pending ?? "/diary/student/schedule", { replace: true });
  };

  const handleLogout = async () => {
    localStorage.removeItem("diary_selected_student");
    await supabase.auth.signOut();
    navigate("/diary/login", { replace: true });
  };

  const list = (desktop: boolean) =>
    loading ? (
      <div className="text-center text-sm text-slate-500 py-12">Загрузка…</div>
    ) : students.length === 0 ? (
      <div className="text-center text-sm text-slate-500 py-12">В классе пока нет учеников</div>
    ) : (
      <div className={desktop ? "grid grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2"}>
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={
              desktop
                ? "flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"
                : "w-full flex items-center gap-3 bg-white rounded-2xl p-3 pr-4 shadow-sm hover:shadow-md active:scale-[0.99] transition"
            }
          >
            <div
              className={`rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold shrink-0 ${
                desktop ? "w-16 h-16 text-lg" : "w-12 h-12 text-sm"
              }`}
            >
              {initials(s.name)}
            </div>
            <div className={desktop ? "text-center min-w-0" : "flex-1 text-left min-w-0"}>
              <div className="font-medium text-slate-900 truncate">{s.name}</div>
              <div className="text-xs text-slate-500">Открыть дневник</div>
            </div>
            {!desktop && <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />}
          </button>
        ))}
      </div>
    );

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-5xl px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-900">Класс {account?.className}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 flex items-center gap-1.5 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-8 py-12">
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">Выберите ученика</h1>
          <p className="text-sm text-slate-500 mb-8">Откройте дневник нужного ученика класса</p>
          {list(true)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="mx-auto w-full max-w-[480px] flex-1 bg-slate-50 flex flex-col">
        <header className="px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 flex items-center gap-1.5 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Выберите ученика</h1>
          <p className="text-sm text-slate-500 mt-1">Класс {account?.className}</p>
        </header>
        <div className="flex-1 px-4 pb-8">{list(false)}</div>
      </div>
    </div>
  );
};

export default SelectStudent;
