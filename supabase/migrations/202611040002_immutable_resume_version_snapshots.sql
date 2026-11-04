alter table public.resume_versions
  add column if not exists title_snapshot text not null default 'CV',
  add column if not exists content_snapshot jsonb;

comment on column public.resume_versions.content_snapshot is
  'Immutable normalized CV content used to render the exact fingerprinted version.';
comment on column public.resume_versions.title_snapshot is
  'CV title captured with the immutable version snapshot.';
