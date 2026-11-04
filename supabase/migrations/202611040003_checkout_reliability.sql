alter table public.payments
  add column if not exists checkout_url text;

create unique index if not exists payments_one_pending_per_version
  on public.payments (owner_id, version_id)
  where state = 'pending';

comment on column public.payments.checkout_url is
  'Paystack hosted checkout URL for retry-safe recovery of an existing pending payment.';
