import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useSelectedStudent } from "@/layouts/DiaryStudentLayout";
import { initials } from "@/components/diary/StudentHeader";
import {
  Settings, User as UserIcon, Home, Calendar, Bell, MessageCircle,
  AlertTriangle, ChevronRight, LogOut,
} from "lucide-react";

const sections = [
  [
    { icon: Home, color: "bg-blue-100 text-blue-600", label: "Представители" },
    { icon: UserIcon, color: "bg-violet-100 text-violet-600", label: "О классе" },
  ],
  [
    { icon: Calendar, color: "bg-emerald-100 text-emerald-600", label: "Мероприятия" },
    { icon: Bell, color: "bg-rose-100 text-rose-600", label: "Уведомления" },
  ],
  [
    { icon: MessageCircle, color: "bg-violet-100 text-violet-600", label: "Задать вопрос" },
    { icon: AlertTriangle, color: "bg-rose-100 text-rose-600", label: "Сообщить об ошибке" },
  ],
];

const DiaryProfile = () => {
  const { studentId } = useSelectedStudent();
  const { account } = useDiaryAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    supabase.from("students").select("name").eq("id", studentId).maybeSingle().then(({ data }) => setName(data?.name ?? ""));
  }, [studentId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("diary_selected_student");
    navigate("/diary/login", { replace: true });
  };

  const connectTelegram = async () => {
    if (!studentId) return;
    setTelegramLoading(true);
    const code = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
    const { error } = await supabase.from("telegram_link_codes").insert({
      code,
      student_id: studentId,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    if (error) {
      window.alert("Не удалось создать ссылку подключения. Попробуйте ещё раз.");
    } else {
      setTelegramLink(`https://t.me/schoolman_diary_ai?start=${code}`);
    }
    setTelegramLoading(false);
  };

  return (
    <div className="px-3 pt-2 space-y-3">
      {/* Карточка профиля */}
      <div className="bg-white rounded-2xl pt-12 pb-5 px-4 relative mt-12">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-2xl font-semibold border-4 border-slate-50">
              {initials(name) || "?"}
            </div>
            <button className="absolute -left-3 top-2 w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border-2 border-slate-50">
              <Settings className="w-4 h-4" />
            </button>
            <button className="absolute -right-3 top-2 w-9 h-9 rounded-full bg-violet-50 text-violet-500 flex items-center justify-center border-2 border-slate-50">
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-slate-900">{name || "—"}</div>
          <div className="text-sm text-slate-500 mt-0.5">Ученик · {account?.className}</div>
        </div>
      </div>

      {/* Секции пунктов */}
      {sections.map((items, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden">
          {items.map(({ icon: Icon, color, label }, j) => (
            <button
              key={label}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${j > 0 ? "border-t border-slate-100" : ""}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span className="flex-1 text-slate-900">{label}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      ))}

      <div className="bg-white rounded-2xl p-4 space-y-3">
        <div className="font-medium text-slate-900">Уведомления о домашних заданиях</div>
        <div className="text-sm text-slate-500">Подключите Telegram, чтобы получать сообщения о новых заданиях.</div>
        {telegramLink ? (
          <a href={telegramLink} target="_blank" rel="noreferrer" className="block w-full rounded-xl bg-blue-600 py-3 text-center font-medium text-white">Открыть Telegram</a>
        ) : (
          <button onClick={connectTelegram} disabled={telegramLoading} className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white disabled:opacity-50">
            {telegramLoading ? "Создаём ссылку…" : "Подключить Telegram"}
          </button>
        )}
      </div>

      {/* Выход */}
      <button
        onClick={handleLogout}
        className="w-full bg-white rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2 text-rose-500 font-medium"
      >
        <LogOut className="w-4 h-4" />
        Выйти из аккаунта
      </button>
    </div>
  );
};

export default DiaryProfile;
