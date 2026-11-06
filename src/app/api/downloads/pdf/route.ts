import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/config";
import { cvTemplates, normalizeCvDraft } from "@/lib/cv";
import { cvDraftSchema } from "@/lib/validation/cv";
import { getOrCreateResumeVersion } from "@/lib/server/resume-version";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) return NextResponse.json({ error: "Configure Supabase cloud storage before downloading." }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.resumeId !== "string") return NextResponse.json({ error: "A saved CV is required." }, { status: 400 });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download your CV." }, { status: 401 });
  const { data: resume } = await session.from("resumes").select("id,title,content,selected_template_id").eq("id", body.resumeId).eq("owner_id", user.id).maybeSingle();
  if (!resume) return NextResponse.json({ error: "CV not found." }, { status: 404 });
  const parsed = cvDraftSchema.safeParse(resume.content);
  if (!parsed.success) return NextResponse.json({ error: "CV data is invalid." }, { status: 400 });
  const template = cvTemplates.find((item) => item.id === resume.selected_template_id);
  if (!template) return NextResponse.json({ error: "Unknown CV template." }, { status: 400 });
  const admin = createAdminClient();
  const normalizedDraft = normalizeCvDraft(parsed.data);
  const snapshotTitle = resume.title || "CV";
  const fingerprint = createHash("sha256").update(JSON.stringify({ resumeId: resume.id, title: snapshotTitle, draft: normalizedDraft, templateId: template.id, renderer: "cvforge-v1" })).digest("hex");
  const { version, error: versionError } = await getOrCreateResumeVersion(admin, { resume_id: resume.id, owner_id: user.id, content_fingerprint: fingerprint, template_id: template.id, renderer_version: "cvforge-v1", title_snapshot: snapshotTitle, content_snapshot: normalizedDraft });
  if (versionError || !version) return NextResponse.json({ error: "Could not prepare this CV version." }, { status: 500 });
  const { data: entitlement } = await admin.from("download_entitlements").select("id").eq("owner_id", user.id).eq("version_id", version.id).maybeSingle();
  if (!entitlement && template.special) return NextResponse.json({ error: "This template requires checkout.", paymentRequired: true }, { status: 402 });
  try {
    const chromiumPackage = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    const chromium = chromiumPackage.default;
    const localChrome = process.env.CHROME_EXECUTABLE_PATH;
    const executablePath = localChrome || await chromium.executablePath();
    const browser = await puppeteer.default.launch({ args: localChrome ? ["--no-sandbox", "--disable-setuid-sandbox"] : chromium.args, executablePath, headless: true });
    try {
      const page = await browser.newPage();
      const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;
      const cookieStore = await cookies();
      await page.setCookie(...cookieStore.getAll().map(({ name, value }) => ({ name, value, url: baseUrl })));
      await page.goto(`${baseUrl}/print/version/${version.id}`, { waitUntil: "networkidle0", timeout: 30000 });
      await page.emulateMediaType("print");
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      if (pdf.byteLength < 1500) throw new Error("PDF rendering returned an empty document.");
      if (!entitlement) {
        const { data: claim, error } = await admin.rpc("claim_free_download", { p_owner_id: user.id, p_version_id: version.id, p_idempotency_key: randomUUID() });
        if (error) throw new Error("Could not reserve the free download entitlement.");
        if (claim === "payment_required") return NextResponse.json({ error: "Your two free standard downloads have been used.", paymentRequired: true }, { status: 402 });
        if (!(["granted", "existing"].includes(claim))) throw new Error("Could not authorize this download.");
      }
      const filename = (version.title_snapshot || "CV").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "CV";
      return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "private, no-store" } });
    } finally { await browser.close(); }
  } catch (error) {
    console.error("CV PDF export failed", error);
    return NextResponse.json({ error: "PDF export could not start. Configure Chromium for this deployment and try again." }, { status: 503 });
  }
}
