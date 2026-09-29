import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE = "silaflix_admin";
const SESSION_SECONDS = 60 * 60 * 12;

type AdminSession = { username: string; expires: number };

function sessionSecret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const encodedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !encodedHash || !sessionSecret()) return false;
  const parts = encodedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const expectedHex = parts[2];
  if (!/^[a-f0-9]{32,128}$/i.test(salt) || !/^[a-f0-9]{64,256}$/i.test(expectedHex)) return false;
  const submittedUser = Buffer.from(username);
  const configuredUser = Buffer.from(expectedUser);
  if (!safeEqual(submittedUser, configuredUser)) return false;
  try {
    const actual = scryptSync(password, Buffer.from(salt, "hex"), expectedHex.length / 2, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return safeEqual(actual, Buffer.from(expectedHex, "hex"));
  } catch {
    return false;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSession(username = process.env.ADMIN_USERNAME || "admin"): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ username, expires: Math.floor(Date.now() / 1000) + SESSION_SECONDS } satisfies AdminSession)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminSession(token: string | null | undefined): AdminSession | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = sign(payload, secret);
  if (!safeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (typeof session.username !== "string" || typeof session.expires !== "number" || session.expires <= Math.floor(Date.now() / 1000)) return null;
    if (session.username !== process.env.ADMIN_USERNAME) return null;
    return session;
  } catch {
    return null;
  }
}

export function isAdminRequest(request: NextRequest | Request): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  return Boolean(verifyAdminSession(token ? decodeURIComponent(token) : null));
}

export function setAdminCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isSameOriginRequest(request: NextRequest | Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
