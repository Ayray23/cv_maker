# CVForge

A structured CV builder built with Next.js 16, React, TypeScript, and Supabase. The editor supports multiple CVs, editable/reorderable sections, twelve original templates, account-backed storage, server-generated A4 PDFs, and Paystack checkout.

## Template library

CVForge includes twelve original, editable layouts across ATS-first, modern, and creative styles: Essential, Editorial, Classic, Tech, Graduate, Modern, Monogram, Atelier, Executive, Creative, Timeline, and Compact. Six are free to use; six are premium. These designs take broad inspiration from common resume-builder patterns (including Canva, FlowCV, Novorésumé, and Enhancv) but are implemented as original CVForge components rather than copied third-party template files. ATS-labelled layouts prioritize selectable text, conventional headings, and a straightforward reading order; always follow the employer's file-format instructions.

## Requirements

- Node.js 20.9 or newer
- A Supabase project
- Paystack test/live keys for paid downloads
- Chrome or Edge installed locally for PDF output (or a compatible serverless Chromium runtime)

## Run locally

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` from the same Supabase project. The secret key is server-only and must never use a `NEXT_PUBLIC_` prefix.
3. Set `CHROME_EXECUTABLE_PATH` to the installed Chrome/Edge executable. Leave `APP_BASE_URL=http://localhost:3000` for local use.
4. Apply every SQL migration in `supabase/migrations/` in filename order. This includes the initial schema, immutable CV version snapshots, and checkout reliability changes. Use the Supabase SQL editor or CLI, and confirm all three migrations complete successfully.
5. In Supabase Auth, enable email/password and Google OAuth, set the site URL to `http://localhost:3000`, and add `http://localhost:3000/auth/callback` as an allowed redirect URL. Configure production URLs before deployment.
6. Add the Paystack test secret key to `PAYSTACK_SECRET_KEY`. Set the Paystack callback URL to `http://localhost:3000/payment/callback`. For local webhook testing, expose `/api/payments/webhook` through a trusted HTTPS tunnel and configure that URL in Paystack.
7. Run `npm run dev` and open `http://localhost:3000`.

With Supabase values absent, the public editor keeps drafts in local browser storage; account sync, downloads, and payments require configuration. The Paystack secret and Supabase secret must remain server-side. Do not commit `.env.local`.

## Product rules

- Editing and saving drafts are free.
- Each account gets two free standard-template downloads for distinct CV versions.
- A new standard CV version costs ₦2,000 after the allowance; paid templates cost ₦2,000 per new version from the first download.
- Re-downloading a version that already has an entitlement is free.
- Payment is granted only after Paystack verification. A signed webhook and the callback verifier are idempotent.

## Security and privacy notes\n\n- Baseline security response headers are configured in `next.config.ts`; review them against the final hosting environment before launch.\n- `robots.ts` excludes account, editor, payment, print, reset-password, and API routes from search indexing. This is not an access-control mechanism; authentication and Supabase RLS remain authoritative.\n- Do not enable real payments until the Stage 5 checkout changes and all database migrations have been verified in a Paystack test environment.\n- Account-wide deletion, privacy notice, statutory payment-record retention, and the free-trial abuse-retention policy still require an explicit product/legal decision before public launch.\n\n## PDF deployment

PDFs are rendered by headless Chromium against the authenticated `/print/[id]` page so the server uses the same resume component and CSS as the live preview. Local development uses `CHROME_EXECUTABLE_PATH`; serverless deployments use `@sparticuz/chromium`. Choose a Node.js deployment target with sufficient memory and execution time for Chromium. `APP_BASE_URL` must be the public canonical origin in production.

## Project structure

- `src/app`: routes, account pages, API handlers, and print page
- `src/components/editor`: form controls, template picker, live preview, shared resume paper
- `src/components/layout`: application header and workspace navigation
- `src/lib`: CV types, validation, and Supabase clients
- `supabase/migrations`: schema, row-level security, entitlement and payment RPCs

## Checks

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` before deployment. Configure production Supabase auth URLs, Paystack live credentials/webhook, and PDF runtime before accepting real users or payments.
