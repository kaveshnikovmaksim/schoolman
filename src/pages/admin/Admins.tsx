import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Shield, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("");

const Admins = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw error;

      const userIds = roles.map((r) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      return userIds.map((uid) => {
        const profile = profiles?.find((p) => p.user_id === uid);
        return { user_id: uid, full_name: profile?.full_name || "Администратор" };
      });
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const createAdmin = useMutation({
    mutationFn: async (f: { name: string; email: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-admin-auth", {
        body: { action: "create", email: f.email, password: f.password, full_name: f.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: "Администратор добавлен" });
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const removeAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-admin-auth", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: "Администратор удалён" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Администраторы</h1>
        <Button onClick={() => { setForm({ name: "", email: "", password: "" }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Добавить
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новый администратор</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ФИО <span className="text-destructive">*</span></Label>
              <Input placeholder="Фамилия Имя Отчество" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="email@school.ru" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Пароль <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Минимум 6 символов" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} maxLength={100} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={() => createAdmin.mutate(form)} disabled={!form.name.trim() || !form.email.trim() || form.password.length < 6 || createAdmin.isPending}>
              {createAdmin.isPending ? "Создание..." : "Добавить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Удалить администратора?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Отмена</Button>
            <Button variant="destructive" className="flex-1" onClick={() => { if (deleteConfirmId) removeAdmin.mutate(deleteConfirmId); setDeleteConfirmId(null); }}>Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {admins?.map((a) => (
          <Card key={a.user_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="w-12 h-12 bg-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(a.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{a.full_name}</p>
                  <Badge className="text-xs shrink-0"><Shield className="w-3 h-3 mr-1" /> Админ</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDeleteConfirmId(a.user_id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {admins?.length === 0 && <p className="text-muted-foreground text-center py-8">Нет администраторов.</p>}
      </div>
    </div>
  );
};

export default Admins;
