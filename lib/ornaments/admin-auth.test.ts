import assert from "node:assert/strict";
import test from "node:test";

import {
  ORNAMENT_ADMIN_COOKIE,
  assertOrnamentAdmin,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./admin-auth";
import { ApiError } from "./errors";

test("assertOrnamentAdmin requires configured secret", () => {
  const previous = process.env.ORNAMENT_ADMIN_SECRET;
  delete process.env.ORNAMENT_ADMIN_SECRET;

  assert.throws(
    () => assertOrnamentAdmin(new Request("http://localhost/test")),
    (error: unknown) =>
      error instanceof ApiError &&
      error.code === "MISSING_ENV" &&
      error.status === 503,
  );

  if (previous === undefined) {
    delete process.env.ORNAMENT_ADMIN_SECRET;
  } else {
    process.env.ORNAMENT_ADMIN_SECRET = previous;
  }
});

test("assertOrnamentAdmin accepts bearer, header, and session cookie", () => {
  const previous = process.env.ORNAMENT_ADMIN_SECRET;
  process.env.ORNAMENT_ADMIN_SECRET = "test-secret";

  assert.doesNotThrow(() =>
    assertOrnamentAdmin(
      new Request("http://localhost/test", {
        headers: { Authorization: "Bearer test-secret" },
      }),
    ),
  );

  assert.doesNotThrow(() =>
    assertOrnamentAdmin(
      new Request("http://localhost/test", {
        headers: { "x-ornament-admin-secret": "test-secret" },
      }),
    ),
  );

  const token = createAdminSessionToken("test-secret");
  assert.equal(verifyAdminSessionToken(token, "test-secret"), true);

  assert.doesNotThrow(() =>
    assertOrnamentAdmin(
      new Request("http://localhost/test", {
        headers: { cookie: `${ORNAMENT_ADMIN_COOKIE}=${token}` },
      }),
    ),
  );

  assert.throws(
    () =>
      assertOrnamentAdmin(
        new Request("http://localhost/test", {
          headers: { Authorization: "Bearer wrong" },
        }),
      ),
    (error: unknown) =>
      error instanceof ApiError &&
      error.code === "UNAUTHORIZED" &&
      error.status === 401,
  );

  if (previous === undefined) {
    delete process.env.ORNAMENT_ADMIN_SECRET;
  } else {
    process.env.ORNAMENT_ADMIN_SECRET = previous;
  }
});

test("verifyAdminSessionToken rejects expired or tampered tokens", () => {
  const previous = process.env.ORNAMENT_ADMIN_SECRET;
  process.env.ORNAMENT_ADMIN_SECRET = "test-secret";

  const expired = createAdminSessionToken("test-secret", -10);
  assert.equal(verifyAdminSessionToken(expired, "test-secret"), false);
  assert.equal(
    verifyAdminSessionToken("9999999999.not-a-real-signature", "test-secret"),
    false,
  );

  if (previous === undefined) {
    delete process.env.ORNAMENT_ADMIN_SECRET;
  } else {
    process.env.ORNAMENT_ADMIN_SECRET = previous;
  }
});
