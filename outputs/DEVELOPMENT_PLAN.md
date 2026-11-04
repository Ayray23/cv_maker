# CVForge — Development Plan

## Current decisions

- Audience: students, graduates, and professionals.
- Platform: responsive web app first, with PWA support.
- Stack preference: React/Next.js, Tailwind CSS, Lucide, Supabase.
- Currency and price: ₦2,000 per payable CV version download.
- First two successful standard-template downloads per account are free.
- Special-template downloads cost ₦2,000 from the first version download.
- Editing is free. An unchanged version can be downloaded again without another charge; edits or a template change create a new payable version after free standard uses are exhausted.
- Email/password and Google sign-in; user-managed account/CV deletion, with disclosed privacy-minimal trial-abuse controls.
- Hosting likely Vercel or a comparable free tier; keep deployment portable.
- Temporary brand: CVForge; user wants a different name to be proposed and approved.
- Payment provider recommendation: Paystack, based on 4 November 2026 published pricing (₦30 estimated fee on a ₦2,000 local payment versus Flutterwave's ₦40 plus applicable VAT). Confirm merchant dashboard terms and channel eligibility before live launch. Use hosted redirect checkout and verify payments server-side.

## Work phases

1. **Product foundation:** finalize name and payment provider, scaffold Next.js app, visual system, accessible navigation, Supabase setup example and initial RLS migrations.
2. **CV workflow:** auth and account recovery, CV dashboard, structured editor, autosave, template catalogue and live preview.
3. **PDF/entitlements:** stable version fingerprints, two-download standard allowance, special template price gate, paid-version re-download, PDF generation.
4. **Checkout:** provider adapter, hosted checkout, signed webhook and server-side payment verification, payment history, failed/cancelled/refund states.
5. **Launch:** account deletion/privacy retention, accessibility and responsive review, PWA shell, security/abuse review, Vercel deployment setup and monitoring.

## First release boundary

Include email and Google auth, CV editing, a small set of clearly differentiated templates, live preview, PDF downloads, trial/paid entitlement handling, hosted payment integration, and account deletion. Defer AI writing, DOCX export, subscriptions, collaboration, and multiple locales until after launch.

## Workspace status

The project folder began without a repository or application scaffold. The detailed requirements and phased plan are in `PRODUCT_SPEC.md` and this file. The initial application interface is being developed separately; credentials and production payment configuration will be supplied by the owner when provider selection is complete.
