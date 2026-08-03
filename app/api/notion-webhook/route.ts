import { ApiError, errorResponse } from "@/lib/ornaments/errors";
import {
  dispatchOrnamentSyncWorkflow,
  isNotionVerificationPayload,
  isRelevantNotionWebhookEvent,
  verifyNotionWebhookSignature,
} from "@/lib/ornaments/notion-webhook";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ApiError(`${name} is not configured`, 500, "MISSING_ENV");
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: unknown = {};

    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody) as unknown;
      } catch {
        throw new ApiError("Invalid JSON body", 400, "INVALID_JSON");
      }
    }

    if (isNotionVerificationPayload(body)) {
      console.info(
        "[ornaments] Notion webhook verification token received. Paste it into the Notion integration webhook settings, then set NOTION_WEBHOOK_SECRET to the same value.",
      );
      console.info(
        `[ornaments] verification_token=${body.verification_token}`,
      );

      return NextResponse.json({
        ok: true,
        verification_token: body.verification_token,
      });
    }

    const secret = requireEnv("NOTION_WEBHOOK_SECRET");
    const signature = request.headers.get("x-notion-signature");

    if (!verifyNotionWebhookSignature(rawBody, signature, secret)) {
      throw new ApiError("Invalid Notion webhook signature", 401, "INVALID_SIGNATURE");
    }

    if (!isRelevantNotionWebhookEvent(body)) {
      return NextResponse.json({ ok: true, dispatched: false, reason: "ignored_event" });
    }

    const token = requireEnv("GITHUB_DISPATCH_TOKEN");
    const repository =
      process.env.GITHUB_REPOSITORY?.trim() || "jmfrnsn/ornament-catalog";

    await dispatchOrnamentSyncWorkflow({
      token,
      repository,
      clientPayload: {
        source: "notion-webhook",
        type:
          typeof body === "object" && body && "type" in body
            ? String((body as { type: unknown }).type)
            : "unknown",
      },
    });

    return NextResponse.json({ ok: true, dispatched: true });
  } catch (error) {
    return errorResponse(error);
  }
}
