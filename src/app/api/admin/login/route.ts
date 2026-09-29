import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, isSameOriginRequest, setAdminCookie, verifyAdminCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const failures = new Map<string, { count: number; until: number }>();

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const key = clientKey(request);
  const now = Date.now();
  const current = failures.get(key);
  if (current && current.until > now && current.count >= 6) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username.slice(0, 80) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 256) : "";
    if (!username || !password || !verifyAdminCredentials(username, password)) {
      const next = !current || current.until <= now ? { count: 1, until: now + 15 * 60_000 } : { ...current, count: current.count + 1 };
      failures.set(key, next);
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    failures.delete(key);
    const token = createAdminSession(username);
    if (!token) return NextResponse.json({ error: "Admin access is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
    setAdminCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
