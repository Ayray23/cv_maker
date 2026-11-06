import test from "node:test";
import assert from "node:assert/strict";
import { isPendingCheckoutStale, PENDING_CHECKOUT_STALE_AFTER_MS } from "../src/lib/payments/checkout-recovery.ts";

test("keeps a recently-created checkout initialization pending", () => {
  const now = Date.parse("2026-11-06T12:00:00.000Z");
  const createdAt = new Date(now - PENDING_CHECKOUT_STALE_AFTER_MS + 1).toISOString();
  assert.equal(isPendingCheckoutStale(createdAt, now), false);
});

test("marks a checkout initialization stale at the recovery boundary", () => {
  const now = Date.parse("2026-11-06T12:00:00.000Z");
  const createdAt = new Date(now - PENDING_CHECKOUT_STALE_AFTER_MS).toISOString();
  assert.equal(isPendingCheckoutStale(createdAt, now), true);
});

test("marks older checkout initialization attempts stale", () => {
  const now = Date.parse("2026-11-06T12:00:00.000Z");
  const createdAt = new Date(now - PENDING_CHECKOUT_STALE_AFTER_MS - 1).toISOString();
  assert.equal(isPendingCheckoutStale(createdAt, now), true);
});

test("does not expire a future-dated pending initialization", () => {
  const now = Date.parse("2026-11-06T12:00:00.000Z");
  assert.equal(isPendingCheckoutStale(new Date(now + 60_000).toISOString(), now), false);
});

test("treats an invalid creation timestamp as stale rather than blocking checkout forever", () => {
  assert.equal(isPendingCheckoutStale("not-a-date", Date.now()), true);
});
