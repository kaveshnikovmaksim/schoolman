import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const email = "admin@school.ru";
  const password = "admin12345";

  // Find user by email using admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  
  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), { status: 400 });
  }

  const existingUser = users?.find(u => u.email === email);

  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, { password });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify({ success: true, action: "password_updated", email }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
});
