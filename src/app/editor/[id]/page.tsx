import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CvWorkspace } from "@/components/cv-workspace";
import { createClient } from "@/lib/supabase/server";
import { initialCvDraft, normalizeCvDraft } from "@/lib/cv";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function CloudEditorPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return <main className="app-shell dashboard-page"><section className="dashboard-empty"><h1>Cloud accounts need setup</h1><p>Configure Supabase to open account CVs.</p><Link className="continue-button" href="/">Open local editor</Link></section></main>;
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/editor/${id}`);
  const { data, error } = await supabase.from("resumes").select("id,title,content,selected_template_id,updated_at").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load this CV.");
  if (!data) notFound();
  const draft = normalizeCvDraft(data.content ?? initialCvDraft);
  return <CvWorkspace initialDocument={{ id: data.id, title: data.title, draft, templateId: data.selected_template_id, updatedAt: data.updated_at }} />;
}
