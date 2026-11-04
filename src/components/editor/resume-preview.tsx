import { LockKeyhole } from "lucide-react";
import { CvDraft, CvTemplate } from "@/lib/cv";
import { useState } from "react";
import { ResumePaper } from "@/components/editor/resume-paper";

export function ResumePreview({ draft, template, visible }: { draft: CvDraft; template: CvTemplate; visible: boolean }) {
  const [scale, setScale] = useState(0.88);
  return (
    <aside className={`preview-column${visible ? " mobile-preview-visible" : ""}`}>
      <div className="preview-top"><span><span className="live-dot" /> LIVE PREVIEW</span><div><button className="zoom-button" onClick={() => setScale((current) => Math.max(0.6, Math.round((current - 0.08) * 100) / 100))} aria-label="Zoom out"><span>−</span></button><span className="zoom-label">{Math.round(scale * 100)}%</span><button className="zoom-button" onClick={() => setScale((current) => Math.min(1.2, Math.round((current + 0.08) * 100) / 100))} aria-label="Zoom in"><span>+</span></button></div></div>
      <div className="paper-wrap"><ResumePaper draft={draft} template={template} style={{ transform: `scale(${scale})` }} /></div>
      <div className="preview-caption"><span><span className="live-dot" /> Preview updates as you edit</span></div>
      <div className="price-tip" id="pricing"><span className="tip-icon"><LockKeyhole size={15} /></span><span><strong>{template.special ? "Paid template · ₦2,000" : "Standard template"}</strong><small>{template.special ? "Paid downloads are unavailable until checkout is connected." : "PDF export opens your browser’s Save as PDF dialog."}</small></span></div>
    </aside>
  );
}
//bAbt2qF7uVAJ914A