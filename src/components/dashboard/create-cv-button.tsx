"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function CreateCvButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createCv() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/resumes", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create a CV.");
      router.push(`/editor/${result.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a CV.");
      setBusy(false);
    }
  }

  return <div><button className="continue-button" onClick={createCv} disabled={busy}><Plus size={15} />{busy ? "Creating…" : "Create a CV"}</button>{error && <p className="notice" role="alert">{error}</p>}</div>;
}
