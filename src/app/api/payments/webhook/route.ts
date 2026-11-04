import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !isSupabaseAdminConfigured()) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event: { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (event.event !== "charge.success") return NextResponse.json({ received: true });
  if (!event.data?.reference || event.data.status !== "success" || !Number.isInteger(event.data.amount) || !event.data.currency) {
    return NextResponse.json({ error: "Incomplete successful-payment event." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: recorded, error } = await admin.rpc("record_verified_paystack_payment", { p_reference: event.data.reference, p_amount_minor: event.data.amount, p_currency: event.data.currency });
  if (error) return NextResponse.json({ error: "Could not record verified payment." }, { status: 500 });
  if (!["processed", "already_processed"].includes(recorded)) {
    return NextResponse.json({ error: "Payment reference or amount did not match an expected checkout." }, { status: 409 });
  }
  return NextResponse.json({ received: true });
}
