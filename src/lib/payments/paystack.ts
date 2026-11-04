import { createHmac, timingSafeEqual } from "node:crypto";

export type PaystackCharge = {
  reference?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
};

export function isValidPaystackReference(reference: string) {
  return /^cvf_[a-f0-9]{32}$/.test(reference);
}

export function isValidPaystackSignature(rawBody: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{128}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function isSuccessfulPaystackCharge(data: PaystackCharge | undefined, expectedReference: string) {
  return Boolean(
    data &&
    data.status === "success" &&
    data.reference === expectedReference &&
    Number.isSafeInteger(data.amount) &&
    typeof data.currency === "string" &&
    /^[A-Z]{3}$/.test(data.currency),
  );
}
