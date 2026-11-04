"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentCallbackContent() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [status, setStatus] = useState<"checking" | "pending" | "success" | "failed">(reference ? "checking" : "failed");
  const [message, setMessage] = useState(reference ? "Verifying payment with Paystack…" : "No payment reference was provided.");

  const verifyPayment = useCallback(async () => {
    if (!reference) return;
    setStatus("checking");
    setMessage("Verifying payment with Paystack…");
    try {
      const response = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`, { method: "POST" });
      const result = await response.json() as { error?: string; ok?: boolean };
      if (response.status === 202) {
        setStatus("pending");
        setMessage("Your payment is still processing. Check again in a moment.");
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.error || "Payment could not be confirmed.");
      setStatus("success");
      setMessage("Payment confirmed. This CV version is ready to download.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Payment could not be confirmed.");
    }
  }, [reference]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void verifyPayment(); }, 0);
    return () => window.clearTimeout(timer);
  }, [verifyPayment]);

  return (
    <main className="app-shell dashboard-page">
      <section className="dashboard-empty">
        <h1>Checkout status</h1>
        <p role="status" aria-live="polite">{message}</p>
        {status !== "success" && reference ? <button className="continue-button" type="button" onClick={() => void verifyPayment()} disabled={status === "checking"}>{status === "checking" ? "Checking…" : "Check payment again"}</button> : null}
        <Link className="continue-button" href="/dashboard">Return to your CVs</Link>
        <Link href="/payments">View payment history</Link>
      </section>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return <Suspense fallback={<main className="app-shell dashboard-page"><section className="dashboard-empty"><h1>Checkout status</h1><p>Loading…</p></section></main>}><PaymentCallbackContent /></Suspense>;
}
