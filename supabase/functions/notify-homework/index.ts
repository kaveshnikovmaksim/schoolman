import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405 });
  const { homework_id } = await request.json();
  if (!homework_id) return new Response(JSON.stringify({ error: "homework_id required" }), { status: 400 });
  const { data: homework, error } = await supabase.from("homework").select("id, title, description, due_date, class_id, subjects(name), classes(name)").eq("id", homework_id).single();
  if (error || !homework) return new Response(JSON.stringify({ error: error?.message || "not found" }), { status: 404 });
  const { data: students } = await supabase.from("students").select("id").eq("class_id", homework.class_id);
  const ids = (students || []).map((student) => student.id);
  const { data: links } = ids.length ? await supabase.from("telegram_student_links").select("chat_id").in("student_id", ids).eq("enabled", true) : { data: [] };
  const text = `📚 Новое домашнее задание\n\n${(homework.subjects as any)?.name || "Предмет"} · ${(homework.classes as any)?.name || "Класс"}\nСрок: ${homework.due_date}\n\n${homework.title}${homework.description ? `\n${homework.description}` : ""}`;
  let sent = 0;
  for (const link of links || []) {
    const result = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: link.chat_id, text }) });
    if (result.ok) sent++;
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "content-type": "application/json" } });
});
