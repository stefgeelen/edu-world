import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * The signed-in user behind a request, or null.
 *
 * The gateway's JWT check alone is not enough: the public anon key is itself a
 * valid JWT and ships in the app bundle, so anyone could call a paid function
 * with it. Only a real user session passes here.
 */
export async function requireUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

/** Upstream API calls give up after this, so a hung provider can't keep a function running. */
export const UPSTREAM_TIMEOUT_MS = 10_000;
