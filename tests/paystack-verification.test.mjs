import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  isSuccessfulPaystackCharge,
  isValidPaystackReference,
  isValidPaystackSignature,
} from "../src/lib/payments/paystack.ts";

const secret = "sk_test_cvforge_unit_test_secret";
const rawBody = JSON.stringify({
  event: "charge.success",
  data: { reference: `cvf_${"a".repeat(32)}`, status: "success", amount: 200000, currency: "NGN" },
});
const signature = createHmac("sha512", secret).update(rawBody).digest("hex");

test("accepts only CVForge-generated payment references", () => {
  assert.equal(isValidPaystackReference(`cvf_${"a".repeat(32)}`), true);
  assert.equal(isValidPaystackReference("cvf_short"), false);
  assert.equal(isValidPaystackReference(`other_${"a".repeat(32)}`), false);
  assert.equal(isValidPaystackReference(`cvf_${"A".repeat(32)}`), false);
});

test("validates Paystack HMAC signatures against the exact raw request body", () => {
  assert.equal(isValidPaystackSignature(rawBody, signature, secret), true);
  assert.equal(isValidPaystackSignature(rawBody + " ", signature, secret), false);
  assert.equal(isValidPaystackSignature(rawBody, "invalid", secret), false);
  assert.equal(isValidPaystackSignature(rawBody, signature, ""), false);
});

test("accepts a successful charge only for the expected reference and valid amount/currency fields", () => {
  const charge = { reference: `cvf_${"a".repeat(32)}`, status: "success", amount: 200000, currency: "NGN" };
  assert.equal(isSuccessfulPaystackCharge(charge, charge.reference), true);
  assert.equal(isSuccessfulPaystackCharge({ ...charge, reference: "another-reference" }, charge.reference), false);
  assert.equal(isSuccessfulPaystackCharge({ ...charge, status: "failed" }, charge.reference), false);
  assert.equal(isSuccessfulPaystackCharge({ ...charge, amount: 200000.5 }, charge.reference), false);
  assert.equal(isSuccessfulPaystackCharge({ ...charge, amount: Number.MAX_SAFE_INTEGER + 1 }, charge.reference), false);
  assert.equal(isSuccessfulPaystackCharge({ ...charge, currency: "Naira" }, charge.reference), false);
  assert.equal(isSuccessfulPaystackCharge(undefined, charge.reference), false);
});
