import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // no body required
    }
    if (body?.confirm !== 'VERWIJDER') {
      return json({ error: 'Bevestiging ontbreekt' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get children of this user
    const { data: children } = await admin
      .from('children')
      .select('id')
      .eq('parent_id', userId);
    const childIds = (children ?? []).map((c) => c.id);

    const errors: Array<{ step: string; error: string }> = [];
    const safeDelete = async (step: string, fn: () => Promise<{ error: any }>) => {
      try {
        const { error } = await fn();
        if (error) errors.push({ step, error: error.message });
      } catch (e) {
        errors.push({ step, error: (e as Error).message });
      }
    };

    if (childIds.length > 0) {
      await safeDelete('child_badges', () =>
        admin.from('child_badges').delete().in('child_id', childIds));
      await safeDelete('exercise_attempts', () =>
        admin.from('exercise_attempts').delete().in('child_id', childIds));
      await safeDelete('child_progress', () =>
        admin.from('child_progress').delete().in('child_id', childIds));
      await safeDelete('trimester_progress', () =>
        admin.from('trimester_progress').delete().in('child_id', childIds));
    }

    await safeDelete('rewards', () => admin.from('rewards').delete().eq('parent_id', userId));
    await safeDelete('children', () => admin.from('children').delete().eq('parent_id', userId));
    await safeDelete('subscriptions', () =>
      admin.from('subscriptions').delete().eq('user_id', userId));
    await safeDelete('parent_pins', () =>
      admin.from('parent_pins').delete().eq('user_id', userId));
    await safeDelete('user_roles', () =>
      admin.from('user_roles').delete().eq('user_id', userId));
    await safeDelete('organization_members', () =>
      admin.from('organization_members').delete().eq('user_id', userId));
    await safeDelete('profiles', () => admin.from('profiles').delete().eq('id', userId));

    const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
    if (authDelErr) {
      return json({
        error: 'Account kon niet volledig verwijderd worden',
        details: authDelErr.message,
        partial_errors: errors,
      }, 500);
    }

    return json({ success: true, partial_errors: errors });
  } catch (e) {
    return json({ error: 'Unexpected error', details: (e as Error).message }, 500);
  }
});
