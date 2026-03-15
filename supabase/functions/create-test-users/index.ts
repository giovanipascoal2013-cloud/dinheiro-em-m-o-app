import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const testUsers = [
    { email: 'admin@teste.com', password: 'admin123', nome: 'Admin Teste', telefone: '+244900000001', role: 'admin' },
    { email: 'supervisor@teste.com', password: 'super123', nome: 'Supervisor Teste', telefone: '+244900000002', role: 'supervisor' },
    { email: 'agente@teste.com', password: 'agente123', nome: 'Agente Teste', telefone: '+244900000003', role: 'agent' },
    { email: 'user@teste.com', password: 'user1234', nome: 'User Teste', telefone: '+244900000004', role: 'user' },
  ];

  const results = [];

  for (const u of testUsers) {
    // Create user (or get existing)
    let userId: string;
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((x: any) => x.email === u.email);

    if (found) {
      userId = found.id;
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: u.password });
      results.push({ email: u.email, status: 'already existed, password updated' });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nome: u.nome, telefone: u.telefone },
      });
      if (error) {
        results.push({ email: u.email, status: 'error', error: error.message });
        continue;
      }
      userId = created.user.id;
      results.push({ email: u.email, status: 'created' });
    }

    // Ensure profile exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        nome: u.nome,
        telefone: u.telefone,
      });
    }

    // Assign role (skip 'user' as it's the default)
    if (u.role !== 'user') {
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', u.role)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin.from('user_roles').insert({
          user_id: userId,
          role: u.role,
        });
      }
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
