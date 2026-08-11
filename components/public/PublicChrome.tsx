"use client";

/**
 * The published site's chrome: the page frame every public surface renders
 * inside, and the one control that drives it.
 *
 * ── Why the chrome follows the *system's* mode ──────────────────────────────
 *
 * A published styleguide had a Light/Dark switch that repainted the swatches
 * and left the page itself white, in every case, forever: nothing on a public
 * route ever put `.dark` on <html>, so the `--c-*` chrome variables were stuck
 * on their `:root` (light) values. Clicking "Dark" on a dark system produced a
 * white page full of dark-mode colours, which reads as broken because it is.
 *
 * One control, both effects. The reader picks a mode of the system, and the
 * page renders as a document *about that mode*: chrome included. Which
 * appearance a mode implies is not guessed here — `modeBase` already answers
 * it for the studio, including for custom modes like High-contrast that
 * declare their own base.
 *
 * The initial mode is chosen from `prefers-color-scheme` when the system
 * publishes a mode that matches, so a reader on a dark machine opening a
 * light+dark system lands in dark.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import {
  modeBase,
  modeDefsOf,
  type PreviewMode,
  type ProjectState,
} from "@/store/useDesignSystem";

type Semantics = ProjectState["semantics"];
type Primitives = ProjectState["primitives"];

/** Apply the chrome appearance to <html>, the only place `.dark` is read. */
function applyChrome(base: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", base === "dark");
  document.documentElement.style.colorScheme = base;
}

export interface PublicTheme {
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
  base: "light" | "dark";
  modes: ReturnType<typeof modeDefsOf>;
}

export function usePublicTheme(
  semantics: Semantics,
  primitives: Primitives
): PublicTheme {
  const modes = useMemo(() => modeDefsOf(semantics), [semantics]);

  // SSR renders the first mode; the effect below corrects to the reader's
  // preference on mount. Deriving it during render would mismatch hydration.
  const [mode, setModeState] = useState<PreviewMode>(() => modes[0]?.id ?? "light");

  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const wanted = modes.find(
      (m) => modeBase(semantics, m.id, primitives) === (prefersDark ? "dark" : "light")
    );
    if (wanted) setModeState(wanted.id);
    // Once, on mount: after this the reader's explicit choice wins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base = modeBase(semantics, mode, primitives);

  useEffect(() => {
    applyChrome(base);
    // The class lives on <html>, which outlives this component — a reader
    // navigating from a dark styleguide back to the marketing site should not
    // inherit its chrome.
    return () => applyChrome("light");
  }, [base]);

  const setMode = useCallback((next: PreviewMode) => setModeState(next), []);

  return { mode, setMode, base, modes };
}

/** The mode switch. Every mode the file publishes, not a hardcoded pair. */
export function ModeSwitch({
  theme,
  semantics,
  primitives,
}: {
  theme: PublicTheme;
  semantics: Semantics;
  primitives: Primitives;
}) {
  if (theme.modes.length < 2) return null;
  return (
    <div
      role="group"
      aria-label="Colour mode"
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-ink-panel p-0.5"
    >
      {theme.modes.map((m) => {
        const active = theme.mode === m.id;
        const isDark = modeBase(semantics, m.id, primitives) === "dark";
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => theme.setMode(m.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              active ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
            }`}
          >
            {isDark ? <Moon size={11} /> : <Sun size={11} />}
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The page frame. `bg-ink`/`text-fg` are chrome tokens, so this repaints with
 * the mode the reader picked — the whole point of the file.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-fg transition-colors duration-200">
      {children}
    </div>
  );
}
