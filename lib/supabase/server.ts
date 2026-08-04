/**
 * Server-side Supabase client for the public styleguide routes.
 *
 * Separate from the browser client (lib/supabase/client.ts) because a Server
 * Component must never persist or auto-refresh a session — this client is
 * anonymous by construction and only ever reads `published_snapshots`, the one
 * table with an anon-select policy (sql/arkitype_schema.sql §3).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export function createServerClient(): SupabaseClient {
  return createClient(url || "https://placeholder.supabase.co", key || "placeholder-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
