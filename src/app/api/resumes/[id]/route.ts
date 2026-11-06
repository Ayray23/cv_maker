import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to delete cloud CVs." }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase.from("resumes").delete().eq("id", id).eq("owner_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete this CV." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "CV not found or you do not have permission to delete it." }, { status: 404 });
  return NextResponse.json({ ok: true, id: data.id });
}
