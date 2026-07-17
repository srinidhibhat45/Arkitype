/**
 * POST /api/beta-gate — checks a beta-access password server-side so the
 * value never ships in client JS (unlike a client-side string compare,
 * which shows up in the bundle under devtools).
 *
 * Rate-limited per IP (in-memory, single-instance-scoped — fine at alpha
 * scale) so the single shared password can't be brute-forced by a script.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, number[]>();

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(clientKey(req))) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts — try again in a few minutes" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const expected = process.env.BETA_GATE_PASSWORD ?? "";
  const ok = password.length > 0 && expected.length > 0 && password === expected;
  return NextResponse.json({ ok });
}
