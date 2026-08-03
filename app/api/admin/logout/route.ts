import {
  ORNAMENT_ADMIN_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/ornaments/admin-auth";
import { errorResponse } from "@/lib/ornaments/errors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const response = NextResponse.json({ ok: true, authenticated: false });
    response.cookies.set(ORNAMENT_ADMIN_COOKIE, "", {
      ...adminSessionCookieOptions(0),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
