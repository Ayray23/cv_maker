import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/config";
import { cvDraftSchema } from "@/lib/validation/cv";
import { getOrCreateResumeVersion } from "@/lib/server/resume-version";
import { cvTemplates, normalizeCvDraft } from "@/lib/cv";
import { isPendingCheckoutStale, PENDING_CHECKOUT_STALE_AFTER_MS } from "@/lib/payments/checkout-recovery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured() || !process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in with an email address before checkout." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.resumeId !== "string") return NextResponse.json({ error: "A saved CV is required for checkout." }, { status: 400 });
  const { data: resume } = await session.from("resumes").select("id,title,content,selected_template_id").eq("id", body.resumeId).eq("owner_id", user.id).maybeSingle();
  if (!resume) return NextResponse.json({ error: "CV not found." }, { status: 404 });
  const parsed = cvDraftSchema.safeParse(resume.content);
  if (!parsed.success) return NextResponse.json({ error: "Fix invalid CV content before checkout." }, { status: 400 });
  const template = cvTemplates.find((item) => item.id === resume.selected_template_id);
  if (!template) return NextResponse.json({ error: "Unknown CV template." }, { status: 400 });
  const normalizedDraft = normalizeCvDraft(parsed.data);
  const snapshotTitle = resume.title || "CV";
  const fingerprint = createHash("sha256").update(JSON.stringify({ resumeId: resume.id, title: snapshotTitle, draft: normalizedDraft, templateId: template.id, renderer: "cvforge-v1" })).digest("hex");
  const admin = createAdminClient();
  const { version, error: versionError } = await getOrCreateResumeVersion(admin, { resume_id: resume.id, owner_id: user.id, content_fingerprint: fingerprint, template_id: template.id, renderer_version: "cvforge-v1", title_snapshot: snapshotTitle, content_snapshot: normalizedDraft });
  if (versionError || !version) return NextResponse.json({ error: "Could not prepare this CV version." }, { status: 500 });
  const { data: existingEntitlement, error: entitlementError } = await admin.from("download_entitlements").select("id").eq("owner_id", user.id).eq("version_id", version.id).maybeSingle();
  if (entitlementError) return NextResponse.json({ error: "Could not check this CV version's download access." }, { status: 500 });
  if (existingEntitlement) return NextResponse.json({ error: "This CV version is already available to download." }, { status: 409 });

  const { data: pendingPayment, error: pendingError } = await admin
    .from("payments")
    .select("id,checkout_url,created_at")
    .eq("owner_id", user.id)
    .eq("version_id", version.id)
    .eq("state", "pending")
    .maybeSingle();
  if (pendingError) return NextResponse.json({ error: "Could not check an existing checkout." }, { status: 500 });
  if (pendingPayment?.checkout_url) return NextResponse.json({ authorizationUrl: pendingPayment.checkout_url, reused: true });

  if (pendingPayment) {
    const now = Date.now();
    if (!isPendingCheckoutStale(pendingPayment.created_at, now)) {
      return NextResponse.json(
        { error: "Checkout is still being initialized. Please retry shortly." },
        { status: 409, headers: { "Retry-After": "5" } },
      );
    }

    // Recover abandoned initialization attempts. The age predicate makes this
    // safe against a concurrent request that has already refreshed the row.
    const staleBefore = new Date(now - PENDING_CHECKOUT_STALE_AFTER_MS).toISOString();
    const { data: expiredPayment, error: expireError } = await admin
      .from("payments")
      .update({ state: "failed" })
      .eq("id", pendingPayment.id)
      .eq("state", "pending")
      .is("checkout_url", null)
      .lt("created_at", staleBefore)
      .select("id")
      .maybeSingle();
    if (expireError) return NextResponse.json({ error: "Could not recover the previous checkout. Please retry." }, { status: 503 });

    if (!expiredPayment) {
      const { data: refreshedPayment, error: refreshError } = await admin
        .from("payments")
        .select("checkout_url,state")
        .eq("id", pendingPayment.id)
        .maybeSingle();
      if (refreshError) return NextResponse.json({ error: "Could not refresh the existing checkout." }, { status: 503 });
      if (refreshedPayment?.checkout_url) return NextResponse.json({ authorizationUrl: refreshedPayment.checkout_url, reused: true });
      if (refreshedPayment?.state === "pending") {
        return NextResponse.json({ error: "Checkout is still being initialized. Please retry shortly." }, { status: 409, headers: { "Retry-After": "5" } });
      }
    }
  }

  if (!template.special) {
    const { data: freeEntitlements, error: allowanceError } = await admin.from("download_entitlements").select("id").eq("owner_id", user.id).eq("source", "free");
    if (allowanceError) return NextResponse.json({ error: "Could not check your free download allowance." }, { status: 500 });
    if ((freeEntitlements?.length ?? 0) < 2) return NextResponse.json({ error: "Your free standard downloads are still available." }, { status: 409 });
  }

  const reference = `cvf_${randomUUID().replaceAll("-", "")}`;
  const { data: payment, error: paymentError } = await admin.from("payments").insert({ owner_id: user.id, version_id: version.id, provider: "paystack", provider_reference: reference, amount_minor: 200000, currency: "NGN" }).select("id").single();
  if (paymentError || !payment) {
    const { data: concurrentPayment } = await admin.from("payments").select("checkout_url").eq("owner_id", user.id).eq("version_id", version.id).eq("state", "pending").maybeSingle();
    if (concurrentPayment?.checkout_url) return NextResponse.json({ authorizationUrl: concurrentPayment.checkout_url, reused: true });
    return NextResponse.json({ error: "A checkout is already being initialized. Please retry shortly." }, { status: 409, headers: { "Retry-After": "5" } });
  }

  const origin = process.env.APP_BASE_URL || new URL(request.url).origin;
  const callback = process.env.PAYSTACK_CALLBACK_URL || `${origin}/payment/callback`;
  let response: Response;
  try {
    response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, amount: 200000, currency: "NGN", reference, callback_url: callback, metadata: { payment_id: payment.id, version_id: version.id } }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const { error: failError } = await admin.from("payments").update({ state: "failed" }).eq("id", payment.id).eq("state", "pending");
    console.error("Paystack checkout initialization failed", error);
    return NextResponse.json(
      { error: failError ? "Checkout timed out and could not be marked for recovery. Please retry shortly." : "Paystack could not be reached. You can safely try checkout again." },
      { status: failError ? 503 : 502 },
    );
  }

  const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: { authorization_url?: string } } | null;
  if (!response.ok || !result?.status || !result.data?.authorization_url) {
    await admin.from("payments").update({ state: "failed" }).eq("id", payment.id).eq("state", "pending");
    return NextResponse.json({ error: "Paystack could not start checkout. Please try again." }, { status: 502 });
  }
  const checkoutUrl = result.data.authorization_url;
  if (!checkoutUrl.startsWith("https://checkout.paystack.com/")) {
    await admin.from("payments").update({ state: "failed" }).eq("id", payment.id).eq("state", "pending");
    return NextResponse.json({ error: "Paystack returned an invalid checkout URL." }, { status: 502 });
  }
  const { error: saveUrlError } = await admin.from("payments").update({ checkout_url: checkoutUrl }).eq("id", payment.id).eq("state", "pending");
  if (saveUrlError) {
    await admin.from("payments").update({ state: "failed" }).eq("id", payment.id).eq("state", "pending");
    return NextResponse.json({ error: "Checkout could not be saved. Please start a new checkout." }, { status: 503 });
  }
  return NextResponse.json({ authorizationUrl: checkoutUrl });
}
