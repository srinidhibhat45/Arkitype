import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** Web app manifest — installability plus the name/theme search surfaces read. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    // Matches --c-ink / the shipped light default in app/globals.css.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // Sizes are the files' real dimensions — a manifest that lies about them
    // gets the icon rejected rather than resized.
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
