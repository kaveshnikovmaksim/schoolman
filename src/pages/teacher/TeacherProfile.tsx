import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTeacherContext } from "@/contexts/TeacherContext";
import { supabase } from "@/integrations/supabase/client";
import { User, BookOpen, Users, Mail, Phone, KeyRound, Send, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TeacherProfile() {
  const { teacherId, teacherClasses, teacherSubjects, pendingSubjects, allTeacherSubjects } = useTeacherContext();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Requests
  const [requests, setRequests] = useState<any[]>([]);
  const [requestType, setRequestType] = useState<string>("");
  const [requestTargetId, setRequestTargetId] = useState<string>("");
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!teacherId) return;
    supabase.from("teachers").select("*").eq("id", teacherId).single()
      .then(({ data }) => { setTeacher(data); setLoading(false); });
  }, [teacherId]);

  // Load own requests (only those NOT yet acknowledged by the teacher)
  const loadRequests = async () => {
    if (!teacherId) return;
    const { data } = await supabase
      .from("teacher_requests")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("acknowledged", false)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  useEffect(() => { loadRequests(); }, [teacherId]);

  const acknowledgeRequest = async (id: string) => {
    const { error } = await supabase
      .from("teacher_requests")
      .update({ acknowledged: true })
      .eq("id", id);
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Заявка отмечена как просмотренная"); loadRequests(); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Минимум 6 символов");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Пароль изменён"); setNewPassword(""); }
    setChangingPassword(false);
  };

  const targetOptions = requestType === "remove_subject"
    ? (teacherSubjects || []).map((s: any) => ({ id: s.id, name: s.name }))
    : requestType === "remove_class"
    ? (teacherClasses || []).map((c: any) => ({ id: c.id, name: c.name }))
    : [];

  const selectedTarget = targetOptions.find((t: any) => t.id === requestTargetId);

  const handleSubmitRequest = async () => {
    if (!requestType || !requestTargetId || !selectedTarget || !teacherId) {
      toast.error("Выберите тип заявки и объект");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("teacher_requests").insert({
      teacher_id: teacherId,
      request_type: requestType,
      target_id: requestTargetId,
      target_name: selectedTarget.name,
      message: requestMessage || null,
    });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success("Заявка отправлена");
      setRequestType("");
      setRequestTargetId("");
      setRequestMessage("");
      loadRequests();
    }
    setSubmitting(false);
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Одобрено";
    if (status === "rejected") return "Отклонено";
    return "На рассмотрении";
  };

  const typeLabel = (type: string) => {
    if (type === "remove_subject") return "Отказ от предмета";
    if (type === "remove_class") return "Отказ от класса";
    return type;
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">🪪 Кабинет учителя</h1>

      {/* Personal info */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4" /> Личные данные
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">ФИО</span>
              <div className="font-medium text-foreground">{teacher?.name || "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Email</span>
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {teacher?.email || "—"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Телефон</span>
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {teacher?.phone || "Не указан"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Мои предметы
          </h2>
          {(teacherSubjects?.length || pendingSubjects?.length) ? (
            <div className="flex flex-wrap gap-2">
              {teacherSubjects?.map((s: any) => (
                <span key={s.id} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  {s.name}
                </span>
              ))}
              {pendingSubjects?.map((s: any) => (
                <span
                  key={s.id}
                  title="На рассмотрении админом — доступ временно ограничен"
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/30 border-dashed text-xs font-medium flex items-center gap-1.5"
                >
                  🔒 {s.name} <span className="text-[10px] opacity-80">на рассмотрении</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Нет предметов</div>
          )}
        </CardContent>
      </Card>

      {/* Classes */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4" /> Мои классы
          </h2>
          {teacherClasses?.length ? (
            <div className="flex flex-wrap gap-2">
              {teacherClasses.map((c: any) => (
                <span key={c.id} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium">
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Нет классов</div>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Сменить пароль
          </h2>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Новый пароль (мин. 6 символов)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Submit request */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4" /> Подать заявку
          </h2>

          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Тип заявки</div>
              <Select value={requestType} onValueChange={(v) => { setRequestType(v); setRequestTargetId(""); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remove_subject">Отказ от предмета</SelectItem>
                  <SelectItem value="remove_class">Отказ от класса</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestType && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {requestType === "remove_subject" ? "Предмет" : "Класс"}
                </div>
                <Select value={requestTargetId} onValueChange={setRequestTargetId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={requestType === "remove_subject" ? "Выберите предмет" : "Выберите класс"} />
                  </SelectTrigger>
                  <SelectContent>
                    {targetOptions.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {requestType && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Комментарий (необязательно)</div>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Причина заявки..."
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
            )}

            {requestType && requestTargetId && (
              <button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Отправить заявку
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing requests */}
      {requests.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">📋 Мои заявки</h2>
            <div className="space-y-2">
              {requests.map((r: any) => {
                const isResolved = r.status === "approved" || r.status === "rejected";
                return (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    {statusIcon(r.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {typeLabel(r.request_type)}: <span className="text-primary">{r.target_name}</span>
                      </div>
                      {r.message && <div className="text-xs text-muted-foreground mt-0.5">{r.message}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString("ru-RU")} · {statusLabel(r.status)}
                      </div>
                    </div>
                    {isResolved && (
                      <button
                        onClick={() => acknowledgeRequest(r.id)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-card border border-border hover:bg-secondary text-foreground transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Просмотрено
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
