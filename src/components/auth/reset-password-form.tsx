"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    if (password !== confirmation) {
      setMessage("Your passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setMessage("Your password has been updated. You can now sign in.");
      setPassword("");
      setConfirmation("");
      window.setTimeout(() => router.replace("/login?password_updated=1"), 1200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t update your password. Request a new reset link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="section-kicker">CVFORGE ACCOUNT</span>
      <h1>Choose a new password</h1>
      <p>Use at least 8 characters for your new password.</p>
      {!configured && <div className="auth-config-warning" role="status">Supabase is not configured. Add your project URL and publishable key to .env.local.</div>}
      <form onSubmit={submit}>
        <label className="field"><span>New password</span><input type="password" name="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="field"><span>Confirm new password</span><input type="password" name="confirmation" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <button className="continue-button auth-submit" type="submit" disabled={!configured || busy}>{busy ? "Updating…" : "Update password"}</button>
      </form>
      {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
      <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
    </section>
  );
}
