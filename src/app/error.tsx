"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("CV workspace error:", error.digest ?? "Unknown error");
  }, [error]);

  return (
    <main className="app-shell app-error" role="alert">
      <section className="error-card">
        <span className="section-kicker">WORKSPACE ERROR</span>
        <h1>We couldn’t open this page.</h1>
        <p>Your saved drafts are still in this browser. Try loading the workspace again.</p>
        <button className="continue-button" onClick={reset}><RefreshCw size={15} /> Try again</button>
      </section>
    </main>
  );
}
