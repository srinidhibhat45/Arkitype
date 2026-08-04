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

/**
 * ⚠️ `noindex` is load-bearing, not a default someone forgot to change.
 *
 * The slug is the access grant (lib/publish.ts) — a published styleguide is
 * "anyone with the link", not "anyone with a search box". A client's system
 * turning up in search results because their designer shared a link would be a
 * leak, so this stays off even though the page SSRs perfectly well.
 * app/robots.ts blocks crawling; this blocks indexing of a URL discovered some
 * other way. Both are needed.
 */
const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const snapshot = await fetchSnapshot(params.slug);
  if (!snapshot) return { title: "Not found", robots: PRIVATE_ROBOTS };
  const title = `${snapshot.name} design system`;
  const description = `The ${snapshot.name} design system: foundations, tokens, and components. Published with Arkitype.`;
  return {
    title,
    description,
    robots: PRIVATE_ROBOTS,
    // Self-referencing: without this the root layout's `canonical: "/"` is
    // inherited, which tells a crawler this page is really the homepage.
    alternates: { canonical: `/p/${params.slug}` },
    // Unfurls in Slack/iMessage still work — those fetch the URL directly and
    // don't consult robots rules, which is exactly the sharing path this page
    // is for.
    openGraph: { type: "website", title, description },
    twitter: { card: "summary", title, description },
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
