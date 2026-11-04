import { z } from "zod";

const text = z.string().max(20_000);

export const cvDraftSchema = z.object({
  fullName: text,
  role: text,
  email: z.string().max(320),
  location: text,
  phone: text,
  summary: text,
  experiences: z.array(z.object({ id: z.string().uuid(), role: text, company: text, location: text, dates: text, highlights: text }).strict()).max(50),
  skills: text,
  educations: z.array(z.object({ id: z.string().uuid(), qualification: text, school: text, dates: text, details: text }).strict()).max(50),
  projects: z.array(z.object({ id: z.string().uuid(), name: text, link: z.string().url().or(z.literal("")), description: text }).strict()).max(50),
  certifications: z.array(z.object({ id: z.string().uuid(), name: text, issuer: text, date: text }).strict()).max(50),
  languages: z.array(z.object({ id: z.string().uuid(), name: text, proficiency: text }).strict()).max(50),
  extraSections: z.array(z.string().min(1).max(60)).max(20),
  extraContent: z.record(z.string(), text),
}).strict();

export const resumeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  templateId: z.enum(["essential", "editorial", "monogram", "atelier"]),
  draft: cvDraftSchema,
}).strict();

export const resumeSyncSchema = z.object({ resumes: z.array(resumeSchema).max(100) }).strict();
