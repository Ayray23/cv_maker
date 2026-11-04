import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { isSuccessfulPaystackCharge, isValidPaystackSignature } from "@/lib/payments/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !isSupabaseAdminConfigured()) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!isValidPaystackSignature(raw, signature, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event: { event?: string; data?: { reference?: unknown; status?: unknown; amount?: unknown; currency?: unknown } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (event.event !== "charge.success") return NextResponse.json({ received: true });
  const reference = typeof event.data?.reference === "string" ? event.data.reference : "";
  if (!isSuccessfulPaystackCharge(event.data, reference)) {
    return NextResponse.json({ error: "Incomplete successful-payment event." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: recorded, error } = await admin.rpc("record_verified_paystack_payment", { p_reference: reference, p_amount_minor: event.data?.amount as number, p_currency: event.data?.currency as string });
  if (error) return NextResponse.json({ error: "Could not record verified payment." }, { status: 500 });
  if (!["processed", "already_processed"].includes(recorded)) {
    return NextResponse.json({ error: "Payment reference or amount did not match an expected checkout." }, { status: 409 });
  }
  return NextResponse.json({ received: true });
}
