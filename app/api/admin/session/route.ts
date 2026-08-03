import { isOrnamentAdminAuthenticated } from "@/lib/ornaments/admin-auth";
import { errorResponse } from "@/lib/ornaments/errors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      authenticated: isOrnamentAdminAuthenticated(request),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
