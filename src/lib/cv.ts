export type CvTemplate = {
  id: string;
  name: string;
  style: string;
  special: boolean;
  description: string;
};

export type CvDraft = {
  fullName: string;
  role: string;
  email: string;
  location: string;
  phone: string;
  summary: string;
  experiences: ExperienceItem[];
  skills: string;
  educations: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
  extraSections: string[];
  extraContent: Record<string, string>;
};

export type ExperienceItem = { id: string; role: string; company: string; location: string; dates: string; highlights: string };
export type EducationItem = { id: string; qualification: string; school: string; dates: string; details: string };
export type ProjectItem = { id: string; name: string; link: string; description: string };
export type CertificationItem = { id: string; name: string; issuer: string; date: string };
export type LanguageItem = { id: string; name: string; proficiency: string };

export type CvDocument = {
  id: string;
  title: string;
  templateId: string;
  draft: CvDraft;
  updatedAt: string;
};

export const cvTemplates: CvTemplate[] = [
  { id: "essential", name: "Essential", style: "template-essential", special: false, description: "Clean & simple" },
  { id: "editorial", name: "Editorial", style: "template-editorial", special: false, description: "Modern classic" },
  { id: "monogram", name: "Monogram", style: "template-monogram", special: true, description: "A personal touch" },
  { id: "atelier", name: "Atelier", style: "template-atelier", special: true, description: "Distinctly yours" },
];

export const initialCvDraft: CvDraft = {
  fullName: "",
  role: "",
  email: "",
  location: "",
  phone: "",
  summary: "",
  experiences: [],
  skills: "",
  educations: [],
  projects: [],
  certifications: [],
  languages: [],
  extraSections: [],
  extraContent: {},
};

export function normalizeCvDraft(value: unknown): CvDraft {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source = raw as Partial<CvDraft>;
  const legacyExperience = typeof raw.experience === "string" ? raw.experience : "";
  const legacyEducation = typeof raw.education === "string" ? raw.education : "";
  return {
    ...initialCvDraft,
    ...source,
    experiences: Array.isArray(source.experiences) ? source.experiences : legacyExperience.trim() || raw.experienceRole || raw.experienceCompany ? [{ id: "00000000-0000-4000-8000-000000000001", role: typeof raw.experienceRole === "string" ? raw.experienceRole : "", company: typeof raw.experienceCompany === "string" ? raw.experienceCompany : "", location: "", dates: typeof raw.experienceDates === "string" ? raw.experienceDates : "", highlights: legacyExperience }] : [],
    educations: Array.isArray(source.educations) ? source.educations : legacyEducation.trim() || raw.school ? [{ id: "00000000-0000-4000-8000-000000000002", qualification: legacyEducation, school: typeof raw.school === "string" ? raw.school : "", dates: typeof raw.educationDates === "string" ? raw.educationDates : "", details: "" }] : [],
    projects: Array.isArray(source.projects) ? source.projects : [],
    certifications: Array.isArray(source.certifications) ? source.certifications : [],
    languages: Array.isArray(source.languages) ? source.languages : [],
    extraSections: Array.isArray(source.extraSections) ? source.extraSections.filter((item): item is string => typeof item === "string") : [],
    extraContent: source.extraContent && typeof source.extraContent === "object" ? source.extraContent : {},
  };
}
