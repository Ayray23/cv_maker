import { Check, Sparkles } from "lucide-react";
import { CvTemplate } from "@/lib/cv";

type Props = { templates: CvTemplate[]; selectedId: string; onSelect: (id: string) => void };

export function TemplatePicker({ templates, selectedId, onSelect }: Props) {
  return (
    <>
      <div className="section-heading"><div><span className="section-kicker">MAKE IT YOURS</span><h2>Choose your style</h2><p>Pick a layout that feels like you.</p></div><span className="count-pill">{templates.length} templates</span></div>
      <div className="template-grid" id="templates">
        {templates.map((template) => <button key={template.id} className={selectedId === template.id ? "template-option chosen" : "template-option"} onClick={() => onSelect(template.id)} aria-pressed={selectedId === template.id}>
          <div className={`mini-resume ${template.style}`}><div className="mini-head"><span className="mini-photo" /><div><i /><i /><i /></div></div><div className="mini-body"><i /><i /><i /><i /><i /><i /><i /></div>{template.special && <span className="mini-special"><Sparkles size={9} /> PRO</span>}</div>
          <span className="template-caption"><span><strong>{template.name}</strong><small>{template.description}</small></span>{template.special ? <span className="template-price">₦2,000</span> : <span className="free-tag">FREE</span>}</span>
          {selectedId === template.id && <span className="selected-check"><Check size={12} /></span>}
        </button>)}
      </div>
    </>
  );
}
