/**
 * Publishing adapter — turns a working design system into a frozen, publicly
 * readable snapshot in `public.published_snapshots` (sql/arkitype_schema.sql §3).
 *
 * The snapshot is a *copy*, not a live view of `projects.state`: editing a
 * project after publishing changes nothing publicly until the owner republishes.
 * That's what makes a shared link safe to hand to a client.
 *
 * Sibling of lib/persistence.ts and follows its conventions (supabase-js stays
 * behind this seam; ProjectState imported type-only to avoid an import cycle).
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ProjectState } from "@/store/useDesignSystem";

/**
 * The serializable slice a published site needs to render. Deliberately NOT the
 * whole ProjectState — `journey`, `folder` and the session-only fields are the
 * owner's working context and have no business on a public page.
 */
export interface PublishedSnapshot {
  name: string;
  primitives: ProjectState["primitives"];
  semantics: ProjectState["semantics"];
  components: ProjectState["components"];
}

export interface PublishedRecord {
  slug: string;
  snapshot: PublishedSnapshot;
  publishedAt: number;
}

export function toSnapshot(project: ProjectState): PublishedSnapshot {
  return {
    name: project.name,
    primitives: project.primitives,
    semantics: project.semantics,
    components: project.components,
  };
}

const slugifyName = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "design-system";

/**
 * Readable prefix + random suffix. The suffix is not decoration: the RLS policy
 * on `published_snapshots` is `using (true)`, so knowing a slug *is* the access
 * grant. A purely name-derived slug would let anyone guess "acme-design-system"
 * and read it.
 */
function newSlug(name: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slugifyName(name)}-${rand}`;
}

const SNAPSHOT_COLS = "slug, snapshot, published_at";

function rowToRecord(row: { slug: string; snapshot: PublishedSnapshot; published_at: string }): PublishedRecord {
  return {
    slug: row.slug,
    snapshot: row.snapshot,
    publishedAt: Date.parse(row.published_at),
  };
}

/** The current publication for a project, or null if it was never published. */
export async function getPublication(projectId: string): Promise<PublishedRecord | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("published_snapshots")
    .select(SNAPSHOT_COLS)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data) : null;
}

/**
 * Publish (or republish) a project. The slug is minted once and then held
 * stable across republishes — a link already shared must not rot because the
 * owner renamed the file.
 */
export async function publishSnapshot(project: ProjectState): Promise<PublishedRecord> {
  if (!isSupabaseConfigured) throw new Error("Supabase isn't configured");
  const { data: auth } = await supabase.auth.getUser();
  const owner = auth.user?.id;
  if (!owner) throw new Error("Not signed in");

  const existing = await getPublication(project.id);
  const slug = existing?.slug ?? newSlug(project.name);

  const { data, error } = await supabase
    .from("published_snapshots")
    .upsert(
      { project_id: project.id, owner, slug, snapshot: toSnapshot(project), published_at: new Date().toISOString() },
      { onConflict: "project_id" }
    )
    .select(SNAPSHOT_COLS)
    .single();
  if (error) throw error;
  return rowToRecord(data);
}

/** Take a published styleguide offline. */
export async function unpublish(projectId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("published_snapshots").delete().eq("project_id", projectId);
  if (error) throw error;
}
