import { FileText, LayoutTemplate, Plus, Sparkles, Trash2 } from "lucide-react";
import { CvDocument } from "@/lib/cv";

type Props = { initials: string; documents: CvDocument[]; activeId: string; onSelect: (id: string) => void; onCreate: () => void; onDelete: (id: string) => void };

export function WorkspaceSidebar({ documents, activeId, onSelect, onCreate, onDelete }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-heading">WORKSPACE</div>
      <a className="side-item selected" href="#editor"><FileText size={17} /><span>My documents</span><span className="side-badge">{documents.length}</span></a>
      <a className="side-item" href="#templates"><LayoutTemplate size={17} /><span>Templates</span></a>
      <a className="side-item" href="#pricing"><Sparkles size={17} /><span>Premium features</span><span className="tiny-sparkle"><Sparkles size={13} /></span></a>
      <div className="sidebar-divider" />
      <div className="sidebar-heading documents-heading">YOUR DOCUMENTS <button className="mini-add" onClick={onCreate} aria-label="Create a new CV"><Plus size={16} /></button></div>
      {documents.map((document) => <div className={document.id === activeId ? "document-item current" : "document-item"} key={document.id}>
        <button className="document-select" onClick={() => onSelect(document.id)} aria-current={document.id === activeId ? "page" : undefined}><span className={`doc-thumb ${document.id === activeId ? "" : "muted"}`}><FileText size={17} /></span><span className="document-label"><strong>{document.title || "Untitled CV"}</strong><small>Edited {document.updatedAt.slice(0, 10)}</small></span>{document.id === activeId && <span className="current-indicator" />}</button>
        <button className="document-delete" onClick={() => window.confirm(`Delete “${document.title || "Untitled CV"}”? This cannot be undone.`) && onDelete(document.id)} aria-label={`Delete ${document.title || "Untitled CV"}`}><Trash2 size={13} /></button>
      </div>)}
      <div className="sidebar-bottom">
        <div className="free-card"><div className="free-card-title"><span className="free-icon"><Sparkles size={14} /></span> Draft storage</div><p>Your CVs are saved in this browser.</p><span className="free-card-note">Cloud sync requires an account connection.</span></div>
      </div>
    </aside>
  );
}
