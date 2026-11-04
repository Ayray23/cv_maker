"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentCallbackContent() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [message, setMessage] = useState(reference ? "Verifying payment with Paystack…" : "No payment reference was provided.");
  useEffect(() => {
    if (!reference) return;
    fetch(`/api/payments/verify/${encodeURIComponent(reference)}`, { method: "POST" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Payment could not be confirmed."); setMessage("Payment confirmed. This CV version is ready to download."); })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Payment could not be confirmed."));
  }, [reference]);
  return <main className="app-shell dashboard-page"><section className="dashboard-empty"><h1>Checkout status</h1><p role="status">{message}</p><Link className="continue-button" href="/dashboard">Return to your CVs</Link></section></main>;
}

export default function PaymentCallbackPage() { return <Suspense fallback={<main className="app-shell dashboard-page"><section className="dashboard-empty"><h1>Checkout status</h1><p>Loading…</p></section></main>}><PaymentCallbackContent /></Suspense>; }
