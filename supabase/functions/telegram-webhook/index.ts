import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const api = `https://api.telegram.org/bot${token}`;

async function sendMessage(chatId: string, text: string) {
  await fetch(`${api}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
    const result = await fetch(`${api}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    return new Response(await result.text(), { headers: { "content-type": "application/json" } });
  }
  if (request.method !== "POST") return new Response("ok");
  const update = await request.json();
  const message = update.message;
  const chatId = message?.chat?.id?.toString();
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!chatId) return new Response("ok");

  if (text.startsWith("/start")) {
    const code = text.slice("/start".length).trim();
    if (!code) {
      await sendMessage(chatId, "Откройте ссылку подключения из дневника, чтобы привязать Telegram.");
      return new Response("ok");
    }
    const { data: linkCode } = await supabase
      .from("telegram_link_codes")
      .select("code, student_id, expires_at, used_at")
      .eq("code", code)
      .maybeSingle();
    if (!linkCode || linkCode.used_at || new Date(linkCode.expires_at) < new Date()) {
      await sendMessage(chatId, "Ссылка подключения устарела. Создайте новую ссылку в дневнике.");
      return new Response("ok");
    }
    await supabase.from("telegram_student_links").upsert({
      student_id: linkCode.student_id,
      chat_id: chatId,
      username: message.chat.username ?? null,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id" });
    await supabase.from("telegram_link_codes").update({ used_at: new Date().toISOString() }).eq("code", code);
    await sendMessage(chatId, "Telegram подключён. Вы будете получать уведомления о новых домашних заданиях.");
  }
  return new Response("ok");
});
