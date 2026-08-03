import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  isNotionVerificationPayload,
  isRelevantNotionWebhookEvent,
  verifyNotionWebhookSignature,
} from "./notion-webhook";

test("notion webhook verification payload detection", () => {
  assert.equal(
    isNotionVerificationPayload({ verification_token: "secret_abc" }),
    true,
  );
  assert.equal(isNotionVerificationPayload({ type: "page.created" }), false);
});

test("notion webhook event filtering", () => {
  assert.equal(isRelevantNotionWebhookEvent({ type: "page.created" }), true);
  assert.equal(
    isRelevantNotionWebhookEvent({ type: "page.properties_updated" }),
    true,
  );
  assert.equal(isRelevantNotionWebhookEvent({ type: "comment.created" }), false);
});

test("notion webhook signature verification", () => {
  const body = '{"type":"page.created"}';
  const secret = "secret_test";
  const digest = createHmac("sha256", secret).update(body).digest("hex");

  assert.equal(
    verifyNotionWebhookSignature(body, `sha256=${digest}`, secret),
    true,
  );
  assert.equal(
    verifyNotionWebhookSignature(body, "sha256=deadbeef", secret),
    false,
  );
});
