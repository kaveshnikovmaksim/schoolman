import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, KeyRound, Plus } from "lucide-react";

interface Row {
  class_id: string;
  class_name: string;
  account: { user_id: string; email: string } | null;
}

const ClassAccounts = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [createFor, setCreateFor] = useState<Row | null>(null);
  const [pwdFor, setPwdFor] = useState<Row | null>(null);
  const [delFor, setDelFor] = useState<Row | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: classes }, { data: accs }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("class_accounts").select("class_id, user_id, email"),
    ]);
    const map = new Map((accs ?? []).map((a) => [a.class_id, a]));
    setRows(
      (classes ?? []).map((c) => ({
        class_id: c.id,
        class_name: c.name,
        account: map.has(c.id)
          ? { user_id: map.get(c.id)!.user_id, email: map.get(c.id)!.email }
          : null,
      }))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("manage-class-account", { body });
    if (error || data?.error) {
      throw new Error(data?.error || error?.message || "Ошибка");
    }
    return data;
  };

  const handleCreate = async () => {
    if (!createFor) return;
    setBusy(true);
    try {
      await invoke({ action: "create", email, password, class_id: createFor.class_id });
      toast({ title: "Аккаунт создан" });
      setCreateFor(null);
      setEmail("");
      setPassword("");
      load();
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePwd = async () => {
    if (!pwdFor?.account) return;
    setBusy(true);
    try {
      await invoke({ action: "update_password", user_id: pwdFor.account.user_id, password });
      toast({ title: "Пароль изменён" });
      setPwdFor(null);
      setPassword("");
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!delFor?.account) return;
    setBusy(true);
    try {
      await invoke({ action: "delete", user_id: delFor.account.user_id });
      toast({ title: "Аккаунт удалён" });
      setDelFor(null);
      load();
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Аккаунты дневника класса</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Один аккаунт на класс. Используется учениками и родителями для входа в дневник.
        </p>
      </div>

      {!rows ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.class_id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <div className="font-medium">{r.class_name}</div>
                <div className="text-sm text-muted-foreground">
                  {r.account ? r.account.email : "Аккаунт не создан"}
                </div>
              </div>
              <div className="flex gap-2">
                {r.account ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setPwdFor(r); setPassword(""); }}>
                      <KeyRound className="w-4 h-4 mr-1" /> Пароль
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDelFor(r)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Удалить
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => { setCreateFor(r); setEmail(""); setPassword(""); }}>
                    <Plus className="w-4 h-4 mr-1" /> Создать
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!createFor} onOpenChange={(o) => !o && setCreateFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать аккаунт для {createFor?.class_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="7b@school.ru" />
            </div>
            <div>
              <Label>Пароль (мин. 6)</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFor(null)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={busy}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwdFor} onOpenChange={(o) => !o && setPwdFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пароль для {pwdFor?.class_name}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Пароль (мин. 6)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdFor(null)}>Отмена</Button>
            <Button onClick={handleUpdatePwd} disabled={busy}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить аккаунт {delFor?.class_name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Доступ к дневнику класса будет отозван.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelFor(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassAccounts;
