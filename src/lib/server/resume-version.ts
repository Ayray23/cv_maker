import type { SupabaseClient } from "@supabase/supabase-js";

type VersionSnapshot = {
  resume_id: string;
  owner_id: string;
  content_fingerprint: string;
  template_id: string;
  renderer_version: string;
  title_snapshot: string;
  content_snapshot: unknown;
};

type VersionResult = { id: string; title_snapshot: string };

export async function getOrCreateResumeVersion(
  admin: SupabaseClient,
  snapshot: VersionSnapshot,
): Promise<{ version: VersionResult | null; error: unknown | null }> {
  const lookup = async () => admin
    .from("resume_versions")
    .select("id,title_snapshot")
    .eq("owner_id", snapshot.owner_id)
    .eq("content_fingerprint", snapshot.content_fingerprint)
    .maybeSingle();

  const existing = await lookup();
  if (existing.error) return { version: null, error: existing.error };
  if (existing.data) return { version: existing.data as VersionResult, error: null };

  const inserted = await admin.from("resume_versions").insert(snapshot).select("id,title_snapshot").single();
  if (!inserted.error && inserted.data) return { version: inserted.data as VersionResult, error: null };

  // Another request may have inserted the same immutable fingerprint concurrently.
  if ((inserted.error as { code?: string } | null)?.code === "23505") {
    const raced = await lookup();
    if (!raced.error && raced.data) return { version: raced.data as VersionResult, error: null };
    return { version: null, error: raced.error ?? inserted.error };
  }

  return { version: null, error: inserted.error ?? new Error("Could not create resume version.") };
}
