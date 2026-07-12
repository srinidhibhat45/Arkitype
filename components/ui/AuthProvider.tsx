"use client";

/**
 * AuthProvider — the single bridge between Supabase auth and the store.
 *  • On mount it resolves the current session (gating first paint so we never
 *    flash a stale signed-in/out view) and subscribes to auth changes.
 *  • On sign-in it loads the profile + projects and hydrates the store; on
 *    sign-out it clears session state.
 *  • It runs the debounced autosave that pushes the active file's design blob
 *    back to Supabase whenever the design (not transient UI) actually changes.
 */
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import * as db from "@/lib/persistence";
import { useDesignSystem, type ProjectState } from "@/store/useDesignSystem";

async function hydrateFrom(session: Session) {
  const store = useDesignSystem.getState();
  const email = session.user.email ?? "";
  let name = (session.user.user_metadata?.name as string | undefined) ?? "";
  let survey: Record<string, string> | null = null;
  let projects: Record<string, ProjectState> = {};
  try {
    const profile = await db.loadProfile();
    if (profile) {
      name = profile.name ?? name;
      survey = profile.survey ?? null;
    }
    const list = await db.loadProjects();
    projects = Object.fromEntries(list.map((p) => [p.id, p]));
  } catch (e) {
    // profiles/projects tables may not exist until the SQL migration is run —
    // don't block sign-in; the user just lands with no files yet.
    console.error("[arkitype] session hydrate failed (run sql/arkitype_schema.sql?)", e);
  }
  store.hydrateSession({ email, name }, survey, projects);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  // Resolve the session once, then track sign-in / sign-out.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session) await hydrateFrom(data.session);
      else useDesignSystem.getState().clearSession();
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Arrived via a reset link: Supabase has established a short-lived
        // recovery session. Flag the store so the UI shows "set a new password"
        // (which takes render precedence over whatever view we hydrate underneath).
        useDesignSystem.getState().setRecovery(true);
        if (session) void hydrateFrom(session);
      } else if (event === "SIGNED_IN" && session) void hydrateFrom(session);
      else if (event === "SIGNED_OUT") useDesignSystem.getState().clearSession();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Debounced autosave of the active file, on real design changes only.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useDesignSystem.subscribe((state, prev) => {
      const id = state.activeProjectId;
      if (!id) return;
      const cur = state.projects[id];
      if (!cur) return;
      const before = prev.activeProjectId === id ? prev.projects[id] : undefined;
      const designChanged =
        !before ||
        cur.meta !== before.meta ||
        cur.journey !== before.journey ||
        cur.primitives !== before.primitives ||
        cur.semantics !== before.semantics ||
        cur.components !== before.components;
      if (!designChanged) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        db.saveProject(id, cur.name, cur).catch((e) =>
          console.error("[arkitype] autosave failed", e)
        );
      }, 1200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  if (!ready) return <div className="h-screen bg-ink" />;
  return <>{children}</>;
}
