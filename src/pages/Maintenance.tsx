import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GateState = "checking" | "blocked" | "allowed";

// Проверяет, что у пользователя есть роль admin (через security definer функцию)
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) return false;
  return data === true;
};

const Maintenance = ({ children }: { children?: ReactNode }) => {
  const [state, setState] = useState<GateState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (!cancelled) setState("blocked");
        return;
      }
      const ok = await checkIsAdmin(user.id);
      if (cancelled) return;
      if (ok) {
        setState("allowed");
      } else {
        // Не админ — принудительно выкидываем
        await supabase.auth.signOut().catch(() => {});
        setState("blocked");
      }
    };

    verify();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState("checking");
        verify();
      } else {
        setState("blocked");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.user) {
        setError("Неверный email или пароль");
        return;
      }
      const ok = await checkIsAdmin(data.user.id);
      if (!ok) {
        await supabase.auth.signOut().catch(() => {});
        setError("Доступ разрешён только администратору");
        setState("blocked");
        return;
      }
      setState("allowed");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "allowed" && children) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Доступ временно закрыт</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Сайт закрыт на техническое обслуживание. Вход в систему временно недоступен.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3 text-left">
          <div className="space-y-1">
            <Label htmlFor="m-email">Email администратора</Label>
            <Input
              id="m-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-password">Пароль</Label>
            <Input
              id="m-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Maintenance;
