import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, email, password, class_id, user_id } = body;

    if (action === "create") {
      if (!email || !password || !class_id) {
        return new Response(JSON.stringify({ error: "email, password, class_id required" }), { status: 400, headers: corsHeaders });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Пароль должен быть не менее 6 символов" }), { status: 400, headers: corsHeaders });
      }

      // ensure no existing account for this class
      const { data: existing } = await adminClient.from("class_accounts").select("id").eq("class_id", class_id).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "У класса уже есть аккаунт" }), { status: 400, headers: corsHeaders });
      }

      const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (userError) {
        return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders });
      }

      const newUserId = userData.user.id;
      await adminClient.from("user_roles").insert({ user_id: newUserId, role: "class_account" });
      const { error: caErr } = await adminClient.from("class_accounts").insert({ user_id: newUserId, class_id, email });
      if (caErr) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return new Response(JSON.stringify({ error: caErr.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_password") {
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "user_id and password required" }), { status: 400, headers: corsHeaders });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Пароль должен быть не менее 6 символов" }), { status: 400, headers: corsHeaders });
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
      }
      await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "class_account");
      await adminClient.from("class_accounts").delete().eq("user_id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
