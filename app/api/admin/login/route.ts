import {
  ORNAMENT_ADMIN_COOKIE,
  ORNAMENT_ADMIN_SESSION_MAX_AGE_SECONDS,
  adminSessionCookieOptions,
  createAdminSessionToken,
} from "@/lib/ornaments/admin-auth";
import { ApiError, errorResponse, parseJsonBody } from "@/lib/ornaments/errors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await parseJsonBody(request)) as { secret?: unknown };
    const provided =
      typeof body.secret === "string" ? body.secret.trim() : "";
    const expected = process.env.ORNAMENT_ADMIN_SECRET?.trim();

    if (!expected) {
      throw new ApiError(
        "ORNAMENT_ADMIN_SECRET is not configured",
        503,
        "MISSING_ENV",
      );
    }

    if (!provided || provided !== expected) {
      throw new ApiError("Invalid admin secret", 401, "UNAUTHORIZED");
    }

    const token = createAdminSessionToken(expected);
    const response = NextResponse.json({ ok: true, authenticated: true });
    response.cookies.set(
      ORNAMENT_ADMIN_COOKIE,
      token,
      adminSessionCookieOptions(ORNAMENT_ADMIN_SESSION_MAX_AGE_SECONDS),
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
