import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't crash at import time — components can read this and degrade gracefully.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "[creator.paris] Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}

/**
 * Browser-side Supabase client. Uses the public anon key.
 * RLS allows SELECT on all tables; INSERT/UPDATE/DELETE are blocked
 * for the anon role — those go through Next.js API routes that use
 * the service role key server-side.
 */
export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder",
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);

/**
 * Server-only admin client. Bypasses RLS — never import in client code.
 */
export function supabaseAdmin(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin env vars missing on server.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseConfigured = Boolean(url && anonKey);
