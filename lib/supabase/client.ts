/**
 * Arkitype Supabase browser client.
 *
 * Single shared client for the whole app (client-rendered). Reads the public
 * project URL + publishable key from env; the publishable key is browser-safe —
 * row-level security (see sql/arkitype_schema.sql) is what actually guards data.
 * Session is persisted to localStorage and auto-refreshed by supabase-js, so it
 * survives reloads without our own token plumbing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True only when both env vars are present — lets the UI degrade gracefully. */
export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured && process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[arkitype] Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the dev server."
  );
}

// Supabase's client throws synchronously if the URL isn't valid, which would
// crash the build (prerendering) when env vars aren't set. Fall back to a
// placeholder so construction always succeeds; `isSupabaseConfigured` is what
// actually gates whether callers use it (see lib/persistence.ts).
export const supabase: SupabaseClient = createClient(url || "https://placeholder.supabase.co", key || "placeholder-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // consume the magic-link / OTP redirect hash
    flowType: "pkce",
  },
});
