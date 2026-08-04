/**
 * The Figma plugin's pull endpoint — "Pull Updates" without the manual paste.
 *
 * Returns the compiled Figma bundle for a *published* system, keyed by the same
 * slug that serves `app/p/[slug]`. Reusing the publish slug is deliberate:
 * `published_snapshots` is already the one anon-readable table in the schema
 * (sql/arkitype_schema.sql §3), already audited, and the slug's random suffix is
 * already the access grant. A second public read path — with its own table and
 * its own RLS policy — would be a second thing to get wrong.
 *
 * Consequence worth knowing: pulling into Figma requires publishing first. A
 * system that was never published has no slug, so it has nothing to pull.
 *
 * The bundle is compiled here rather than stored, so a republish is the only
 * thing that changes what Figma receives — there is no second copy to keep in
 * sync, exactly as with the published styleguide itself.
 */
import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { compileFigmaBundle } from "@/lib/figma";
import type { PublishedSnapshot } from "@/lib/publish";

export const dynamic = "force-dynamic";

/**
 * The plugin runs in a sandboxed iframe whose origin is `null`, so it cannot be
 * allow-listed by name. `*` is safe here and nowhere else in this app: the row
 * this route reads is already world-readable to anyone holding the slug, and the
 * request carries no cookies or credentials to be abused.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
} as const;

const fail = (status: number, error: string): NextResponse =>
  NextResponse.json({ error }, { status, headers: CORS });

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  if (!isSupabaseConfigured) return fail(503, "Publishing isn't configured on this deployment");

  const { data, error } = await createServerClient()
    .from("published_snapshots")
    .select("snapshot, published_at")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) return fail(502, "Couldn't reach the published system");
  if (!data) return fail(404, "No published system with that sync code");

  const snapshot = data.snapshot as PublishedSnapshot;

  /* `meta` is the one field the compiler needs that a snapshot doesn't carry —
   * publish deliberately drops the owner's working context (journey, folder).
   * The system name is the only part of it the bundle reads. */
  const bundle = compileFigmaBundle({
    primitives: snapshot.primitives,
    semantics: snapshot.semantics,
    components: snapshot.components,
    meta: { name: snapshot.name, started: true },
  });

  return NextResponse.json(
    { bundle, publishedAt: data.published_at, slug: params.slug },
    { headers: CORS }
  );
}
