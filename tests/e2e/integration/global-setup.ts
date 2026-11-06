import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3101";

  if (!supabaseUrl || !supabaseKey || !supabaseSecret) {
    throw new Error("Set the local Supabase URL, publishable key, and secret key in .env.e2e.local.");
  }
  const supabaseHost = new URL(supabaseUrl).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(supabaseHost)) {
    throw new Error("Integration tests are restricted to a local Supabase instance.");
  }
  if (!paystackSecret?.startsWith("sk_test_")) {
    throw new Error("Integration tests require a Paystack test secret beginning with sk_test_.");
  }
  if (!process.env.PAYSTACK_E2E_CARD_NUMBER || !process.env.PAYSTACK_E2E_CARD_EXPIRY || !process.env.PAYSTACK_E2E_CARD_CVC) {
    throw new Error("Set Paystack's published test card number, expiry, and CVC in .env.e2e.local.");
  }
  const isLoopback = (value: string) => ["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname);
  if (!isLoopback(baseURL)) {
    throw new Error("Integration tests must use a local application URL.");
  }
  if (!isLoopback(process.env.APP_BASE_URL ?? baseURL) || !isLoopback(process.env.PAYSTACK_CALLBACK_URL ?? `${baseURL}/payment/callback`)) {
    throw new Error("PDF rendering and payment callbacks must target the local integration server.");
  }

  const admin = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `cvforge-e2e-${randomUUID()}@example.com`;
  const password = `${randomUUID()}!Aa1`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Could not create the temporary local test user: ${error?.message ?? "No user returned."}`);
  }

  const credentialsPath = resolve("test-results/integration/test-user.json");
  await mkdir(resolve("test-results/integration"), { recursive: true });
  try {
    await writeFile(credentialsPath, JSON.stringify({ email, password }), { flag: "wx" });
  } catch (writeError) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deleteError) throw new Error(`Could not clean up the temporary local test user: ${deleteError.message}`);
    throw writeError;
  }

  return async () => {
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    await unlink(credentialsPath);
    if (deleteError) throw new Error(`Could not remove the temporary local test user: ${deleteError.message}`);
  };
}
