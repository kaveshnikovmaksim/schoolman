import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import { pendingHomeworkPath } from "@/lib/diaryNotifications";

const DiaryLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = pendingHomeworkPath(location.state?.from?.pathname) ?? pendingHomeworkPath(sessionStorage.getItem("diary_pending_homework") ?? undefined);
  if (requestedPath) sessionStorage.setItem("diary_pending_homework", requestedPath);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("class_accounts")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) navigate(requestedPath ?? "/diary/select", { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: ca } = await supabase
      .from("class_accounts")
      .select("id")
      .eq("user_id", signInData.user.id)
      .maybeSingle();
    if (!ca) {
      await supabase.auth.signOut();
      toast({ title: "Доступ запрещён", description: "Этот аккаунт не привязан к классу", variant: "destructive" });
      setLoading(false);
      return;
    }
    navigate(requestedPath ?? "/diary/select", { replace: true });
  };

  const form = (
    <>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email класса</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-diary-muted"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-diary-accent text-white hover:bg-diary-accent/90"
          >
            {loading ? "Вход…" : "Войти"}
          </Button>
        </form>
    </>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-diary-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-diary-surface rounded-3xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-diary-accent/10 flex items-center justify-center mb-3">
              <BookOpen className="w-7 h-7 text-diary-accent" />
            </div>
            <h1 className="text-xl font-semibold text-diary-fg">Дневник класса</h1>
            <p className="text-sm text-diary-muted mt-1">Вход для учеников и родителей</p>
          </div>
          {form}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-diary-bg grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center gap-6 px-16 bg-diary-accent text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-semibold leading-tight">Дневник класса</h1>
        <p className="text-white/80 max-w-md text-lg">
          Расписание, домашние задания и оценки — всегда под рукой у ученика и родителей.
        </p>
      </div>
      <div className="flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md bg-diary-surface rounded-3xl shadow-lg p-10">
          <h2 className="text-2xl font-semibold text-diary-fg mb-1">Вход</h2>
          <p className="text-sm text-diary-muted mb-6">Для учеников и родителей</p>
          {form}
        </div>
      </div>
    </div>
  );
};

export default DiaryLogin;
