import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Client that bypasses RLS. Only for trusted edge-function operations. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Resolves the authenticated user from the incoming request JWT. */
export async function getUserFromRequest(
  req: Request
): Promise<{ user: { id: string } | null }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await admin.auth.getUser();
  if (error || !data.user) {
    return { user: null };
  }
  return { user: { id: data.user.id } };
}

export function todayInTimezone(tz: string | undefined): string {
  if (!tz) {
    return new Date().toISOString().slice(0, 10);
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}