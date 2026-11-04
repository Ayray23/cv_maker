import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeCvDraft, cvTemplates } from "@/lib/cv";
import { ResumePaper } from "@/components/editor/resume-paper";

export const dynamic = "force-dynamic";

export default async function PrintResumePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/print/${id}`);
  const { data } = await supabase.from("resumes").select("content,selected_template_id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) notFound();
  const template = cvTemplates.find((item) => item.id === data.selected_template_id) ?? cvTemplates[0];
  return <main className="pdf-document"><ResumePaper draft={normalizeCvDraft(data.content)} template={template} /></main>;
}
