"use client";
/**
 * Local font-availability detection — the graceful handling for the one class
 * of font Arkitype can never load on anyone's behalf: a custom font-stack
 * entry (FontPicker's free-text field) that isn't a Google Font. Those only
 * render as chosen wherever that exact family already happens to be
 * installed; everywhere else the browser silently substitutes something else,
 * with nothing on screen to say so. This is the "something else" made visible.
 *
 * Google Fonts and Arkitype's own pre-vetted "system" defaults (see
 * SYSTEM_FONT_NAMES) are never flagged — FontLoader auto-loads the former, and
 * the latter were chosen specifically to degrade gracefully through a real
 * fallback chain. Only a genuinely custom, unvetted family gets checked.
 */
import { useEffect, useState } from "react";
import { isGoogleFont, isSafeFamily, primaryFamilyName } from "@/lib/googleFonts";

export type FontAvailability = "unknown" | "checking" | "available" | "missing";

/**
 * Best-effort check via the CSS Font Loading API. `document.fonts.check()`
 * runs the same family-matching lookup the browser uses to paint text, so —
 * for a family with no `@font-face` behind it — a `false` here means the page
 * really is about to render a fallback, not a synthetic guess. Detection
 * failures (older browsers, no `document.fonts`) resolve to "available":
 * an inability to check is never treated as proof of a missing font.
 */
export function isFontAvailable(family: string): boolean {
  if (typeof document === "undefined" || !("fonts" in document)) return true;
  const name = primaryFamilyName(family);
  if (!name || isSafeFamily(name)) return true;
  try {
    const needsQuotes = /[^a-z0-9-]/i.test(name);
    const token = needsQuotes ? `"${name.replace(/"/g, "")}"` : name;
    return document.fonts.check(`16px ${token}`);
  } catch {
    return true;
  }
}

/**
 * Live availability for one font-role value. Google Fonts and safe/system
 * families resolve to "available" immediately with no check performed — the
 * only thing worth spending a render on is a value nothing else can vouch for.
 */
export function useFontAvailability(family: string): FontAvailability {
  const [status, setStatus] = useState<FontAvailability>("unknown");

  useEffect(() => {
    const name = primaryFamilyName(family);
    if (!name || isGoogleFont(family) || isSafeFamily(name)) {
      setStatus("available");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    const run = () => {
      if (!cancelled) setStatus(isFontAvailable(family) ? "available" : "missing");
    };

    // `document.fonts.ready` settles once every requested font (including a
    // *different* role's in-flight Google Fonts fetch) has resolved. Race a
    // short timeout so one slow role never stalls another's check.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 400))]).then(run);
    } else {
      run();
    }

    return () => {
      cancelled = true;
    };
  }, [family]);

  return status;
}
