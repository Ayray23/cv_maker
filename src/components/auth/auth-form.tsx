"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) setMessage("Check your email to confirm your account, then sign in.");
      else {
        const requested = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
        window.location.assign(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t complete sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!configured) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const requested = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign in is unavailable.");
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!configured || !email) {
      setMessage("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/login` });
      if (error) throw error;
      setMessage("If an account exists for this address, a password reset link is on its way.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t send a reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="section-kicker">CVFORGE ACCOUNT</span>
      <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p>{mode === "login" ? "Sign in to access your saved CVs." : "Create an account to save CVs across devices."}</p>
      {!configured && <div className="auth-config-warning" role="status">Add your Supabase URL and publishable key to <code>.env.local</code>, then restart the app to enable account access.</div>}
      <form onSubmit={submit}>
        <label className="field"><span>Email address</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="continue-button auth-submit" disabled={!configured || busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      {mode === "login" && <button className="auth-text-action" onClick={resetPassword} disabled={!configured || busy}>Forgot password?</button>}
      <div className="auth-divider"><span>or</span></div>
      <button className="auth-google" onClick={signInWithGoogle} disabled={!configured || busy}>Continue with Google</button>
      {message && <p className="auth-message" role="status">{message}</p>}
      <p className="auth-switch">{mode === "login" ? <>New here? <a href="/signup">Create an account</a></> : <>Already have an account? <a href="/login">Sign in</a></>}</p>
    </section>
  );
}
