-- Keep resume ordering accurate after every update and make generated versions immutable.
alter table public.resume_versions
  add column if not exists title_snapshot text,
  add column if not exists content_snapshot jsonb;

update public.resume_versions as versions
set
  title_snapshot = coalesce(versions.title_snapshot, resumes.title, 'CV'),
  content_snapshot = coalesce(versions.content_snapshot, resumes.content, '{}'::jsonb)
from public.resumes as resumes
where resumes.id = versions.resume_id
  and (versions.title_snapshot is null or versions.content_snapshot is null);

update public.resume_versions
set
  title_snapshot = coalesce(title_snapshot, 'CV'),
  content_snapshot = coalesce(content_snapshot, '{}'::jsonb)
where title_snapshot is null or content_snapshot is null;

alter table public.resume_versions
  alter column title_snapshot set not null,
  alter column content_snapshot set not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.prevent_resume_version_snapshot_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.resume_id,
    new.owner_id,
    new.content_fingerprint,
    new.template_id,
    new.renderer_version,
    new.title_snapshot,
    new.content_snapshot
  ) is distinct from row(
    old.resume_id,
    old.owner_id,
    old.content_fingerprint,
    old.template_id,
    old.renderer_version,
    old.title_snapshot,
    old.content_snapshot
  ) then
    raise exception 'Resume version snapshots are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists resume_versions_prevent_snapshot_mutation on public.resume_versions;
create trigger resume_versions_prevent_snapshot_mutation
before update on public.resume_versions
for each row execute function public.prevent_resume_version_snapshot_mutation();
