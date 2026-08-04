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

export async function generateMetadata({
  params,
}: {
  params: { slug: string; componentId: string };
}): Promise<Metadata> {
  const snapshot = await fetchSnapshot(params.slug);
  const label = componentLabel(params.componentId);
  if (!snapshot || !label) return { title: "Not found — Arkitype" };
  return { title: `${label} — ${snapshot.name}` };
}

export default async function PublishedComponentPage({
  params,
}: {
  params: { slug: string; componentId: string };
}) {
  const snapshot = await fetchSnapshot(params.slug);
  if (!snapshot || !componentLabel(params.componentId)) notFound();
  return (
    <PublicComponentPage
      snapshot={snapshot}
      slug={params.slug}
      componentId={params.componentId}
    />
  );
}
