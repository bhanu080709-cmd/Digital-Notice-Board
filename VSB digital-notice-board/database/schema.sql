-- CampusBoard Digital Notice Board schema
-- Run in Supabase Dashboard -> SQL Editor.
-- RLS is enabled. Public read is allowed; direct public writes are denied.
-- This educational starter uses the server-only service role key in Express,
-- so protect backend access and add authentication/authorization before real deployment.

create extension if not exists pgcrypto;

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null check (char_length(trim(title)) between 1 and 120),
  category varchar(30) not null check (category in ('Events', 'Academic', 'Examination', 'Clubs', 'General')),
  author varchar(80) not null check (char_length(trim(author)) between 1 and 80),
  description varchar(2000) not null check (char_length(trim(description)) between 1 and 2000),
  event_date date null,
  contact varchar(120) null check (contact is null or char_length(contact) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notices_created_at_idx on public.notices (created_at desc);
create index if not exists notices_category_idx on public.notices (category);
create index if not exists notices_event_date_idx on public.notices (event_date) where event_date is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notices_updated_at on public.notices;
create trigger set_notices_updated_at
before update on public.notices
for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

drop policy if exists "Anyone can read notices" on public.notices;
create policy "Anyone can read notices"
on public.notices for select
to anon, authenticated
using (true);

-- No anon/authenticated INSERT, UPDATE, or DELETE policies are intentionally added.
-- The Express server performs writes using a secret service-role key, which bypasses RLS.
-- Do not expose that key in frontend code or commit it. For production, add authentication
-- and role checks in the API, or redesign policies around Supabase Auth.
