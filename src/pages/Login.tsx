import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GraduationCap, Eye, EyeOff, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSchoolLogin } from "@/hooks/useSchoolData";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const login = useSchoolLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userRoles = await login.mutateAsync({ email, password });
      if (userRoles.includes("admin")) {
        navigate("/admin/classes");
      } else if (userRoles.includes("teacher")) {
        navigate("/teacher/grades");
      } else {
        toast({ title: "Ошибка", description: "Роль не назначена", variant: "destructive" });
        await supabase.auth.signOut();
      }
    } catch (error) {
      toast({ title: "Ошибка входа", description: error instanceof Error ? error.message : "Сервис входа недоступен. Проверьте соединение и попробуйте ещё раз.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Школьный журнал</h1>
            <p className="text-sm text-muted-foreground mt-1">Войдите в систему</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@school.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">или</span>
            </div>
          </div>

          <Link
            to="/diary/login"
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/60 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Вход в дневник класса</div>
                <div className="text-xs text-muted-foreground">Для учеников и родителей</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
