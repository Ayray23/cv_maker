import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/config";
import { isSuccessfulPaystackCharge, isValidPaystackReference } from "@/lib/payments/paystack";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured() || !process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to verify your payment." }, { status: 401 });
  const { reference } = await params;
  if (!isValidPaystackReference(reference)) return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("id,owner_id,version_id,amount_minor,currency,state").eq("provider_reference", reference).eq("owner_id", user.id).maybeSingle();
  if (!payment) return NextResponse.json({ error: "Payment reference not found." }, { status: 404 });
  if (payment.state === "succeeded") return NextResponse.json({ ok: true });
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: "no-store" });
  const result = await response.json().catch(() => null) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; reference?: string } } | null;
  if (!response.ok || !result?.status || !result.data || result.data.reference !== reference) {
    return NextResponse.json({ error: "Paystack has not confirmed this payment yet." }, { status: 402 });
  }
  if (result.data.status === "failed" || result.data.status === "abandoned") {
    await admin.from("payments").update({ state: "failed" }).eq("id", payment.id).eq("state", "pending");
    return NextResponse.json({ error: "This payment was not completed. You can start checkout again." }, { status: 402 });
  }
  if (result.data.status !== "success") {
    return NextResponse.json({ error: "Payment is still processing. Check again shortly." }, { status: 202 });
  }
  if (!isSuccessfulPaystackCharge(result.data, reference)) {
    return NextResponse.json({ error: "Paystack returned an invalid successful-payment record." }, { status: 409 });
  }
  const { data: recorded, error } = await admin.rpc("record_verified_paystack_payment", { p_reference: reference, p_amount_minor: result.data.amount as number, p_currency: result.data.currency as string });
  if (error || !["processed", "already_processed"].includes(recorded)) return NextResponse.json({ error: "Payment could not be confirmed against the expected price." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
