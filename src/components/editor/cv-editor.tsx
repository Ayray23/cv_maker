"use client";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Check, Download, Eye } from "lucide-react";
import { CvDocument, CvDraft, cvTemplates } from "@/lib/cv";
import { CvDetailsForm } from "@/components/editor/cv-details-form";
import { ResumePreview } from "@/components/editor/resume-preview";
import { TemplatePicker } from "@/components/editor/template-picker";
import { PricingSection } from "@/components/pricing-section";
type Props = { document: CvDocument; saveStatus: string; onDraftChange: (draft: CvDraft) => void; onTitleChange: (title: string) => void; onTemplateChange: (templateId: string) => void };
export function CvEditor({ document, saveStatus, onDraftChange, onTitleChange, onTemplateChange }: Props) {
  const { draft } = document;
  const [selectedId, setSelectedId] = useState(document.templateId);
  const [notice, setNotice] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const selectedTemplate = cvTemplates.find((template) => template.id === selectedId) ?? cvTemplates[0];
  async function handleDownload() {
    if (downloading) return;
    setNotice("");
    setDownloading(true);
    try {
      const sync = await fetch("/api/resumes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumes: [document] }) });
      if (!sync.ok) {
        const result = await sync.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Sign in and configure cloud storage before downloading.");
      }
      const response = await fetch("/api/downloads/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeId: document.id }) });
      if (response.ok) {
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = href;
        link.download = `${(document.title || "CV").replace(/[^a-z0-9_-]+/gi, "-")}.pdf`;
        link.click();
        URL.revokeObjectURL(href);
        return;
      }

      const result = await response.json().catch(() => null) as { error?: string; paymentRequired?: boolean } | null;
      if (response.status !== 402 || !result?.paymentRequired) {
        throw new Error(result?.error || "PDF could not be generated.");
      }

      const checkout = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: document.id }),
      });
      const checkoutResult = await checkout.json().catch(() => null) as { error?: string; authorizationUrl?: string } | null;
      if (!checkout.ok || !checkoutResult?.authorizationUrl) {
        throw new Error(checkoutResult?.error || "Checkout could not be started.");
      }

      const authorizationUrl = new URL(checkoutResult.authorizationUrl);
      if (authorizationUrl.protocol !== "https:" || authorizationUrl.hostname !== "checkout.paystack.com") {
        throw new Error("Checkout returned an invalid payment address.");
      }
      window.location.assign(authorizationUrl);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Download could not be completed."); }
    finally { setDownloading(false); }
  }
  return (
    <section className="main-panel" id="editor">
      <div className="page-heading"><div><div className="eyebrow"><span>MY DOCUMENTS</span><span className="crumb-slash">/</span><span>{document.title || "UNTITLED CV"}</span></div><div className="title-line"><input className="document-title-input" aria-label="CV title" value={document.title} onChange={(event) => onTitleChange(event.target.value)} /><span className="saved-label"><span /> {saveStatus}</span></div></div></div>
      <div className="editor-toolbar"><div className="step-track"><span className="step done"><Check size={13} /></span><span className="step-line done-line" /><span className="step active-step">2</span><span className="step-line" /><span className="step">3</span><div className="step-caption"><strong>Choose a template</strong><span>Step 2 of 3</span></div></div><div className="toolbar-right"><span className="autosave">{saveStatus}</span><button className="preview-toggle" onClick={() => setPreviewVisible(!previewVisible)} aria-pressed={previewVisible}><Eye size={15} /><span>{previewVisible ? "Edit CV" : "Preview"}</span></button></div></div>
      <div className="editor-grid">
        <div className={`form-column${previewVisible ? " mobile-form-hidden" : ""}`}>
          <TemplatePicker templates={cvTemplates} selectedId={selectedId} onSelect={(templateId) => { setSelectedId(templateId); onTemplateChange(templateId); }} />
          <CvDetailsForm draft={draft} onChange={onDraftChange} />
          <div className="form-footer"><span className="edit-note"><Check size={13} /> Editing is always free</span><div className="footer-right"><button className="continue-button" onClick={handleDownload} disabled={downloading}><Download size={15} /><span>{downloading ? "Preparing PDF…" : "Download PDF"}</span><ArrowRight size={16} /></button></div></div>
          {notice && <div className="notice" role="status"><BadgeCheck size={16} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
        </div>
        <ResumePreview draft={draft} template={selectedTemplate} visible={previewVisible} />
      </div>
      <PricingSection />
    </section>
  );
}
