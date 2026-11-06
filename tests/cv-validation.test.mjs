import test from "node:test";
import assert from "node:assert/strict";
import { cvDraftSchema, localWorkspaceSchema, resumeSchema, resumeSyncSchema } from "../src/lib/validation/cv.ts";
import { cvTemplates } from "../src/lib/cv.ts";

const validDraft = {
  fullName: "Ada Example",
  role: "Software Engineer",
  email: "ada@example.com",
  location: "Lagos, Nigeria",
  phone: "+2348000000000",
  summary: "Builds reliable software.",
  experiences: [{
    id: "00000000-0000-4000-8000-000000000001",
    role: "Developer",
    company: "Example Ltd",
    location: "Lagos",
    dates: "2024–present",
    highlights: "Built a web application.",
  }],
  skills: "JavaScript, React, Go",
  educations: [{
    id: "00000000-0000-4000-8000-000000000002",
    qualification: "BSc",
    school: "Example University",
    dates: "2020–2024",
    details: "Software Engineering",
  }],
  projects: [{
    id: "00000000-0000-4000-8000-000000000003",
    name: "Portfolio",
    link: "https://example.com",
    description: "Personal portfolio website.",
  }],
  certifications: [],
  languages: [],
  extraSections: ["Awards"],
  extraContent: { Awards: "Dean's list" },
};

test("accepts a complete valid CV draft", () => {
  assert.equal(cvDraftSchema.safeParse(validDraft).success, true);
});

test("rejects unknown CV draft properties", () => {
  assert.equal(cvDraftSchema.safeParse({ ...validDraft, isAdmin: true }).success, false);
});

test("rejects malformed repeatable item IDs and project URLs", () => {
  const badId = { ...validDraft, experiences: [{ ...validDraft.experiences[0], id: "not-a-uuid" }] };
  const badUrl = { ...validDraft, projects: [{ ...validDraft.projects[0], link: "not a URL" }] };

  assert.equal(cvDraftSchema.safeParse(badId).success, false);
  assert.equal(cvDraftSchema.safeParse(badUrl).success, false);
});

test("enforces repeatable section and text size limits", () => {
  const tooManyExperiences = {
    ...validDraft,
    experiences: Array.from({ length: 51 }, (_, index) => ({
      ...validDraft.experiences[0],
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    })),
  };
  const tooLongSummary = { ...validDraft, summary: "x".repeat(20_001) };

  assert.equal(cvDraftSchema.safeParse(tooManyExperiences).success, false);
  assert.equal(cvDraftSchema.safeParse(tooLongSummary).success, false);
});

test("accepts valid resume documents and rejects unsupported templates", () => {
  const resume = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    templateId: "essential",
    draft: validDraft,
  };

  assert.equal(resumeSchema.safeParse(resume).success, true);
  assert.equal(resumeSchema.safeParse({ ...resume, templateId: "unknown" }).success, false);
});

test("validates resume sync envelope and its maximum batch size", () => {
  const resume = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    templateId: "essential",
    draft: validDraft,
  };

  assert.equal(resumeSyncSchema.safeParse({ resumes: [resume] }).success, true);
  assert.equal(resumeSyncSchema.safeParse({ resumes: Array(101).fill(resume) }).success, false);
  assert.equal(resumeSyncSchema.safeParse({ resumes: [], unexpected: true }).success, false);
});


test("accepts every registered CVForge template in saved resume documents", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    draft: validDraft,
  };
  assert.equal(cvTemplates.length, 12);
  for (const template of cvTemplates) {
    assert.equal(resumeSchema.safeParse({ ...base, templateId: template.id }).success, true);
  }
  assert.equal(new Set(cvTemplates.map((template) => template.id)).size, cvTemplates.length);
});


test("rejects duplicate CV IDs in a single sync batch", () => {
  const resume = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    templateId: "essential",
    draft: validDraft,
  };

  assert.equal(resumeSyncSchema.safeParse({ resumes: [resume, resume] }).success, false);
});

test("validates browser draft cache and requires the active CV to exist", () => {
  const resume = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    templateId: "essential",
    draft: validDraft,
    updatedAt: "2026-11-06T09:30:00.000Z",
  };
  const validCache = { documents: [resume], activeId: resume.id };

  assert.equal(localWorkspaceSchema.safeParse(validCache).success, true);
  assert.equal(localWorkspaceSchema.safeParse({ ...validCache, activeId: "00000000-0000-4000-8000-000000000011" }).success, false);
  assert.equal(localWorkspaceSchema.safeParse({ ...validCache, documents: [{ ...resume, extra: true }] }).success, false);
});

test("rejects invalid timestamps and duplicate IDs in local draft cache", () => {
  const resume = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    templateId: "essential",
    draft: validDraft,
    updatedAt: "not-a-date",
  };

  assert.equal(localWorkspaceSchema.safeParse({ documents: [resume], activeId: resume.id }).success, false);
  const validResume = { ...resume, updatedAt: "2026-11-06T09:30:00.000Z" };
  assert.equal(localWorkspaceSchema.safeParse({ documents: [validResume, validResume], activeId: validResume.id }).success, false);
});


test("accepts the updatedAt field emitted by the CV workspace during sync", () => {
  const resume = {
    id: "00000000-0000-4000-8000-000000000010",
    title: "My CV",
    templateId: "essential",
    draft: validDraft,
    updatedAt: "2026-11-06T09:30:00.000Z",
  };

  assert.equal(resumeSyncSchema.safeParse({ resumes: [resume] }).success, true);
});
