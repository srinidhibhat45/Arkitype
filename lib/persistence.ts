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
import type { ProjectState } from "@/store/useDesignSystem";

export interface ProfileData {
  name: string | null;
  survey: Record<string, string> | null;
}

/** DB row → in-store ProjectState. The blob is authoritative for the design
 *  system; the row's canonical id/name/timestamps are overlaid on top. */
function rowToState(row: {
  id: string;
  name: string | null;
  state: ProjectState;
  created_at: string;
  updated_at: string;
}): ProjectState {
  const blob = row.state;
  return {
    ...blob,
    id: row.id,
    name: row.name ?? blob.name,
    createdAt: blob.createdAt ?? Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

const PROJECT_COLS = "id, name, state, created_at, updated_at";

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

/** Persist the working copy of an existing project (autosave + explicit saves). */
export async function saveProject(id: string, name: string, state: ProjectState): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("projects").update({ name, state }).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
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
