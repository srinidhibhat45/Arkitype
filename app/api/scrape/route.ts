/**
 * POST /api/scrape — "start from an existing site" (MAJOR_OVERHAUL_PLAN.md Phase 2).
 * Fetches a public URL server-side (client-side fetch would hit CORS on most
 * sites), pulls colours from its inline + linked CSS and its dominant font
 * family, and hands them back so the init wizard can seed brand + type. Best
 * effort by nature — an empty result just means "type a hex instead".
 *
 * SSRF hardening: this endpoint fetches a URL the client supplies, so it's a
 * classic SSRF surface (internal network probing, cloud metadata access via
 * DNS rebinding, use as an anonymous HTTP proxy). Three layers:
 *  1. Auth required — only callers with a valid Supabase session may call it
 *     at all, so it's not reachable by the open internet.
 *  2. Per-user rate limit — bounds proxy/probing abuse even from a real account.
 *  3. IP-level connection pinning — every real socket connection (including
 *     each redirect hop) is resolved and validated against private/reserved
 *     ranges via a custom `undici` dispatcher `lookup`, not just a hostname
 *     string check before the first request. This is what actually closes the
 *     DNS-rebinding gap: a hostname-only pre-check can't catch a domain whose
 *     DNS answer changes between the check and the connect.
 */
import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { hexToRgb, rgbToHex, rgbToHsl } from "@/lib/color";
import { supabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000; // 2 MB cap per document
const MAX_STYLESHEETS = 4;
const MAX_REDIRECTS = 5;
const UA =
  "Mozilla/5.0 (compatible; ArkitypeBot/1.0; +https://arkitype.app) design-token-scraper";

const GENERIC_FONTS = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "cursive",
  "fantasy",
  "inherit",
  "initial",
  "unset",
  "revert",
  "emoji",
  "math",
]);

// ─── auth ──────────────────────────────────────────────────────────────────

async function requireUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// ─── rate limit (per user, in-memory sliding window) ────────────────────────
// Single-instance-scoped by design — fine at alpha scale. Resets on deploy;
// doesn't share state across serverless instances. Good enough to stop casual
// proxy/probing abuse from an authenticated account without new infra.

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > RATE_LIMIT_MAX;
}

// ─── SSRF-safe networking ────────────────────────────────────────────────────

function normalizeUrl(raw: string): URL | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

/** Cheap pre-filter on the hostname string — real enforcement is the IP check below. */
function looksBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (!h.includes(".") && h !== "::1") return true; // bare hostnames are usually internal
  return false;
}

/** The real guard: is this resolved address private, loopback, link-local, or otherwise reserved? */
function isUnsafeAddress(address: string, family: number): boolean {
  if (family === 4) {
    const m = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return true;
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF special-purpose
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast (224+) / reserved (240+) / broadcast
    return false;
  }
  // IPv6
  const lower = address.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    return v4.includes(".") ? isUnsafeAddress(v4, 4) : true;
  }
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique local
  return false;
}

/**
 * True if this URL must never be connected to. Two layers, because Node's
 * socket layer only invokes a custom DNS `lookup` when the host is an actual
 * hostname — for a URL whose host is *already* an IP literal (e.g.
 * `http://127.0.0.1/`), no DNS resolution ever happens, so the lookup-based
 * guard below silently never fires for it. This layer catches that case
 * directly; the lookup guard catches the hostname-resolves-to-private-IP case
 * (including DNS rebinding, where the address changes between check and
 * connect) that this layer can't.
 */
function isUrlUnsafe(url: URL): boolean {
  if (looksBlocked(url.hostname)) return true;
  const bare = url.hostname.startsWith("[") && url.hostname.endsWith("]") ? url.hostname.slice(1, -1) : url.hostname;
  const family = net.isIP(bare);
  if (family) return isUnsafeAddress(bare, family);
  return false;
}

/** Dispatcher whose connect-time DNS lookup rejects any address that isn't public. */
function createSafeAgent(): Agent {
  return new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { all: true, verbatim: true }, (err, result) => {
          if (err) return callback(err, [] as never);
          const addresses = Array.isArray(result) ? result : [result];
          const safe = addresses.filter((a) => !isUnsafeAddress(a.address, a.family));
          if (safe.length === 0) {
            callback(new Error(`Refused: ${hostname} has no public address`), [] as never);
            return;
          }
          callback(null, safe as never);
        });
      },
    },
  });
}

/**
 * Fetches with redirects followed manually (not `redirect: "follow"`) so every
 * hop's target — not just the first URL — passes both SSRF layers above
 * before it's connected to.
 */
async function fetchText(startUrl: string, agent: Agent): Promise<string> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let target: URL;
    try {
      target = new URL(current);
    } catch {
      return "";
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") return "";
    if (isUrlUnsafe(target)) return "";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      res = await undiciFetch(target.toString(), {
        signal: controller.signal,
        headers: { "user-agent": UA, accept: "text/html,text/css,*/*" },
        redirect: "manual",
        dispatcher: agent,
      });
    } catch {
      return "";
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return "";
      try {
        current = new URL(location, target).toString();
      } catch {
        return "";
      }
      continue; // re-validated at the top of the loop
    }

    if (!res.ok || !res.body) return "";
    // Cap how much we read so a huge asset can't blow up memory.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let out = "";
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (total >= MAX_BYTES) {
        void reader.cancel();
        break;
      }
    }
    return out;
  }
  return ""; // too many redirects
}

/** All CSS-ish text worth scanning: <style> blocks, style="" attrs, linked sheets. */
async function gatherCss(html: string, pageUrl: URL, agent: Agent): Promise<string> {
  const parts: string[] = [];

  for (const m of Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))) parts.push(m[1]);
  for (const m of Array.from(html.matchAll(/style\s*=\s*["']([^"']+)["']/gi))) parts.push(m[1]);

  const hrefs: string[] = [];
  for (const m of Array.from(html.matchAll(/<link\b[^>]*>/gi))) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) hrefs.push(href);
  }

  const sheets = await Promise.all(
    hrefs.slice(0, MAX_STYLESHEETS).map(async (href) => {
      try {
        const abs = new URL(href, pageUrl);
        if (abs.protocol !== "http:" && abs.protocol !== "https:") return "";
        if (isUrlUnsafe(abs)) return "";
        return await fetchText(abs.toString(), agent);
      } catch {
        return "";
      }
    })
  );
  parts.push(...sheets);

  return parts.join("\n");
}

interface Swatch {
  hex: string;
  score: number;
}

function rankColors(css: string, count: number): string[] {
  const tally = new Map<string, { r: number; g: number; b: number; n: number }>();
  const add = (rgb: { r: number; g: number; b: number } | null) => {
    if (!rgb) return;
    const key = `${rgb.r >> 3}-${rgb.g >> 3}-${rgb.b >> 3}`; // 32-level grid
    const bucket = tally.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += rgb.r;
    bucket.g += rgb.g;
    bucket.b += rgb.b;
    bucket.n += 1;
    tally.set(key, bucket);
  };

  for (const m of Array.from(css.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g))) add(hexToRgb(`#${m[1]}`));
  for (const m of Array.from(css.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi))) {
    add({ r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) });
  }

  const swatches: Swatch[] = [];
  for (const b of Array.from(tally.values())) {
    const rgb = { r: b.r / b.n, g: b.g / b.n, b: b.b / b.n };
    const { s, l } = rgbToHsl(rgb);
    if (l > 92 || l < 8 || s < 12) continue; // weak brand seeds — same thresholds as logo extraction
    swatches.push({ hex: rgbToHex(rgb), score: b.n * (1 + s / 100) });
  }
  return swatches
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.hex);
}

/**
 * Families loaded via a Google Fonts stylesheet URL — the highest-signal font
 * source a page can offer: the family name is canonical (no self-hosted alias)
 * and guaranteed loadable in the builder.
 */
function googleFontFamilies(html: string): string[] {
  const out: string[] = [];
  for (const m of Array.from(html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>)]+)/gi))) {
    const qs = m[1].replace(/&amp;/g, "&");
    for (const fm of Array.from(qs.matchAll(/family=([^&:;]+)/gi))) {
      const family = decodeURIComponent(fm[1].replace(/\+/g, " ")).trim();
      if (family) out.push(family);
    }
  }
  return Array.from(new Set(out));
}

function rankFonts(css: string, count: number): string[] {
  const tally = new Map<string, { display: string; n: number }>();
  for (const m of Array.from(css.matchAll(/font-family\s*:\s*([^;}{]+)/gi))) {
    const first = m[1].split(",")[0]?.trim().replace(/^["']|["']$/g, "");
    if (!first) continue;
    const key = first.toLowerCase();
    if (GENERIC_FONTS.has(key) || key.startsWith("var(") || /^\d/.test(key)) continue;
    const bucket = tally.get(key) ?? { display: first, n: 0 };
    bucket.n += 1;
    tally.set(key, bucket);
  }
  return Array.from(tally.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((f) => f.display);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to import from a live site" }, { status: 401 });
  }
  if (isRateLimited(userId)) {
    return NextResponse.json({ error: "Too many imports — try again in a few minutes" }, { status: 429 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = body.url ? normalizeUrl(body.url) : null;
  if (!parsed) return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 });
  }
  if (isUrlUnsafe(parsed)) {
    return NextResponse.json({ error: "That host can't be reached from here" }, { status: 400 });
  }

  const agent = createSafeAgent();
  try {
    const html = await fetchText(parsed.toString(), agent);
    if (!html) {
      return NextResponse.json({ error: "Couldn't load that site — try another URL" }, { status: 502 });
    }

    const css = await gatherCss(html, parsed, agent);
    const colors = rankColors(css || html, 5);
    // Google-Fonts-linked families lead (canonical + loadable), CSS-derived ones follow.
    const linked = googleFontFamilies(html);
    const ranked = rankFonts(css || html, 3);
    const fonts = Array.from(new Set([...linked, ...ranked])).slice(0, 4);

    if (colors.length === 0 && fonts.length === 0) {
      return NextResponse.json(
        { error: "Nothing extractable found — the site may block bots or load styles dynamically" },
        { status: 422 }
      );
    }

    return NextResponse.json({ url: parsed.toString(), colors, fonts });
  } finally {
    void agent.close();
  }
}
