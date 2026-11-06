"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { CvEditor } from "@/components/editor/cv-editor";
import { CvDocument, initialCvDraft, normalizeCvDraft } from "@/lib/cv";
import { localWorkspaceSchema } from "@/lib/validation/cv";
import { mergeCvDocuments } from "@/lib/cv-sync";

const GUEST_STORAGE_KEY = "cvforge.documents.guest.v1";
const LEGACY_STORAGE_KEY = "cvforge.documents.v1";
const accountStorageKey = (userId: string) => `cvforge.documents.user.${userId}.v1`;

function newDocument(): CvDocument {
  return { id: crypto.randomUUID(), title: "Untitled CV", templateId: "essential", draft: { ...initialCvDraft }, updatedAt: new Date().toISOString() };
}

type CloudState = "checking" | "ready" | "signed-out" | "unconfigured" | "error";

function readWorkspaceCache(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { documents?: unknown[]; activeId?: unknown };
    if (!Array.isArray(parsed.documents)) return null;
    // Normalize older draft shapes before applying the current strict schema.
    const documents = parsed.documents.map((value) => {
      const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        ...item,
        templateId: typeof item.templateId === "string" ? item.templateId : "essential",
        updatedAt: typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt)) ? item.updatedAt : new Date(0).toISOString(),
        draft: normalizeCvDraft(item.draft),
      };
    });
    const candidate = { documents, activeId: parsed.activeId };
    const validated = localWorkspaceSchema.safeParse(candidate);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

export function CvWorkspace({ initialDocument, ownerId: initialOwnerId }: { initialDocument?: CvDocument; ownerId?: string }) {
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [documents, setDocuments] = useState<CvDocument[]>(() => [initialDocument ?? newDocument()]);
  const [activeId, setActiveId] = useState(() => initialDocument?.id ?? documents[0].id);
  const [loaded, setLoaded] = useState(Boolean(initialDocument));
  const [cloudReady, setCloudReady] = useState(Boolean(initialDocument));
  const [cloudEnabled, setCloudEnabled] = useState(Boolean(initialDocument));
  const [ownerId, setOwnerId] = useState<string | null>(initialOwnerId ?? null);
  const [cloudState, setCloudState] = useState<CloudState>(initialDocument ? "ready" : "checking");
  const [saveStatus, setSaveStatus] = useState(initialDocument ? "Synced to your account" : "Saved on this device");
  const [deleting, setDeleting] = useState(false);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const saveTimer = useRef<number | null>(null);
  const activeDocument = documents.find((document) => document.id === activeId) ?? documents[0];
  const initials = useMemo(() => (activeDocument?.draft.fullName ?? "").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(), [activeDocument?.draft.fullName]);

  useEffect(() => {
    if (initialDocument) return;
    const controller = new AbortController();

    async function restore() {
      let response: Response | null = null;
      try {
        response = await fetch("/api/resumes", { signal: controller.signal, cache: "no-store" });
        if (response.ok) {
          const payload = await response.json() as { userId: string; resumes: Array<{ id: string; title: string; content: CvDocument["draft"]; selected_template_id: string; updated_at: string }> };
          if (!payload.userId) throw new Error("Cloud account identity was not returned.");
          const cached = readWorkspaceCache(accountStorageKey(payload.userId));
          const remote = payload.resumes.map((row) => ({ id: row.id, title: row.title, draft: normalizeCvDraft(row.content), templateId: row.selected_template_id, updatedAt: row.updated_at }));
          const merged = mergeCvDocuments(remote, cached?.documents ?? []);
          setOwnerId(payload.userId);
          setDocuments(merged.length ? merged : [newDocument()]);
          setActiveId(cached?.activeId && merged.some((item) => item.id === cached.activeId) ? cached.activeId : merged[0]?.id);
          setCloudEnabled(true);
          setCloudReady(true);
          setCloudState("ready");
          setLoaded(true);
          return;
        }
        if (response.status === 401 || response.status === 503) {
          const guest = readWorkspaceCache(GUEST_STORAGE_KEY) ?? (response.status === 401 ? readWorkspaceCache(LEGACY_STORAGE_KEY) : null);
          if (guest && response.status === 401 && !localStorage.getItem(GUEST_STORAGE_KEY)) {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
          }
          const guestDocuments = guest?.documents?.length ? guest.documents : [newDocument()];
          setDocuments(guestDocuments);
          setActiveId(guest?.activeId && guestDocuments.some((item) => item.id === guest.activeId) ? guest.activeId : guestDocuments[0].id);
          setCloudEnabled(false);
          setCloudReady(true);
          setCloudState(response.status === 401 ? "signed-out" : "unconfigured");
          setLoaded(true);
          return;
        }
        throw new Error("Could not load cloud CVs.");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        // Without a confirmed user ID, only restore guest data; never load an account cache.
        const guest = readWorkspaceCache(GUEST_STORAGE_KEY);
        const guestDocuments = guest?.documents?.length ? guest.documents : [newDocument()];
        setDocuments(guestDocuments);
        setActiveId(guest?.activeId && guestDocuments.some((item) => item.id === guest.activeId) ? guest.activeId : guestDocuments[0].id);
        setSaveStatus("Cloud sync unavailable · saved locally");
        setCloudEnabled(false);
        setCloudReady(true);
        setCloudState("error");
        setLoaded(true);
      }
    }

    void restore();
    return () => controller.abort();
  }, [initialDocument]);

  useEffect(() => {
    if (!loaded || !cloudReady || deleting) return;
    const revision = ++saveRevision.current;
    saveTimer.current = window.setTimeout(() => {
      try {
        const key = ownerId ? accountStorageKey(ownerId) : GUEST_STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify({ documents, activeId }));
      } catch {
        setSaveStatus("Could not save on this device");
        return;
      }
      if (!cloudEnabled || !ownerId) {
        setSaveStatus("Saved on this device");
        return;
      }
      setSaveStatus("Saving to your account…");
      const snapshot = JSON.stringify({ resumes: documents });
      syncQueue.current = syncQueue.current.catch(() => undefined).then(async () => {
        const response = await fetch("/api/resumes", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-cvforge-owner-id": ownerId },
          body: snapshot,
        });
        if (response.status === 409 || response.status === 401) {
          throw new Error("Your signed-in account changed. Reload the workspace before syncing.");
        }
        if (!response.ok) throw new Error("Cloud sync failed");
        if (saveRevision.current === revision) setSaveStatus("Synced to your account");
      }).catch((error) => {
        if (saveRevision.current === revision) {
          setSaveStatus(error instanceof Error ? error.message : "Saved locally · cloud sync failed");
          setCloudState("error");
        }
      });
    }, 400);

    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      if (saveRevision.current === revision) saveRevision.current += 1;
    };
  }, [documents, activeId, loaded, cloudReady, cloudEnabled, ownerId, initialDocument, deleting]);

  function updateDraft(draft: CvDocument["draft"]) {
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, draft, updatedAt: new Date().toISOString() } : document));
  }

  function createDocument() {
    const document = newDocument();
    setDocuments((current) => [document, ...current]);
    setActiveId(document.id);
  }

  async function deleteDocument(id: string) {
    const target = documents.find((document) => document.id === id);
    if (!target || deleting) return;
    setDeleting(true);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveRevision.current += 1;
    try {
      await syncQueue.current.catch(() => undefined);
      if (cloudEnabled) {
        const response = await fetch(`/api/resumes/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) {
          const result = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(result?.error || "Could not delete this CV from your account.");
        }
      }
      if (documents.length === 1) {
        const replacement = newDocument();
        setDocuments([replacement]);
        setActiveId(replacement.id);
      } else {
        const next = documents.filter((document) => document.id !== id);
        setDocuments(next);
        if (id === activeId) setActiveId(next[0].id);
      }
      setSaveStatus("CV deleted");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Could not delete this CV. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function renameDocument(title: string) {
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, title, updatedAt: new Date().toISOString() } : document));
  }

  const cloudMessage = cloudState === "ready" ? "Cloud sync is connected. Your CVs are saved to your account."
    : cloudState === "signed-out" ? "Sign in to turn on private cloud saving and PDF downloads."
    : cloudState === "unconfigured" ? "Supabase is not configured yet. Add the project URL and publishable key to the app environment."
    : cloudState === "error" ? "Cloud sync could not complete. Check the Supabase migrations and environment settings."
    : "Checking your Supabase connection…";

  return (
    <main className={dark ? "app-shell dark-mode" : "app-shell"}>
      <AppHeader initials={initials} dark={dark} mobileOpen={mobileOpen} onToggleTheme={() => setDark(!dark)} onToggleNav={() => setMobileOpen(!mobileOpen)} />
      <div className={`cloud-status-banner cloud-${cloudState}`} role="status"><span>{cloudMessage}</span>{cloudState === "signed-out" && <a href="/login?next=/">Sign in</a>}</div>
      <div className="workspace">
        <WorkspaceSidebar initials={initials} documents={documents} activeId={activeDocument.id} onSelect={setActiveId} onCreate={createDocument} onDelete={deleteDocument} />
        <CvEditor key={activeDocument.id} document={activeDocument} saveStatus={saveStatus} onDraftChange={updateDraft} onTitleChange={renameDocument} onTemplateChange={(templateId) => setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, templateId, updatedAt: new Date().toISOString() } : document))} />
      </div>
    </main>
  );
}
