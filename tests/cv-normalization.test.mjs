import test from "node:test";
import assert from "node:assert/strict";
import { initialCvDraft, normalizeCvDraft } from "../src/lib/cv.ts";

test("initial CV draft has every supported section initialized", () => {
  assert.deepEqual(initialCvDraft.experiences, []);
  assert.deepEqual(initialCvDraft.educations, []);
  assert.deepEqual(initialCvDraft.projects, []);
  assert.deepEqual(initialCvDraft.certifications, []);
  assert.deepEqual(initialCvDraft.languages, []);
  assert.deepEqual(initialCvDraft.extraSections, []);
  assert.deepEqual(initialCvDraft.extraContent, {});
});

test("normalizes null and primitive input to a safe empty draft", () => {
  for (const value of [null, undefined, "not-a-draft", 42, true]) {
    const draft = normalizeCvDraft(value);
    assert.equal(draft.fullName, "");
    assert.deepEqual(draft.experiences, []);
    assert.deepEqual(draft.educations, []);
    assert.deepEqual(draft.extraContent, {});
  }
});

test("migrates legacy experience and education fields", () => {
  const draft = normalizeCvDraft({
    experience: "Built internal tools",
    experienceRole: "Developer",
    experienceCompany: "Example Ltd",
    experienceDates: "2022–2024",
    education: "BSc Software Engineering",
    school: "Example University",
    educationDates: "2020–2024",
  });

  assert.deepEqual(draft.experiences, [{
    id: "00000000-0000-4000-8000-000000000001",
    role: "Developer",
    company: "Example Ltd",
    location: "",
    dates: "2022–2024",
    highlights: "Built internal tools",
  }]);
  assert.deepEqual(draft.educations, [{
    id: "00000000-0000-4000-8000-000000000002",
    qualification: "BSc Software Engineering",
    school: "Example University",
    dates: "2020–2024",
    details: "",
  }]);
});

test("preserves current repeatable sections instead of replacing them with legacy fields", () => {
  const currentExperience = [{
    id: "00000000-0000-4000-8000-000000000003",
    role: "Current role",
    company: "Current company",
    location: "Lagos",
    dates: "2025–present",
    highlights: "Current content",
  }];
  const draft = normalizeCvDraft({
    experiences: currentExperience,
    experience: "Old content",
    educations: [],
    education: "Old education",
  });

  assert.deepEqual(draft.experiences, currentExperience);
  assert.deepEqual(draft.educations, []);
});

test("filters invalid extra section labels and safely defaults extra content", () => {
  const draft = normalizeCvDraft({
    extraSections: ["Awards", 10, null, "Volunteering"],
    extraContent: null,
  });

  assert.deepEqual(draft.extraSections, ["Awards", "Volunteering"]);
  assert.deepEqual(draft.extraContent, {});
});
