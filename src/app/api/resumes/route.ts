import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resumeSyncSchema } from "@/lib/validation/cv";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { initialCvDraft } from "@/lib/cv";

export const runtime = "nodejs";
const MAX_SYNC_BYTES = 2 * 1024 * 1024;

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to access cloud CVs." }, { status: 401 });

  const { data, error } = await supabase.from("resumes").select("id,title,content,selected_template_id,updated_at").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load your CVs." }, { status: 500 });
  return NextResponse.json({ resumes: data });
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to sync CVs." }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SYNC_BYTES) return NextResponse.json({ error: "This CV sync is too large. Reduce the amount of content and try again." }, { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_SYNC_BYTES) return NextResponse.json({ error: "This CV sync is too large. Reduce the amount of content and try again." }, { status: 413 });
  let body: unknown = null;
  try { body = JSON.parse(rawBody); } catch { /* Invalid JSON is handled by the schema response below. */ }
  const parsed = resumeSyncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "CV data is invalid.", details: parsed.error.flatten() }, { status: 400 });

  const rows = parsed.data.resumes.map(({ id, title, templateId, draft }) => ({ id, owner_id: user.id, title, selected_template_id: templateId, content: draft }));
  if (rows.length === 0) return NextResponse.json({ ok: true });
  const { error } = await supabase.from("resumes").upsert(rows, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "Could not save your CVs. Check your connection and try again." }, { status: 500 });
  return NextResponse.json({ ok: true, saved: rows.length });
}

export async function POST() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to create a cloud CV." }, { status: 401 });

  const { data, error } = await supabase.from("resumes").insert({ owner_id: user.id, title: "Untitled CV", content: initialCvDraft, selected_template_id: "essential" }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "Could not create a CV." }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
