import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, XCircle, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingSubjectLinks, setPendingSubjectLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [reqRes, linkRes] = await Promise.all([
      supabase.from("teacher_requests").select("*").order("created_at", { ascending: false }),
      // Source of truth for "access management": any teacher_subjects row marked pending_removal
      supabase
        .from("teacher_subjects")
        .select("teacher_id, subject_id, pending_removal")
        .eq("pending_removal", true),
    ]);
    if (reqRes.error || linkRes.error) {
      toast.error("Не удалось загрузить заявки");
      setLoading(false);
      return;
    }
    const teacherIds = [...new Set([
      ...(reqRes.data || []).map((row: any) => row.teacher_id),
      ...(linkRes.data || []).map((row: any) => row.teacher_id),
    ].filter(Boolean))];
    const subjectIds = [...new Set((linkRes.data || []).map((row: any) => row.subject_id).filter(Boolean))];
    const [teachersResult, subjectsResult] = await Promise.all([
      teacherIds.length ? supabase.from("teachers").select("id, name, email").in("id", teacherIds) : Promise.resolve({ data: [], error: null } as any),
      subjectIds.length ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (teachersResult.error || subjectsResult.error) {
      toast.error("Не удалось загрузить данные заявок");
      setLoading(false);
      return;
    }
    const teachers = new Map((teachersResult.data || []).map((row: any) => [row.id, row]));
    const subjects = new Map((subjectsResult.data || []).map((row: any) => [row.id, row]));
    setRequests((reqRes.data || []).map((row: any) => ({ ...row, teachers: teachers.get(row.teacher_id) || null })));
    setPendingSubjectLinks((linkRes.data || []).map((row: any) => ({ ...row, teachers: teachers.get(row.teacher_id) || null, subjects: subjects.get(row.subject_id) || null })));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Approve: for "remove_subject" set teacher_subjects.pending_removal=true (teacher loses access),
  // request stays as "approved" pending final admin decision. For other types: just mark approved.
  const approveRequest = async (r: any) => {
    if (r.request_type === "remove_subject") {
      const { error: updErr } = await supabase
        .from("teacher_subjects")
        .update({ pending_removal: true })
        .eq("teacher_id", r.teacher_id)
        .eq("subject_id", r.target_id);
      if (updErr) { toast.error("Ошибка: " + updErr.message); return; }
    }
    const { error } = await supabase
      .from("teacher_requests")
      .update({ status: "approved", acknowledged: false })
      .eq("id", r.id);
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Заявка одобрена. Доступ временно ограничен."); loadAll(); }
  };

  const rejectRequest = async (r: any) => {
    if (r.request_type === "remove_subject") {
      await supabase
        .from("teacher_subjects")
        .update({ pending_removal: false })
        .eq("teacher_id", r.teacher_id)
        .eq("subject_id", r.target_id);
    }
    const { error } = await supabase
      .from("teacher_requests")
      .update({ status: "rejected", acknowledged: false })
      .eq("id", r.id);
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Заявка отклонена"); loadAll(); }
  };

  // Final decision: confirm removal — delete teacher_subjects link AND keep the request as "approved+resolved"
  // so the teacher can still see the outcome and click "Просмотрено".
  const finalizeRemoval = async (teacherId: string, subjectId: string, subjectName: string) => {
    const { error: delErr } = await supabase
      .from("teacher_subjects")
      .delete()
      .eq("teacher_id", teacherId)
      .eq("subject_id", subjectId);
    if (delErr) { toast.error("Ошибка: " + delErr.message); return; }

    // Find the matching open request (if any) and mark it approved & not acknowledged so the teacher sees it
    const matching = requests.find(
      (r) => r.teacher_id === teacherId && r.target_id === subjectId && r.request_type === "remove_subject"
    );
    if (matching) {
      await supabase
        .from("teacher_requests")
        .update({ status: "approved", acknowledged: false })
        .eq("id", matching.id);
    } else {
      // No request exists (e.g. legacy / stuck state) — create a synthetic "approved" notification for the teacher
      await supabase.from("teacher_requests").insert({
        teacher_id: teacherId,
        request_type: "remove_subject",
        target_id: subjectId,
        target_name: subjectName,
        status: "approved",
        acknowledged: false,
        message: "Предмет окончательно убран администратором",
      });
    }
    toast.success("Предмет окончательно убран у учителя");
    loadAll();
  };

  // Final decision: cancel — restore access, mark request as rejected so teacher sees it
  const cancelRemoval = async (teacherId: string, subjectId: string, subjectName: string) => {
    const { error: updErr } = await supabase
      .from("teacher_subjects")
      .update({ pending_removal: false })
      .eq("teacher_id", teacherId)
      .eq("subject_id", subjectId);
    if (updErr) { toast.error("Ошибка: " + updErr.message); return; }

    const matching = requests.find(
      (r) => r.teacher_id === teacherId && r.target_id === subjectId && r.request_type === "remove_subject"
    );
    if (matching) {
      await supabase
        .from("teacher_requests")
        .update({ status: "rejected", acknowledged: false })
        .eq("id", matching.id);
    } else {
      await supabase.from("teacher_requests").insert({
        teacher_id: teacherId,
        request_type: "remove_subject",
        target_id: subjectId,
        target_name: subjectName,
        status: "rejected",
        acknowledged: false,
        message: "Доступ восстановлен администратором",
      });
    }
    toast.success("Доступ к предмету восстановлен");
    loadAll();
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Одобрено (на рассмотрении)";
    if (status === "rejected") return "Отклонено";
    return "На рассмотрении";
  };

  const typeLabel = (type: string) => {
    if (type === "remove_subject") return "Отказ от предмета";
    if (type === "remove_class") return "Отказ от класса";
    return type;
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Загрузка...</div>;

  const pending = requests.filter((r) => r.status === "pending");
  // SOURCE OF TRUTH for the "access management" section:
  // every teacher_subjects row with pending_removal=true must appear here, regardless of request state.
  const inReview = pendingSubjectLinks;
  // Resolved = anything not pending and not currently in pending_removal state
  const pendingPairs = new Set(pendingSubjectLinks.map((l: any) => `${l.teacher_id}|${l.subject_id}`));
  const resolved = requests.filter(
    (r) =>
      (r.status === "rejected" || r.status === "approved") &&
      !r.acknowledged &&
      !(r.request_type === "remove_subject" && pendingPairs.has(`${r.teacher_id}|${r.target_id}`))
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">📋 Заявки учителей</h1>

      {/* Pending */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          На рассмотрении ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Нет новых заявок</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {statusIcon(r.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {r.teachers?.name || "Учитель"}
                        </span>
                        <span className="text-xs text-muted-foreground">({r.teachers?.email})</span>
                      </div>
                      <div className="text-sm text-foreground">
                        {typeLabel(r.request_type)}: <span className="font-semibold text-primary">{r.target_name}</span>
                      </div>
                      {r.message && (
                        <div className="text-xs text-muted-foreground mt-1 bg-secondary/30 rounded-lg px-3 py-2">
                          {r.message}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approveRequest(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      >
                        Одобрить
                      </button>
                      <button
                        onClick={() => rejectRequest(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* In review — driven by teacher_subjects.pending_removal=true (always shows, even if request was lost) */}
      {inReview.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Управление доступом ({inReview.length})
          </h2>
          <div className="space-y-2">
            {inReview.map((link: any) => {
              const key = `${link.teacher_id}|${link.subject_id}`;
              const matchingReq = requests.find(
                (r) => r.teacher_id === link.teacher_id && r.target_id === link.subject_id && r.request_type === "remove_subject"
              );
              return (
                <Card key={key} className="border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{link.teachers?.name}</span>
                          <span className="text-xs text-muted-foreground">({link.teachers?.email})</span>
                        </div>
                        <div className="text-sm text-foreground">
                          Доступ к предмету <span className="font-semibold text-primary">{link.subjects?.name}</span> временно ограничен.
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Решите окончательно: убрать предмет у учителя или восстановить доступ.
                        </div>
                        {matchingReq?.message && (
                          <div className="text-xs text-muted-foreground mt-1 bg-secondary/30 rounded-lg px-3 py-2">
                            Комментарий учителя: {matchingReq.message}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => finalizeRemoval(link.teacher_id, link.subject_id, link.subjects?.name || "")}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors"
                        >
                          Убрать окончательно
                        </button>
                        <button
                          onClick={() => cancelRemoval(link.teacher_id, link.subject_id, link.subjects?.name || "")}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors"
                        >
                          Восстановить
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Обработанные ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((r) => (
              <Card key={r.id} className="opacity-70">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {statusIcon(r.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {r.teachers?.name}
                      </div>
                      <div className="text-sm text-foreground">
                        {typeLabel(r.request_type)}: <span className="font-semibold">{r.target_name}</span>
                      </div>
                      {r.message && (
                        <div className="text-xs text-muted-foreground mt-0.5">{r.message}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString("ru-RU")} · {statusLabel(r.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
