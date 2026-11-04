import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  succeeded: "Successful",
  failed: "Failed",
  refunded: "Refunded",
};

export default async function PaymentsPage() {
  if (!isSupabaseConfigured()) redirect("/login?next=/payments");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/payments");

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id,provider_reference,amount_minor,currency,state,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="app-shell dashboard-page">
      <header className="dashboard-header">
        <Link className="brand" href="/">cvforge<span className="brand-dot">.</span></Link>
        <Link href="/dashboard">Back to dashboard</Link>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-title">
          <div><span className="section-kicker">ACCOUNT</span><h1>Payment history</h1><p>Review your CV download payments and checkout status.</p></div>
        </div>
        {error ? <p className="notice" role="alert">Payment history could not be loaded. Please refresh and try again.</p> : payments?.length ? (
          <div className="dashboard-documents">
            {payments.map((payment) => (
              <article className="dashboard-document" key={payment.id}>
                <span className="dashboard-document-icon" aria-hidden="true">₦</span>
                <span>
                  <strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: payment.currency }).format(payment.amount_minor / 100)}</strong>
                  <small>{statusLabels[payment.state] ?? "Unknown"} · {new Date(payment.created_at).toLocaleString("en-NG")} · {payment.provider_reference}</small>
                </span>
              </article>
            ))}
          </div>
        ) : <div className="dashboard-empty"><h2>No payments yet</h2><p>Paid CV downloads will appear here.</p></div>}
      </section>
    </main>
  );
}
