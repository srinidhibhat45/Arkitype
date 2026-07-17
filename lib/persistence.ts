/**
 * Arkitype persistence adapter — the single seam between the Zustand store and
 * Supabase. Each design "file" is one row in `public.projects`, with the whole
 * self-contained ProjectState blob living in the `state` jsonb column (see
 * sql/arkitype_schema.sql). The store stays backend-agnostic: it calls these
 * functions and never touches supabase-js directly.
 *
 * `ProjectState` is imported type-only so this module and the store don't form a
 * runtime import cycle.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { backfillProjectState, type ProjectState } from "@/store/useDesignSystem";

export interface ProfileData {
  name: string | null;
  survey: Record<string, string> | null;
}

/**
 * Last server-confirmed `updated_at` per project, so `saveProject` can detect
 * a write from another tab/device landing in between (see its doc comment).
 * In-memory only — repopulated from every load/save response.
 */
const lastKnownUpdatedAt = new Map<string, string>();

/** DB row → in-store ProjectState. The blob is authoritative for the design
 *  system; the row's canonical id/name/timestamps are overlaid on top. */
function rowToState(row: {
  id: string;
  name: string | null;
  state: ProjectState;
  created_at: string;
  updated_at: string;
}): ProjectState {
  lastKnownUpdatedAt.set(row.id, row.updated_at);
  const blob = backfillProjectState(row.state);
  return {
    ...blob,
    id: row.id,
    name: row.name ?? blob.name,
    createdAt: blob.createdAt ?? Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

const PROJECT_COLS = "id, name, state, created_at, updated_at";

/**
 * Per-project promise queue so two saves for the same id are never in flight
 * at once. Without this, a burst of edits over a slow connection can fire a
 * new (unawaited) save every debounce cycle — if an older request's response
 * arrives after a newer one's, the older snapshot silently wins and the
 * newer edit is lost. Queuing makes every save for a given id strictly
 * ordered; one failure doesn't permanently wedge the queue.
 */
const saveQueues = new Map<string, Promise<unknown>>();
function sequence<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prior = saveQueues.get(id) ?? Promise.resolve();
  const result = prior.then(fn, fn);
  saveQueues.set(
    id,
    result.catch(() => undefined)
  );
  return result;
}

/** Current signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** All of the signed-in user's projects, most-recently-updated first. */
export async function loadProjects(): Promise<ProjectState[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToState);
}

/** Insert a new project; returns the stored state carrying its real DB uuid. */
export async function createProject(name: string, state: ProjectState): Promise<ProjectState> {
  const owner = await currentUserId();
  if (!owner) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("projects")
    .insert({ owner, name, state })
    .select(PROJECT_COLS)
    .single();
  if (error) throw error;
  return rowToState(data);
}

/**
 * Persist the working copy of an existing project (autosave + explicit
 * saves). Queued per id (see `sequence`) and conditioned on the last
 * server-confirmed `updated_at` when we have one, so a save from another
 * tab/device that landed in between is detected rather than silently
 * overwritten. On conflict, throws a `ConflictError` instead of quietly
 * "succeeding" over someone else's newer write.
 */
export async function saveProject(id: string, name: string, state: ProjectState): Promise<void> {
  if (!isSupabaseConfigured) return;
  return sequence(id, () => doSaveProject(id, name, state));
}

async function doSaveProject(id: string, name: string, state: ProjectState): Promise<void> {
  const expected = lastKnownUpdatedAt.get(id);
  let query = supabase.from("projects").update({ name, state }).eq("id", id);
  if (expected) query = query.eq("updated_at", expected);
  const { data, error } = await query.select("id, updated_at");
  if (error) throw error;
  if (data?.length) {
    lastKnownUpdatedAt.set(id, data[0].updated_at);
    return;
  }
  // 0 rows is ambiguous: either the updated_at precondition didn't match
  // (someone/something else saved this project first) or we can no longer
  // see the row at all (RLS / expired session). Tell them apart with a
  // follow-up read rather than treating every 0-row update as a plain failure.
  const { data: check } = await supabase.from("projects").select("updated_at").eq("id", id).maybeSingle();
  if (check) {
    lastKnownUpdatedAt.set(id, check.updated_at);
    const conflict = new Error("This file changed elsewhere — reload it to see the latest version before saving again.");
    conflict.name = "ConflictError";
    throw conflict;
  }
  throw new Error("Save didn't reach the server — are you still signed in?");
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  return sequence(id, async () => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    lastKnownUpdatedAt.delete(id);
  });
}

/** Rename without rewriting the whole blob. */
export async function renameProject(id: string, name: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("projects").update({ name }).eq("id", id);
  if (error) throw error;
}

/** The signed-in user's profile (display name + onboarding survey). */
export async function loadProfile(): Promise<ProfileData | null> {
  if (!isSupabaseConfigured) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("name, survey")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? { name: data.name, survey: data.survey } : null;
}

/** Store the onboarding survey answers on the profile. */
export async function saveSurvey(survey: Record<string, string>): Promise<void> {
  if (!isSupabaseConfigured) return;
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from("profiles").update({ survey }).eq("id", uid);
  if (error) throw error;
}
