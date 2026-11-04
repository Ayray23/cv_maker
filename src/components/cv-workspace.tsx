"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { CvEditor } from "@/components/editor/cv-editor";
import { CvDocument, initialCvDraft, normalizeCvDraft } from "@/lib/cv";

const STORAGE_KEY = "cvforge.documents.v1";

function newDocument(): CvDocument {
  return { id: crypto.randomUUID(), title: "Untitled CV", templateId: "essential", draft: { ...initialCvDraft }, updatedAt: new Date().toISOString() };
}

export function CvWorkspace({ initialDocument }: { initialDocument?: CvDocument }) {
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [documents, setDocuments] = useState<CvDocument[]>(() => [initialDocument ?? newDocument()]);
  const [activeId, setActiveId] = useState(() => initialDocument?.id ?? documents[0].id);
  const [loaded, setLoaded] = useState(Boolean(initialDocument));
  const [cloudReady, setCloudReady] = useState(Boolean(initialDocument));
  const [cloudEnabled, setCloudEnabled] = useState(Boolean(initialDocument));
  const [saveStatus, setSaveStatus] = useState("Saved on this device");
  const activeDocument = documents.find((document) => document.id === activeId) ?? documents[0];
  const initials = useMemo(() => (activeDocument?.draft.fullName ?? "").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(), [activeDocument?.draft.fullName]);

  useEffect(() => {
    if (initialDocument) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { documents?: CvDocument[]; activeId?: string };
        if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
          // Browser storage is only available after hydration; restore it here to avoid server/client markup mismatch.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDocuments(parsed.documents.map((item) => ({ ...item, draft: normalizeCvDraft(item.draft) })));
          setActiveId(parsed.documents.some((item) => item.id === parsed.activeId) ? parsed.activeId! : parsed.documents[0].id);
        }
      }
    } catch {
      setSaveStatus("Could not read saved drafts");
    }
    setLoaded(true);
    fetch("/api/resumes")
      .then(async (response) => {
        if (response.status === 401 || response.status === 503) {
          setCloudEnabled(false);
          setCloudReady(true);
          return;
        }
        if (!response.ok) throw new Error("Could not load cloud CVs.");
        const payload = await response.json() as { resumes: Array<{ id: string; title: string; content: CvDocument["draft"]; selected_template_id: string; updated_at: string }> };
        const remote = payload.resumes.map((row) => ({ id: row.id, title: row.title, draft: normalizeCvDraft(row.content), templateId: row.selected_template_id, updatedAt: row.updated_at }));
        setDocuments((local) => {
          const ids = new Set(remote.map((item) => item.id));
          return [...remote, ...local.filter((item) => !ids.has(item.id))];
        });
        setCloudEnabled(true);
        setCloudReady(true);
      })
      .catch(() => {
        setSaveStatus("Cloud sync unavailable · saved locally");
        setCloudEnabled(false);
        setCloudReady(true);
      });
  }, [initialDocument]);

  useEffect(() => {
    if (!loaded || !cloudReady) return;
    const timer = window.setTimeout(async () => {
      try {
        if (!initialDocument) localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents, activeId }));
        if (cloudEnabled) {
          const response = await fetch("/api/resumes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumes: documents }) });
          if (!response.ok) throw new Error("Cloud sync failed");
          setSaveStatus("Synced to your account");
        } else {
          setSaveStatus("Saved on this device");
        }
      } catch {
        setSaveStatus(cloudEnabled ? "Saved locally · cloud sync failed" : "Could not save on this device");
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [documents, activeId, loaded, cloudReady, cloudEnabled, initialDocument]);

  function updateDraft(draft: CvDocument["draft"]) {
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, draft, updatedAt: new Date().toISOString() } : document));
  }

  function createDocument() {
    const document = newDocument();
    setDocuments((current) => [document, ...current]);
    setActiveId(document.id);
  }

  function deleteDocument(id: string) {
    if (cloudEnabled) void fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (documents.length === 1) {
      const replacement = newDocument();
      setDocuments([replacement]);
      setActiveId(replacement.id);
      return;
    }
    const next = documents.filter((document) => document.id !== id);
    setDocuments(next);
    if (id === activeId) setActiveId(next[0].id);
  }

  function renameDocument(title: string) {
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, title, updatedAt: new Date().toISOString() } : document));
  }

  return (
    <main className={dark ? "app-shell dark-mode" : "app-shell"}>
      <AppHeader initials={initials} dark={dark} mobileOpen={mobileOpen} onToggleTheme={() => setDark(!dark)} onToggleNav={() => setMobileOpen(!mobileOpen)} />
      <div className="workspace">
      <WorkspaceSidebar initials={initials} documents={documents} activeId={activeDocument.id} onSelect={setActiveId} onCreate={createDocument} onDelete={deleteDocument} />
        <CvEditor key={activeDocument.id} document={activeDocument} saveStatus={saveStatus} onDraftChange={updateDraft} onTitleChange={renameDocument} onTemplateChange={(templateId) => setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, templateId } : document))} />
      </div>
      <footer className="mobile-legal">Drafts are saved in this browser. Cloud accounts and paid checkout are not connected.</footer>
    </main>
  );
}
