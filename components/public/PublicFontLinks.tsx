/**
 * Google Fonts <link>s for a published styleguide — the published-route
 * counterpart to components/ui/FontLoader.tsx, which only mounts inside the
 * editor (app/page.tsx). Without this, a published page rendered every font
 * role as a bare `font-family` value with nothing on the page to ever load
 * it, so any visitor who didn't already have that exact font installed saw a
 * silent fallback — every published styleguide, for every font, for every
 * reader who hadn't independently installed it.
 *
 * Server Component, deliberately not "use client": Next.js hoists <link>
 * elements rendered anywhere in the tree into <head>, so the stylesheet is
 * discoverable in the initial HTML rather than added after hydration.
 */
import { buildGoogleFontUrl } from "@/lib/googleFonts";
import type { ProjectState } from "@/store/useDesignSystem";

export function PublicFontLinks({
  fontRoles,
}: {
  fontRoles: ProjectState["primitives"]["typography"]["fontRoles"];
}) {
  const url = buildGoogleFontUrl(Object.values(fontRoles).map((r) => r.family));
  if (!url) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={url} />
    </>
  );
}
