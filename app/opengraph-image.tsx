import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * The social card, generated rather than checked in as a PNG — a static image
 * would need re-exporting every time the positioning copy changes, and would
 * quietly go stale instead of failing loudly.
 *
 * Deliberately uses no custom font and no external asset: ImageResponse would
 * have to fetch either at request time, and a social card that depends on a
 * network hop is a social card that intermittently doesn't render.
 * Next serves this for Twitter too when no twitter-image is present.
 */
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The default ramp the builder opens on — the card shows real output. */
const SWATCHES = ["#e0e7ff", "#a5b4fc", "#6366f1", "#4338ca", "#1e1b4b"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#6366f1",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            a
          </div>
          <div style={{ color: "#fafafa", fontSize: 30, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#fafafa",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div style={{ color: "#a1a1aa", fontSize: 30, marginTop: 24, maxWidth: 860 }}>
            One brand colour → tokens, 53 components, a Figma bundle, and a hosted styleguide.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {SWATCHES.map((hex) => (
              <div key={hex} style={{ width: 96, height: 40, borderRadius: 8, background: hex }} />
            ))}
          </div>
          <div style={{ color: "#71717a", fontSize: 24 }}>arkitype.srinidhibhat.com</div>
        </div>
      </div>
    ),
    size
  );
}
