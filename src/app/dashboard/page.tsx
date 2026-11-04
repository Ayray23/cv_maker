import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { CreateCvButton } from "@/components/dashboard/create-cv-button";
import { SignOutButton } from "@/components/auth/signout-button";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <main className="app-shell dashboard-page"><header className="dashboard-header"><Link className="brand" href="/">cvforge<span className="brand-dot">.</span></Link></header><section className="dashboard-empty"><h1>Cloud accounts need setup</h1><p>Add your Supabase project URL and publishable key to <code>.env.local</code> to use the account dashboard. You can keep editing local drafts from the workspace.</p><Link className="continue-button" href="/">Open the CV editor</Link></section></main>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  const { data: resumes, error } = await supabase.from("resumes").select("id,title,updated_at,selected_template_id").order("updated_at", { ascending: false });

  return (
    <main className="app-shell dashboard-page">
      <header className="dashboard-header"><Link className="brand" href="/">cvforge<span className="brand-dot">.</span></Link><div><span>{user.email}</span><Link href="/payments">Payment history</Link><SignOutButton /></div></header>
      <section className="dashboard-content">
        <div className="dashboard-title"><div><span className="section-kicker">YOUR WORKSPACE</span><h1>Your CVs</h1><p>Create and manage your CV documents.</p></div><CreateCvButton /></div>
        {error ? <p className="notice" role="alert">Could not load your CVs. Refresh the page to try again.</p> : resumes?.length ? <div className="dashboard-documents">{resumes.map((resume) => <Link className="dashboard-document" href={`/editor/${resume.id}`} key={resume.id}><span className="dashboard-document-icon"><FileText size={20} /></span><span><strong>{resume.title}</strong><small>Edited {resume.updated_at.slice(0, 10)} · {resume.selected_template_id}</small></span></Link>)}</div> : <div className="dashboard-empty"><h2>Your CV workspace is ready</h2><p>Create a CV to get started. Your documents will be private to your account.</p><CreateCvButton /></div>}
      </section>
    </main>
  );
}
