/**
 * Pre-paint chrome selection for a published styleguide.
 *
 * Server Component (no "use client"): the snapshot is already in hand here, so
 * the page can state which of its modes are dark *before* the browser paints.
 * Without this the first frame is always the `:root` light chrome and a reader
 * on a dark machine gets a full-page white flash before the client effect in
 * PublicChrome catches up — the sort of thing that reads as the page being
 * broken rather than merely slow.
 *
 * The script only touches `<html>`; the markup itself is theme-agnostic
 * (Tailwind classes over `--c-*` custom properties), so this is the whole fix.
 */
import { modeBase, type ProjectState } from "@/store/useDesignSystem";
import { modeDefsOf } from "@/store/useDesignSystem";

export function PublicThemeScript({
  semantics,
  primitives,
}: {
  semantics: ProjectState["semantics"];
  primitives: ProjectState["primitives"];
}) {
  // Does this system publish a mode that reads as dark at all? A light-only
  // system stays light no matter what the reader's OS prefers — the page is a
  // document about that system, not a themeable app.
  const hasDark = modeDefsOf(semantics).some(
    (m) => modeBase(semantics, m.id, primitives) === "dark"
  );

  // Serialized boolean, not user input — nothing here crosses from the snapshot.
  const src = `(function(){try{if(${hasDark ? "true" : "false"}&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: src }} />;
}
