import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "./errors";

export const ORNAMENT_ADMIN_COOKIE = "ornament_admin";
export const ORNAMENT_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function getAdminSecret() {
  const secret = process.env.ORNAMENT_ADMIN_SECRET?.trim();

  if (!secret) {
    throw new ApiError(
      "ORNAMENT_ADMIN_SECRET is not configured",
      503,
      "MISSING_ENV",
    );
  }

  return secret;
}

function signSession(expiresAt: number, secret: string) {
  return createHmac("sha256", secret)
    .update(`ornament-admin:${expiresAt}`)
    .digest("hex");
}

export function createAdminSessionToken(
  secret = getAdminSecret(),
  maxAgeSeconds = ORNAMENT_ADMIN_SESSION_MAX_AGE_SECONDS,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return `${expiresAt}.${signSession(expiresAt, secret)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined | null,
  secret = process.env.ORNAMENT_ADMIN_SECRET?.trim(),
) {
  if (!token || !secret) return false;

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = signSession(expiresAt, secret);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return {};

  return Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [rawName, ...rest] = part.trim().split("=");
      return [rawName, decodeURIComponent(rest.join("="))];
    }),
  );
}

export function readAdminSessionToken(request: Request) {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies[ORNAMENT_ADMIN_COOKIE];
}

export function isOrnamentAdminAuthenticated(request: Request) {
  try {
    const secret = getAdminSecret();
    const authorization = request.headers.get("authorization");
    const bearer = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;
    const headerSecret = request.headers.get("x-ornament-admin-secret")?.trim();

    if (bearer === secret || headerSecret === secret) {
      return true;
    }

    return verifyAdminSessionToken(readAdminSessionToken(request), secret);
  } catch (error) {
    if (error instanceof ApiError && error.code === "MISSING_ENV") {
      return false;
    }
    throw error;
  }
}

export function assertOrnamentAdmin(request: Request) {
  const secret = getAdminSecret();

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const headerSecret = request.headers.get("x-ornament-admin-secret")?.trim();

  if (bearer === secret || headerSecret === secret) {
    return;
  }

  if (verifyAdminSessionToken(readAdminSessionToken(request), secret)) {
    return;
  }

  throw new ApiError("Admin session required", 401, "UNAUTHORIZED");
}

export function adminSessionCookieOptions(maxAgeSeconds = ORNAMENT_ADMIN_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
