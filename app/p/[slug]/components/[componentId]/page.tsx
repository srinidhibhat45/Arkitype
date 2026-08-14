/**
 * A single component's public page — the Storybook-shaped surface: the live
 * component, every state and variant, and its usage docs, at a stable URL you
 * can drop into a PR or a Slack thread.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PublishedSnapshot } from "@/lib/publish";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { PublicComponentPage } from "@/components/public/PublicComponentPage";
import { PublicThemeScript } from "@/components/public/PublicThemeScript";
import { PublicFontLinks } from "@/components/public/PublicFontLinks";

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

const componentLabel = (id: string): string | undefined =>
  COMPONENT_LANES.flatMap((l) => l.items).find((i) => i.id === id)?.label;

/** See app/p/[slug]/page.tsx — the slug is the access grant, so never indexed. */
const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

export async function generateMetadata({
  params,
}: {
  params: { slug: string; componentId: string };
}): Promise<Metadata> {
  const snapshot = await fetchSnapshot(params.slug);
  const label = componentLabel(params.componentId);
  if (!snapshot || !label) return { title: "Not found", robots: PRIVATE_ROBOTS };
  const title = `${label} — ${snapshot.name}`;
  const description = `The ${label} component from the ${snapshot.name} design system: every variant and state, with usage guidance. Published with Arkitype.`;
  return {
    title,
    description,
    robots: PRIVATE_ROBOTS,
    // Self-referencing — see app/p/[slug]/page.tsx: the root layout's
    // `canonical: "/"` is otherwise inherited here.
    alternates: { canonical: `/p/${params.slug}/components/${params.componentId}` },
    openGraph: { type: "website", title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublishedComponentPage({
  params,
}: {
  params: { slug: string; componentId: string };
}) {
  const snapshot = await fetchSnapshot(params.slug);
  if (!snapshot || !componentLabel(params.componentId)) notFound();
  return (
    <>
      <PublicFontLinks fontRoles={snapshot.primitives.typography.fontRoles} />
      <PublicThemeScript
        semantics={snapshot.semantics}
        primitives={snapshot.primitives}
      />
      <PublicComponentPage
        snapshot={snapshot}
        slug={params.slug}
        componentId={params.componentId}
      />
    </>
  );
}
