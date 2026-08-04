/**
 * Public styleguide — the hosted, unauthenticated face of a published system.
 *
 * Server Component: reads one row from `published_snapshots` (the only
 * anon-readable table) and hands the frozen snapshot to a client renderer. No
 * session, no store, no editing — everything on the page is compiled from the
 * same token state that produces the Figma bundle and the framework adapters,
 * so a published site can't drift from the system it documents.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PublishedSnapshot } from "@/lib/publish";
import { PublicStyleguide } from "@/components/public/PublicStyleguide";

export const dynamic = "force-dynamic";

async function fetchSnapshot(slug: string): Promise<PublishedSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await createServerClient()
    .from("published_snapshots")
    .select("snapshot")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data.snapshot as PublishedSnapshot;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const snapshot = await fetchSnapshot(params.slug);
  if (!snapshot) return { title: "Not found — Arkitype" };
  return {
    title: `${snapshot.name} — Design system`,
    description: `The ${snapshot.name} design system: foundations, tokens, and components. Published with Arkitype.`,
  };
}

export default async function PublishedStyleguidePage({
  params,
}: {
  params: { slug: string };
}) {
  const snapshot = await fetchSnapshot(params.slug);
  if (!snapshot) notFound();
  return <PublicStyleguide snapshot={snapshot} slug={params.slug} />;
}
