# Paystack verification runbook

This runbook is for Stage 9 verification. Keep Paystack in **Test Mode** until every check below passes. Never paste secret keys into chat, commit them, expose them through a `NEXT_PUBLIC_` variable, or include them in screenshots.

## Required server configuration

Configure these values in the local environment or hosting provider's encrypted environment settings:

- `PAYSTACK_SECRET_KEY`: Paystack test secret key during testing; live secret key only after launch approval.
- `PAYSTACK_CALLBACK_URL`: absolute callback URL ending in `/payment/callback`.
- `APP_BASE_URL`: canonical application origin, such as the local development URL or production domain.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`: values from the same Supabase project. The Supabase secret is server-only.

In the Paystack dashboard, configure the webhook URL as `https://YOUR_PUBLIC_HOST/api/payments/webhook`. For local testing, use a trusted HTTPS tunnel and configure the temporary tunnel URL. Do not leave an expired tunnel URL configured.

## Database preflight

Apply migrations in filename order. Before applying `202611040003_checkout_reliability.sql` to a database that may already contain payment rows, inspect duplicate pending checkouts:

```sql
select owner_id, version_id, count(*) as pending_count,
       array_agg(provider_reference order by created_at) as references
from public.payments
where state = 'pending'
group by owner_id, version_id
having count(*) > 1;
```

If this returns rows, do not delete or mark payments failed blindly. Check every reference in the Paystack dashboard first. Preserve any transaction that may have succeeded; reconcile its state through the verified-payment flow. Only after the records have been reconciled should the one-pending-checkout unique index be created. Confirm the index exists:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'payments'
  and indexname = 'payments_one_pending_per_version';
```

## Test-mode acceptance checklist

1. **Start checkout:** sign in, create a CV version that requires payment, and select download. Confirm the browser is redirected to a Paystack-hosted `https://checkout.paystack.com/` URL and the payment history shows one pending ₦2,000 NGN transaction.
2. **Reuse pending checkout:** initiate the same version's checkout again before completing the first one. Confirm the existing checkout URL is reused and a second pending row is not created.
3. **Successful callback:** complete a test payment. Confirm the callback verifies the reference server-to-server, the payment changes to Successful, and the exact CV version receives a download entitlement.
4. **Webhook idempotency:** deliver the same successful webhook more than once. Confirm the endpoint acknowledges repeat delivery and only one entitlement exists for the version.
5. **Invalid signature:** send a webhook with a missing or altered `x-paystack-signature`. Confirm it receives HTTP 401 and no payment or entitlement changes.
6. **Amount/currency mismatch:** use a controlled test fixture or mocked provider response with a mismatched amount or currency. Confirm the database RPC rejects it and no entitlement is created.
7. **Failed/abandoned payment:** abandon or fail a test checkout. Confirm the callback does not grant access and a new checkout can be started after the failed state is recorded.
8. **Ownership:** while signed in as another test account, attempt to verify the first account's reference. Confirm the endpoint returns HTTP 404.
9. **History:** confirm each account sees only its own payment records and statuses.

Do not use real card details or make a live charge to test these cases. Use Paystack's current test payment instructions from its dashboard/documentation.

## Automated checks

The repository test suite covers reference format, HMAC-SHA512 signature verification against the exact raw request body, malformed signatures, and successful-charge payload validation. CI additionally runs lint, TypeScript type-checking, and a production build.

Automated unit tests do not replace a real Paystack test-mode transaction, a deployed HTTPS webhook delivery, or a Supabase migration check. Record those external checks separately before enabling live credentials.

## Go-live gate

- [ ] Stage 9 CI is green.
- [ ] All Supabase migrations are applied and the pending-checkout index is present.
- [ ] A successful test transaction grants exactly one entitlement.
- [ ] Invalid signatures and mismatched amount/currency are rejected.
- [ ] Callback, webhook retries, failed payment and payment history have been checked.
- [ ] Production callback and webhook URLs use HTTPS.
- [ ] Live Paystack credentials are stored only in hosting-provider secrets.
- [ ] A deliberate approval is given before switching Paystack to Live Mode.
