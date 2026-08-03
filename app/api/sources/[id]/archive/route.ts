import { assertOrnamentAdmin } from "@/lib/ornaments/admin-auth";
import { archiveCatalogSource } from "@/lib/ornaments/archive-source";
import { errorResponse } from "@/lib/ornaments/errors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertOrnamentAdmin(request);
    const { id } = await context.params;
    const result = await archiveCatalogSource(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
