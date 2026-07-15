/**
 * POST /api/beta-gate — checks a beta-access password server-side so the
 * value never ships in client JS (unlike a client-side string compare,
 * which shows up in the bundle under devtools).
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const expected = process.env.BETA_GATE_PASSWORD ?? "";
  const ok = password.length > 0 && expected.length > 0 && password === expected;
  return NextResponse.json({ ok });
}
