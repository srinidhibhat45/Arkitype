"use client";

/**
 * Loads a published snapshot into the Zustand store so the existing component
 * factory renders it unchanged.
 *
 * The factory components read `primitives`/`semantics`/`components` straight off
 * the store rather than taking them as props, so the alternative was threading
 * a snapshot through 50+ components. Hydrating instead keeps the public page
 * pixel-identical to the studio with no changes to any of them.
 *
 * This is safe precisely because AuthProvider — which owns the autosave
 * subscription — is mounted only on `/`. On a public route nothing is watching
 * the store, so hydrating it here can never write to anyone's project.
 *
 * Hydration is deliberately in an effect, not a render-time `setState`: the
 * store's persist middleware writes to localStorage on every set, which throws
 * during SSR. Callers must render preview content only once this returns true.
 */
import { useEffect, useRef, useState } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import type { PublishedSnapshot } from "@/lib/publish";

export function useSnapshotHydrated(snapshot: PublishedSnapshot): boolean {
  const [ready, setReady] = useState(false);
  // Hydrating re-renders every store subscriber. If a caller rebuilds its
  // snapshot object on those renders, keying the effect on `snapshot` would
  // loop forever — a page's snapshot is fixed, so hydrate once per mount.
  const done = useRef(false);
  const latest = useRef(snapshot);
  latest.current = snapshot;

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const s = latest.current;
    useDesignSystem.setState({
      primitives: s.primitives,
      semantics: s.semantics,
      components: s.components,
      meta: { name: s.name, started: true },
    });
    setReady(true);
  }, []);

  return ready;
}
