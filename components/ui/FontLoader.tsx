"use client";
/**
 * FontLoader — mounted once at the app root.
 * Builds a single batched Google Fonts stylesheet URL from all active font
 * roles and injects/updates a <link> tag in <head>. When the user picks a
 * new font the URL updates, triggering the browser to fetch only the delta.
 */
import { useEffect } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { buildGoogleFontUrl } from "@/lib/googleFonts";

const LINK_ID = "ark-google-fonts";

export function FontLoader() {
  const fontRoles = useDesignSystem((s) => s.primitives.typography.fontRoles);

  useEffect(() => {
    const families = Object.values(fontRoles).map((r) => r.family);
    const url = buildGoogleFontUrl(families);

    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;

    if (!url) {
      // No Google Fonts needed — remove any existing link
      if (link) link.remove();
      return;
    }

    if (!link) {
      // Create a new preconnect + the font link
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect);

      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "anonymous";
      document.head.appendChild(preconnect2);

      link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    if (link.href !== url) {
      link.href = url;
    }
  }, [fontRoles]);

  return null;
}
