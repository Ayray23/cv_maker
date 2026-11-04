# CVForge — Product Specification

## Product direction

**Working name:** CVForge (replace after a name search and your approval). “CVForge” was inherited from the earlier planning conversation; the user asked for a different brand, so it is a temporary working label, not a final name.

**Purpose:** Help students, graduates, and professionals create a polished CV, tailor it when their experience changes, and pay transparently when they download. Web first, responsive and installable as a PWA. Freemium, priced in Nigerian naira.

**Promise:** Create and edit drafts free. Download a CV using a basic template twice free per account. After that, a successful download costs ₦2,000. A special template costs ₦2,000 per CV download from the beginning. An unchanged CV already downloaded can be downloaded again without paying; editing that CV makes its next download a new paid download once free downloads are exhausted.

## MVP scope

- Email/password and Google sign-in, account recovery, and a private CV dashboard.
- Guided editor for contact details, professional summary, experience, education, skills, projects, and certifications.
- Autosaved drafts, add/remove/reorder sections, template gallery, responsive live preview.
- One deliberately simple free template and a small curated set of premium special templates.
- PDF download only in the initial release; editing and previewing never consume a download entitlement.
- Two complimentary standard-template downloads per account; then ₦2,000 for each new CV version downloaded.
- ₦2,000 payment entitlement per special-template CV version from first download.
- Re-download without charge only when the CV content and template are unchanged from its last paid/free successful download.
- Payment status/history, clear pricing before checkout, success/failure/cancel states, account/CV deletion, privacy information.
- PWA install metadata and offline app shell. Do not cache CV contents or payment data offline by default.

## Core journeys

1. **Create:** Sign in → create draft → fill guided sections → choose standard template → preview and edit freely.
2. **First two standard downloads:** Select download → server checks account allowance → generate PDF → record successful download against the unchanged CV version.
3. **Paid standard download:** After allowance is exhausted, show ₦2,000 before redirecting to hosted checkout → verify payment on the server via provider webhook/API → unlock that exact CV version → generate/serve PDF.
4. **Special template:** Show ₦2,000 before checkout → confirm payment → unlock and download that CV version.
5. **Edit and download again:** Editing creates a new content version. Existing version remains re-downloadable; new version goes through the standard free allowance or ₦2,000 charge, as applicable.
6. **Account deletion:** Re-authenticate → explain deletion and any legally required payment-record retention → delete CV/profile data and revoke sessions. Prevent repeated free trials through abuse controls described below.

## Functional requirements

- Schema-validated CV data; autosave with visible saving/saved/error state; safe draft recovery.
- Accessible labels and keyboard navigation, mobile-first editor, legible PDF output.
- Version/fingerprint every downloadable CV representation (normalized content plus template and renderer version). Ignore transient editor metadata when comparing versions.
- Idempotent payment webhook handling; payment reference unique; never trust client-supplied “paid” state or amount.
- Reserve/check entitlement at checkout; consume free download only once a PDF is successfully generated and recorded. Handle concurrent download attempts transactionally.
- A paid entitlement is bound to the user, CV version fingerprint, and template. Re-download that entitlement freely; edits or template switch change fingerprint and require a new entitlement.
- Premium/standard flag and price come from server-controlled template catalogue.
- Account deletion and data-export policy; no CV text in logs or analytics.

## Data model (Supabase/Postgres)

- `profiles`: `id` references auth user, display name, created/updated timestamps.
- `resumes`: UUID, owner ID, title, structured JSONB content, selected template ID, timestamps, soft-delete/deletion state if needed.
- `resume_versions`: UUID, resume ID, owner ID, content fingerprint, template ID, renderer version, created timestamp.
- `download_entitlements`: UUID, owner ID, version ID/fingerprint, source (`free`/`payment`), payment ID nullable, created timestamp; unique constraints ensure one entitlement per version.
- `download_events`: UUID, owner ID, version ID, result/status, idempotency key, timestamp; only successful events consume free allowance.
- `payments`: UUID, owner ID, provider, provider reference unique, amount in kobo (₦2,000 = 200000), currency `NGN`, state, version ID/fingerprint, timestamps. Never store card details.
- `templates`: ID, display name, tier (`standard`/`special`), active flag, price in kobo, template metadata.
- Do not store a mutable “free downloads remaining” counter as sole authority; derive/count successful eligible standard downloads transactionally or maintain a transactionally reconciled counter.

## Architecture

- Next.js App Router + TypeScript; Tailwind CSS; Lucide icons; shared accessible UI components and light/dark theme tokens.
- Supabase Auth, Postgres, and RLS. Every user row is owned by `auth.uid()`; private server operations use a server client with verified session. Service role is server-only.
- Domain modules for CV schema/versioning, template catalogue, entitlement resolution, checkout adapter, webhook verification, and PDF rendering.
- Provider-neutral payment interface (`createCheckout`, `verifyPayment`, `parseWebhook`) so provider choice does not leak into product entitlement rules.
- Hosted checkout; server-created amount and reference; signed webhook plus server-side provider verification; idempotency and reconciliation for delayed/repeated callbacks.
- Deployable to Vercel or another Next-compatible host. Supabase project, OAuth credentials, domain, and environment variables are configured by owner; never commit secrets.
- Avoid external AI APIs in MVP. If AI writing is added later, CV data sharing must be explicit and consented.

## Privacy, security, and abuse resistance

- RLS on every user-owned table; test cross-account isolation before launch.
- Validate input server-side, restrict payload size, escape rendered text, and securely generate PDFs.
- Store payment amount in minor units and use `NGN`; validate amount, currency, owner, reference, and intended version against provider response.
- Never grant access from the browser return URL alone. Webhook signature and provider verification are required.
- Rate-limit login, checkout creation, and download endpoints; protect against replay and duplicate webhooks.
- User-requested deletion should remove the CV/profile and auth account subject to disclosed statutory payment-record retention. Deletion/re-signup must not silently reset trial eligibility.
- **Free-trial abuse decision:** Account/email binding is the minimum. Because account deletion/recreation is a concern, retain a privacy-minimal, access-controlled trial-abuse marker (for example a keyed hash of a verified email) separately from deleted CV content, and add rate limits/risk review. Do not promise this defeats alternate email addresses or device/VPN changes. Disclose retention and legal basis; decide retention period with Nigerian privacy counsel before launch. Never use invasive device fingerprinting by default.
- Data export/deletion, privacy notice, retention schedule, and breach response are launch requirements.

## Freemium and payment policy

- Standard templates: first two **successful downloads** free, account-wide; draft creation/editing does not count.
- Standard template after allowance: ₦2,000 for a new CV version download.
- Special template: ₦2,000 for each new CV version download, starting immediately; does not consume the standard free allowance.
- Same unchanged version + same template: free re-download after its initial authorized download.
- Content or template changes produce a new fingerprint/version; it needs a new entitlement. The two free downloads apply to the first two successful standard-version downloads across the account, not per CV.
- Payment failure, cancellation, or PDF generation failure produces no successful download/consumption. For paid transactions, confirm provider refund/compensation behavior if generation fails after payment.
- No subscription in MVP; usage is pay-per-download.

## Payment provider selection

**Recommendation: Paystack**, based on the official Nigeria pricing and product documentation reviewed on 4 November 2026. Paystack's published local fee is 1.5% + ₦100, with the ₦100 waived below ₦2,500 and local fee capped at ₦2,000. For a ₦2,000 charge, the published fee formula yields ₦30 (1.5%; ₦100 waived), leaving ₦1,970 before any applicable tax/settlement specifics. Flutterwave publishes 2% for local Nigeria collections (1.4% transaction + 0.6% platform fee), plus 7.5% VAT on transaction fees; on ₦2,000 this is ₦40 before VAT, with ₦3 VAT if assessed on that fee, for ₦43 total. Confirm exact fee treatment in merchant onboarding and dashboard before launch.

Paystack's server-initialized redirect checkout returns a hosted `authorization_url`, supports common local channels including cards, bank transfer, USSD and bank payment where enabled, and documents server-side transaction verification plus `charge.success` webhooks. Flutterwave also offers hosted Standard checkout and documents Nigeria methods including card, USSD, bank transfer, bank account, internet banking, QR, eNaira and OPay. Both are credible; Paystack has the lower published local fee at this price and a straightforward redirect flow, so it is the recommended starting integration. Provider onboarding, settlement eligibility, transaction limits, current channel availability, and fee/tax treatment must be confirmed on the merchant account before going live. No secrets are included in this repository.

Implementation approach: hosted Paystack redirect checkout, server-created NGN amount and unique reference, verified webhook plus server-side verify endpoint, idempotent entitlement grant, and branded clear return state. Do not trust the browser callback or client amount. Keep a provider adapter boundary in the codebase so a later switch remains practical. Local development can use a clearly labelled mock adapter only.

Sources checked 4 November 2026: [Paystack Nigeria transaction pricing](https://support.paystack.com/en/articles/2130306), [Paystack checkout integration](https://paystack.com/docs/payments/accept-payments/), [Paystack payment channels](https://paystack.com/docs/payments/payment-channels/), [Flutterwave Nigeria pricing](https://www.flutterwave.com/ng/pricing), [Flutterwave payment methods](https://developer.flutterwave.com/v3.0.0/docs/payment-methods), [Flutterwave hosted checkout](https://developer.flutterwave.com/docs/payment-ui).

## Milestones

1. **Foundation:** confirm brand and provider shortlist, Next.js/Tailwind/Lucide app shell, design tokens, Supabase schema and local configuration example.
2. **CV workflow:** auth, dashboard, editor, autosave, templates, preview and version fingerprints.
3. **Downloads:** PDF rendering, free allowance transaction, re-download entitlement, idempotent download events.
4. **Payments:** hosted checkout adapter, provider webhook verification, payment history, failure and refund handling.
5. **Launch hardening:** RLS/security review, deletion/retention, accessibility, PWA, monitoring, Vercel deployment configuration and privacy/legal review.

## Acceptance criteria

- User can sign up with email/password or Google, create/edit/reopen multiple private CVs, and see responsive preview.
- First two successful standard downloads across the account are free. The third new standard version requires ₦2,000.
- A special-template version requires ₦2,000 from the first download and does not reduce free standard allowance.
- Re-downloading an unchanged entitled version is free; edited content or a different template is a new version.
- Failed payment, cancelled checkout, duplicate webhook, and failed generation do not create duplicate charges or consume free allowance.
- Server is authoritative for price, ownership, payment confirmation, allowance, and entitlements.
- Users can request account/CV deletion; disclosed anti-abuse retention does not retain CV content.
- No real payment or OAuth secret is committed; production checkout remains disabled until owner configures provider credentials and callback URLs.
