# CVForge template research

Research reviewed on 4 November 2026. This document records public template galleries used as design references for the original CVForge template family.

## Galleries reviewed

- Canva — https://www.canva.com/resumes/templates/
  - Useful patterns: minimalist, professional, modern, corporate, student, creative, and photo-oriented categories.
  - Canva account search also surfaced personal examples such as a clean software-developer CV and a simple dynamic resume. These were treated as private reference material, not imported or redistributed.
- FlowCV — https://flowcv.com/resume-templates
  - Useful patterns: simple, modern, creative, compact, first-job, and photo layouts.
- Novorésumé — https://novoresume.com/cv-maker
  - Useful patterns: minimalist, modern, hybrid, executive, traditional, student, IT, and tech-oriented CV structures.
- Enhancv — https://enhancv.com/resume-templates/
  - Useful patterns: single-column, double-column, timeline, executive, creative, compact, and education-first variants.
- Kickresume — https://www.kickresume.com/en/templates/resume/
  - Useful patterns: ATS-friendly, professional, simple, and creative families, with profession-specific examples.
- Zety — https://zety.com/resume-templates/
  - Useful patterns: corporate, creative, elegant, modern, professional, simple, and traditional styles, with industry and experience-level filters.

## CVForge implementation

CVForge now contains twelve original layouts:

| Template | Category | Access | Design direction |
|---|---|---|---|
| Essential | ATS | Free | Minimal single-column |
| Editorial | Modern | Free | Contemporary classic |
| Classic | ATS | Free | Traditional, text-first |
| Tech | Modern | Free | Technical skills emphasis |
| Graduate | ATS | Free | Early-career clarity |
| Modern | Modern | Free | Contemporary header treatment |
| Monogram | Creative | Premium | Personal editorial touch |
| Atelier | Creative | Premium | Distinctive accent treatment |
| Executive | Creative | Premium | Refined leadership style |
| Creative | Creative | Premium | Expressive colour and typography |
| Timeline | Modern | Premium | Career progression accent |
| Compact | ATS | Premium | Dense, space-efficient layout |

All templates use the shared CV content model and live preview renderer. Selecting a different template does not require re-entering CV details. The template IDs are validated by the API and supported by the same immutable PDF snapshot/export pipeline.

## Licensing and ATS note

The implementation uses original CVForge HTML/CSS and shared semantic text content. It does not copy Canva, FlowCV, Novorésumé, Enhancv, Kickresume, or Zety template files, graphics, or proprietary assets. The category labels describe layout intent, not a certification or guarantee that every employer's ATS will parse every exported document. The ATS-oriented designs use conventional headings and selectable text; applicants should follow each employer's requested format.
