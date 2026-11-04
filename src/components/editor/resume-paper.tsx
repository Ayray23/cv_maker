import { CvDraft, CvTemplate } from "@/lib/cv";

export function ResumePaper({ draft, template, className = "", style }: { draft: CvDraft; template: CvTemplate; className?: string; style?: React.CSSProperties }) {
  return <article style={style} className={`resume-paper ${template.style} ${className}`}>
    <div className="resume-topline" />
    <div className="resume-header"><div><h3>{draft.fullName || "Your Name"}</h3><p>{draft.role || "Your Professional Title"}</p></div><div className="resume-contact"><span>{draft.email || "your.email@example.com"}</span><span>{draft.location || "Your location"}</span><span>{draft.phone}</span></div></div>
    {draft.summary && <section className="resume-section"><h4>PROFILE</h4><p>{draft.summary}</p></section>}
    {draft.experiences.some((item) => item.role || item.company || item.highlights || item.dates) && <section className="resume-section"><h4>EXPERIENCE</h4>{draft.experiences.map((item) => <div className="resume-job" key={item.id}><div className="job-title"><strong>{item.role}</strong><span>{item.dates}</span></div><p className="job-company">{[item.company, item.location].filter(Boolean).join(" · ")}</p><ul>{item.highlights.split("\n").filter(Boolean).map((line, index) => <li key={index}>{line}</li>)}</ul></div>)}</section>}
    {draft.educations.some((item) => item.qualification || item.school || item.dates || item.details) && <section className="resume-section"><h4>EDUCATION</h4>{draft.educations.map((item) => <div className="resume-job" key={item.id}><div className="job-title"><strong>{item.qualification}</strong><span>{item.dates}</span></div><p className="job-company">{item.school}</p>{item.details && <p>{item.details}</p>}</div>)}</section>}
    {draft.projects.some((item) => item.name || item.description) && <section className="resume-section"><h4>PROJECTS</h4>{draft.projects.map((item) => <div className="resume-job" key={item.id}><div className="job-title"><strong>{item.name}</strong></div>{item.link && <p className="job-company">{item.link}</p>}<p>{item.description}</p></div>)}</section>}
    {draft.certifications.some((item) => item.name || item.issuer) && <section className="resume-section"><h4>CERTIFICATIONS</h4>{draft.certifications.map((item) => <div className="job-title" key={item.id}><strong>{item.name}</strong><span>{[item.issuer, item.date].filter(Boolean).join(" · ")}</span></div>)}</section>}
    {draft.languages.some((item) => item.name) && <section className="resume-section"><h4>LANGUAGES</h4><p>{draft.languages.filter((item) => item.name).map((item) => [item.name, item.proficiency].filter(Boolean).join(" — ")).join(" · ")}</p></section>}
    {draft.skills.trim() && <section className="resume-section"><h4>EXPERTISE</h4><div className="skill-list">{draft.skills.split(",").map((skill) => skill.trim()).filter(Boolean).map((skill) => <span key={skill}>{skill}</span>)}</div></section>}
    {draft.extraSections.map((section) => <section className="resume-section" key={section}><h4>{section.toUpperCase()}</h4><p>{draft.extraContent[section]}</p></section>)}
  </article>;
}
