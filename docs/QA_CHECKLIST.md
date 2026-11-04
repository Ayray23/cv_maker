# CVForge release QA checklist

This checklist separates automated checks from account-backed integration checks. Do not mark an integration item complete until it has been exercised in a deployed test environment.

## Automated in CI

- [ ] CV draft normalization and legacy-field migration tests pass.
- [ ] CV schema validation tests pass, including UUID, URL, unknown-property, text-size and repeatable-section limits.
- [ ] ESLint passes.
- [ ] TypeScript type-check passes.
- [ ] Next.js production build passes.

Run locally with:

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Authentication (Supabase test project)

- [ ] Sign up with a valid email and matching password confirmation.
- [ ] Invalid email and mismatched passwords show useful errors.
- [ ] Sign in and sign out.
- [ ] Request a password reset and complete it from the email link.
- [ ] Expired or malformed reset links fail safely.
- [ ] Google OAuth returns to the intended same-origin destination.
- [ ] A signed-out user cannot access dashboard, editor, payments or private print pages.

## CV editor and persistence

- [ ] Create a CV and edit every single-value field.
- [ ] Add, edit and remove multiple experience, education, project, certification and language entries.
- [ ] Switch between all four templates and confirm the preview updates.
- [ ] Refresh during editing and confirm the latest local draft is restored.
- [ ] Confirm cloud autosaves finish in order and an older save cannot overwrite newer content.
- [ ] Open the same CV from a second signed-in browser session and verify cloud content.
- [ ] Verify another account cannot read or update the CV by changing its ID.

## PDF and download entitlements

- [ ] Apply migrations in filename order on a disposable Supabase test project.
- [ ] Generate a PDF for each template and inspect text, page breaks, fonts and layout.
- [ ] Edit a CV after creating a version; confirm the old version still renders its immutable snapshot.
- [ ] Confirm the downloaded filename uses the version title.
- [ ] Confirm a failed PDF render does not consume a free entitlement.
- [ ] Confirm free-download limits and paid-template rules match the product specification.
- [ ] Confirm a user cannot render another user's version ID.

## Paystack (test credentials only)

- [ ] Start checkout for an eligible version and confirm the expected NGN amount.
- [ ] Start checkout again while pending and confirm the existing checkout is reused.
- [ ] Simulate a failed or abandoned checkout and confirm a new attempt can be started.
- [ ] Verify a pending transaction remains pending and can be retried.
- [ ] Verify a successful test payment grants one entitlement only.
- [ ] Replay the same successful webhook and confirm it is idempotent.
- [ ] Send an invalid webhook signature and confirm it is rejected.
- [ ] Send mismatched amount, currency or reference and confirm no entitlement is granted.
- [ ] Confirm payment history shows only the signed-in user's transactions.

## Responsive, PWA and launch checks

- [ ] Test editor, preview, dashboard and checkout at narrow mobile, tablet and desktop widths.
- [ ] Install the PWA on a supported mobile browser and verify its icon and launch behaviour.
- [ ] Verify manifest, metadata, robots rules and security headers in the deployed environment.
- [ ] Verify privacy policy, terms, support contact and refund wording before public launch.
- [ ] Confirm production environment variables are configured without exposing service-role or Paystack secret keys to the browser.

## Current verification boundary

The automated tests in this stage cover pure CV normalization and Zod validation logic. Supabase authentication, database migrations, Chromium PDF rendering and Paystack transactions require configured external test services and must be checked using the sections above. CI success alone does not prove those live integrations work.
