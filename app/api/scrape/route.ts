/**
 * POST /api/scrape — "start from an existing site" (MAJOR_OVERHAUL_PLAN.md Phase 2).
 * Fetches a public URL server-side (client-side fetch would hit CORS on most
 * sites), pulls colours from its inline + linked CSS and its dominant font
 * family, and hands them back so the init wizard can seed brand + type. Best
 * effort by nature — an empty result just means "type a hex instead".
 *
 * SSRF note: the URL is user-supplied, so we allow only http/https and refuse
 * localhost / private-range / bare hostnames. This is a local design tool, not a
 * hardened proxy, so the guard is hostname-based rather than post-DNS.
 */
import { NextRequest, NextResponse } from "next/server";
import { hexToRgb, rgbToHex, rgbToHsl } from "@/lib/color";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000; // 2 MB cap per document
const MAX_STYLESHEETS = 4;
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

function normalizeUrl(raw: string): URL | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

/** Refuse anything not clearly a public web host. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (!h.includes(".")) return true; // bare hostnames are usually internal
  // IPv4 private / loopback / link-local ranges.
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html,text/css,*/*" },
      redirect: "follow",
    });
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
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/** All CSS-ish text worth scanning: <style> blocks, style="" attrs, linked sheets. */
async function gatherCss(html: string, pageUrl: URL): Promise<string> {
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
        if (isBlockedHost(abs.hostname)) return "";
        return await fetchText(abs.toString());
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
  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "That host can't be reached from here" }, { status: 400 });
  }

  const html = await fetchText(parsed.toString());
  if (!html) {
    return NextResponse.json({ error: "Couldn't load that site — try another URL" }, { status: 502 });
  }

  const css = await gatherCss(html, parsed);
  const colors = rankColors(css || html, 5);
  const fonts = rankFonts(css || html, 3);

  if (colors.length === 0 && fonts.length === 0) {
    return NextResponse.json(
      { error: "Nothing extractable found — the site may block bots or load styles dynamically" },
      { status: 422 }
    );
  }

  return NextResponse.json({ url: parsed.toString(), colors, fonts });
}
