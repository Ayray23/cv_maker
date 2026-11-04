import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeCvDraft, cvTemplates } from "@/lib/cv";
import { ResumePaper } from "@/components/editor/resume-paper";

export const dynamic = "force-dynamic";

export default async function PrintVersionPage({ params }: { params: Promise<{ versionId: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { versionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/print/version/${versionId}`);

  const { data: version } = await supabase
    .from("resume_versions")
    .select("content_snapshot,template_id,owner_id")
    .eq("id", versionId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!version?.content_snapshot) notFound();
  const template = cvTemplates.find((item) => item.id === version.template_id);
  if (!template) notFound();

  return <main className="pdf-document"><ResumePaper draft={normalizeCvDraft(version.content_snapshot)} template={template} /></main>;
}
