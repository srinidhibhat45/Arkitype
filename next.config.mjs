const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "";
  }
})();

// Defense-in-depth only — RLS is the real data boundary (see sql/arkitype_schema.sql).
// Kept permissive enough not to break next/font, Google Fonts (user-picked preview
// fonts), Google Analytics, and Supabase auth/data — all real, in-use origins.
// 'unsafe-eval' is dev-only: next dev's HMR wraps modules in eval() for fast
// refresh; the production build doesn't need it, so it's dropped there.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : ""} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
]
  .join("; ")
  .replace(/\s+/g, " ")
  .trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
