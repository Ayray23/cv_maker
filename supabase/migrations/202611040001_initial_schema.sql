create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.templates (
  id text primary key,
  display_name text not null,
  tier text not null check (tier in ('standard', 'special')),
  price_minor integer not null default 0 check (price_minor >= 0),
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint template_price_matches_tier check (
    (tier = 'standard' and price_minor = 0) or
    (tier = 'special' and price_minor = 200000)
  )
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled CV',
  content jsonb not null default '{}'::jsonb,
  selected_template_id text not null references public.templates (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  content_fingerprint text not null,
  template_id text not null references public.templates (id),
  renderer_version text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, content_fingerprint)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  version_id uuid not null references public.resume_versions (id) on delete cascade,
  provider text not null,
  provider_reference text not null unique,
  amount_minor integer not null check (amount_minor = 200000),
  currency text not null default 'NGN' check (currency = 'NGN'),
  state text not null default 'pending' check (state in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.download_entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  version_id uuid not null references public.resume_versions (id) on delete cascade,
  source text not null check (source in ('free', 'payment')),
  payment_id uuid unique references public.payments (id),
  created_at timestamptz not null default now(),
  unique (owner_id, version_id),
  constraint payment_source_has_payment check (
    (source = 'free' and payment_id is null) or
    (source = 'payment' and payment_id is not null)
  )
);

create table public.download_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  version_id uuid not null references public.resume_versions (id) on delete cascade,
  idempotency_key text not null,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index resumes_owner_updated_idx on public.resumes (owner_id, updated_at desc);
create index resume_versions_owner_created_idx on public.resume_versions (owner_id, created_at desc);
create index download_events_owner_status_idx on public.download_events (owner_id, status);
create index payments_owner_created_idx on public.payments (owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.payments enable row level security;
alter table public.download_entitlements enable row level security;
alter table public.download_events enable row level security;
alter table public.templates enable row level security;

create policy "Users can view their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can view their own resumes" on public.resumes
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can create their own resumes" on public.resumes
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users can update their own resumes" on public.resumes
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Users can delete their own resumes" on public.resumes
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Users can view their own resume versions" on public.resume_versions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can view their own payments" on public.payments
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can view their own download entitlements" on public.download_entitlements
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can view their own download events" on public.download_events
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Anyone can view active templates" on public.templates
  for select using (active = true);

revoke insert, update, delete on public.resume_versions from anon, authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.download_entitlements from anon, authenticated;
revoke insert, update, delete on public.download_events from anon, authenticated;
revoke insert, update, delete on public.templates from anon, authenticated;

insert into public.templates (id, display_name, tier, price_minor, config)
values
  ('essential', 'Essential', 'standard', 0, '{"layout":"single-column","accent":"sage"}'),
  ('editorial', 'Editorial', 'standard', 0, '{"layout":"classic","accent":"charcoal"}'),
  ('monogram', 'Monogram', 'special', 200000, '{"layout":"personal","accent":"sand"}'),
  ('atelier', 'Atelier', 'special', 200000, '{"layout":"sidebar","accent":"olive"}');

comment on table public.download_entitlements is 'Create/update only from trusted server functions after transactional allowance checks or verified provider payment.';
comment on table public.payments is 'Insert and update only in trusted server code after provider reference verification.';

create or replace function public.claim_free_download(
  p_owner_id uuid,
  p_version_id uuid,
  p_idempotency_key text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_source text;
  version_template text;
  version_tier text;
  free_downloads bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));

  select e.source into existing_source
  from public.download_entitlements e
  where e.owner_id = p_owner_id and e.version_id = p_version_id;

  if existing_source is not null then
    insert into public.download_events (owner_id, version_id, idempotency_key, status)
    values (p_owner_id, p_version_id, p_idempotency_key, 'succeeded')
    on conflict (owner_id, idempotency_key) do nothing;
    return 'existing';
  end if;

  select v.template_id, t.tier into version_template, version_tier
  from public.resume_versions v
  join public.templates t on t.id = v.template_id and t.active = true
  where v.id = p_version_id and v.owner_id = p_owner_id;

  if version_template is null then return 'invalid_version'; end if;
  if version_tier <> 'standard' then return 'payment_required'; end if;

  select count(*) into free_downloads
  from public.download_entitlements e
  join public.resume_versions v on v.id = e.version_id
  join public.templates t on t.id = v.template_id
  where e.owner_id = p_owner_id and e.source = 'free' and t.tier = 'standard';

  if free_downloads >= 2 then return 'payment_required'; end if;

  insert into public.download_entitlements (owner_id, version_id, source)
  values (p_owner_id, p_version_id, 'free');
  insert into public.download_events (owner_id, version_id, idempotency_key, status)
  values (p_owner_id, p_version_id, p_idempotency_key, 'succeeded')
  on conflict (owner_id, idempotency_key) do nothing;
  return 'granted';
end;
$$;

create or replace function public.record_verified_paystack_payment(
  p_reference text,
  p_amount_minor integer,
  p_currency text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment public.payments%rowtype;
begin
  select * into target_payment from public.payments
  where provider_reference = p_reference and provider = 'paystack'
  for update;

  if not found then return 'unknown_reference'; end if;
  if p_amount_minor <> target_payment.amount_minor or p_currency <> target_payment.currency then return 'amount_mismatch'; end if;
  if target_payment.state = 'refunded' then return 'refunded'; end if;
  if target_payment.state = 'succeeded' then return 'already_processed'; end if;

  update public.payments set state = 'succeeded', updated_at = now() where id = target_payment.id;
  insert into public.download_entitlements (owner_id, version_id, source, payment_id)
  values (target_payment.owner_id, target_payment.version_id, 'payment', target_payment.id)
  on conflict (owner_id, version_id) do nothing;
  return 'processed';
end;
$$;

revoke all on function public.claim_free_download(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_free_download(uuid, uuid, text) to service_role;
revoke all on function public.record_verified_paystack_payment(text, integer, text) from public, anon, authenticated;
grant execute on function public.record_verified_paystack_payment(text, integer, text) to service_role;
