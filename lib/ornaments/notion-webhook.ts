import { createHmac, timingSafeEqual } from "node:crypto";

export const ORNAMENT_SYNC_DISPATCH_EVENT = "ornament-sync";

const RELEVANT_EVENT_TYPES = new Set([
  "page.created",
  "page.deleted",
  "page.undeleted",
  "page.properties_updated",
  "page.content_updated",
  "page.moved",
  "database.content_updated",
  "data_source.content_updated",
  "data_source.schema_updated",
]);

export function isNotionVerificationPayload(
  body: unknown,
): body is { verification_token: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { verification_token?: unknown }).verification_token === "string"
  );
}

export function isRelevantNotionWebhookEvent(body: unknown) {
  if (typeof body !== "object" || body === null) return false;

  const type = (body as { type?: unknown }).type;
  if (typeof type !== "string") return false;

  return RELEVANT_EVENT_TYPES.has(type);
}

export function verifyNotionWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function dispatchOrnamentSyncWorkflow(input: {
  token: string;
  repository: string;
  clientPayload?: Record<string, unknown>;
}) {
  const response = await fetch(
    `https://api.github.com/repos/${input.repository}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${input.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: ORNAMENT_SYNC_DISPATCH_EVENT,
        client_payload: input.clientPayload ?? {},
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `GitHub repository_dispatch failed (${response.status}): ${details}`,
    );
  }
}
