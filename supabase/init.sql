-- ============================================================================
-- Gowri Toys - Attendance Management System
-- Single bootstrap migration. Fully idempotent: safe to run on every app start.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  role text not null default 'supervisor' check (role in ('admin', 'supervisor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workers
-- ---------------------------------------------------------------------------
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null unique,
  name text not null,
  phone text,
  department text,
  designation text,
  joining_date date,
  avatar_url text,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent guard for databases created before soft-delete support.
alter table if exists public.workers add column if not exists deleted_at timestamptz;

-- Idempotent guard for databases created before profile-photo support.
alter table if exists public.workers add column if not exists avatar_url text;

-- Daily salary (daily payout rate used for payroll).
-- Nullable: null means the worker's salary has not been configured yet.
-- Only admins may set or change this value (see salary trigger below).
alter table if exists public.workers add column if not exists daily_salary numeric
  check (daily_salary is null or daily_salary >= 0);

-- ---------------------------------------------------------------------------
-- Shifts
-- ---------------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  shift_code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete restrict,
  shift_id uuid not null references public.shifts (id) on delete restrict,
  attendance_date date not null,
  status text not null default 'present' check (status in ('present', 'absent', 'leave', 'half_day')),
  marked_at timestamptz not null default now(),
  marked_by uuid references public.profiles (id),
  method text not null default 'qr' check (method in ('qr', 'manual')),
  created_at timestamptz not null default now(),
  -- A worker cannot be marked twice for the same shift on the same day.
  constraint uq_attendance_worker_shift_date unique (worker_id, shift_id, attendance_date)
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null default 'monthly_attendance',
  report_month date,
  file_name text not null,
  storage_path text not null,
  generated_by uuid references public.profiles (id),
  generated_at timestamptz not null default now()
);

-- Payroll figures captured when the report was generated so that history stays
-- reproducible even if a worker's daily_salary is changed later.
alter table if exists public.reports add column if not exists payroll_total numeric;
alter table if exists public.reports add column if not exists salary_snapshot jsonb;

-- ---------------------------------------------------------------------------
-- Company settings
-- ---------------------------------------------------------------------------
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  address text not null default '',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_workers_updated_at on public.workers;
create trigger trg_workers_updated_at
before update on public.workers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Salary ownership: only admins may set or change daily_salary.
--
-- Supervisors may still add/edit workers in every other way. On INSERT by a
-- non-admin the salary is silently cleared; on UPDATE a non-admin changing the
-- salary raises an error. Service-role / admin operations keep working because
-- current_user_role() is null for the service role (treated as not-an-admin is
-- false, so the guard is skipped).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_non_admin_salary_changes() returns trigger
language plpgsql
as $$
begin
  if public.current_user_role() = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.daily_salary := null;
  elsif new.daily_salary is distinct from old.daily_salary then
    raise exception 'Only admins can set or change worker salary';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_workers_salary_admin on public.workers;
create trigger trg_workers_salary_admin
before insert or update on public.workers
for each row execute function public.prevent_non_admin_salary_changes();

drop trigger if exists trg_company_settings_updated_at on public.company_settings;
create trigger trg_company_settings_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto generate next Worker ID (WRK001, WRK002, ...)
-- ---------------------------------------------------------------------------
create or replace function public.generate_next_worker_id() returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  max_num integer;
begin
  select coalesce(max(substring(worker_id from 4)::integer), 0)
  into max_num
  from public.workers;
  return 'WRK' || lpad((max_num + 1)::text, 3, '0');
end;
$$;

create or replace function public.set_worker_id() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.worker_id is null or new.worker_id = '' then
    new.worker_id := public.generate_next_worker_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_worker_id on public.workers;
create trigger trg_set_worker_id
before insert on public.workers
for each row execute function public.set_worker_id();

-- ---------------------------------------------------------------------------
-- Auto create profile when a Supabase Auth user is created.
-- Put { "full_name": "...", "role": "admin" | "supervisor" } in user metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'supervisor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_attendance_worker on public.attendance (worker_id);
create index if not exists idx_attendance_shift on public.attendance (shift_id);
create index if not exists idx_attendance_date on public.attendance (attendance_date);
create index if not exists idx_attendance_marked_by on public.attendance (marked_by);
create index if not exists idx_attendance_date_shift on public.attendance (attendance_date, shift_id);
create index if not exists idx_attendance_worker_date on public.attendance (worker_id, attendance_date);
create index if not exists idx_workers_active on public.workers (active);
create index if not exists idx_reports_report_month on public.reports (report_month);

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
insert into public.shifts (shift_code, name)
values ('SHIFT_1', 'Shift 1'), ('SHIFT_2', 'Shift 2')
on conflict (shift_code) do nothing;

insert into public.company_settings (company_name, address)
values ('Gowri Toys', '')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.shifts enable row level security;
alter table public.attendance enable row level security;
alter table public.reports enable row level security;
alter table public.company_settings enable row level security;

-- Helper: role of the current user (null when not signed in)
create or replace function public.current_user_role() returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "workers_select_all_authenticated" on public.workers;
create policy "workers_select_all_authenticated"
on public.workers for select
using (auth.role() = 'authenticated');

drop policy if exists "workers_admin_insert" on public.workers;
drop policy if exists "workers_manage_insert" on public.workers;
create policy "workers_manage_insert"
on public.workers for insert
with check (public.current_user_role() in ('admin', 'supervisor'));

drop policy if exists "workers_admin_update" on public.workers;
drop policy if exists "workers_manage_update" on public.workers;
create policy "workers_manage_update"
on public.workers for update
using (public.current_user_role() in ('admin', 'supervisor'))
with check (public.current_user_role() in ('admin', 'supervisor'));

drop policy if exists "workers_admin_delete" on public.workers;
drop policy if exists "workers_manage_delete" on public.workers;
create policy "workers_manage_delete"
on public.workers for delete
using (public.current_user_role() in ('admin', 'supervisor'));

drop policy if exists "shifts_select_all_authenticated" on public.shifts;
create policy "shifts_select_all_authenticated"
on public.shifts for select
using (auth.role() = 'authenticated');

drop policy if exists "attendance_select_all_authenticated" on public.attendance;
create policy "attendance_select_all_authenticated"
on public.attendance for select
using (auth.role() = 'authenticated');

drop policy if exists "reports_select_all_authenticated" on public.reports;
create policy "reports_select_all_authenticated"
on public.reports for select
using (auth.role() = 'authenticated');

drop policy if exists "company_settings_select_all_authenticated" on public.company_settings;
create policy "company_settings_select_all_authenticated"
on public.company_settings for select
using (auth.role() = 'authenticated');

drop policy if exists "company_settings_admin_all" on public.company_settings;
create policy "company_settings_admin_all"
on public.company_settings for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "attendance_reports_select_authenticated" on storage.objects;
create policy "attendance_reports_select_authenticated"
on storage.objects for select
using (bucket_id = 'attendance-reports' and auth.role() = 'authenticated');

drop policy if exists "avatars_select_authenticated" on storage.objects;
create policy "avatars_select_authenticated"
on storage.objects for select
using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars_insert_authenticated" on storage.objects;
create policy "avatars_insert_authenticated"
on storage.objects for insert
with check (bucket_id = 'avatars' and public.current_user_role() in ('admin', 'supervisor'));

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attendance-reports', 'attendance-reports', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper view for monthly rollups (used by the report generator)
-- ---------------------------------------------------------------------------
create or replace view public.monthly_attendance_summary as
select
  w.id,
  w.worker_id,
  w.name,
  s.shift_code,
  a.attendance_date
from public.attendance a
join public.workers w on w.id = a.worker_id
join public.shifts s on s.id = a.shift_id
order by w.worker_id, a.attendance_date;

-- ---------------------------------------------------------------------------
-- Test users (admin + supervisor). Passwords: password123
-- Creating users is handled by scripts/db-setup.mjs via the Auth admin API so
-- the hashes are always GoTrue-compatible. This block only removes stale test
-- accounts that nothing references (attendance.marked_by) so an in-use
-- database is never clobbered.
-- ---------------------------------------------------------------------------
delete from public.profiles p
where p.email in ('admin@gowritoys.com', 'supervisor@gowritoys.com')
  and not exists (select 1 from public.attendance a where a.marked_by = p.id);

delete from auth.users u
where u.email in ('admin@gowritoys.com', 'supervisor@gowritoys.com')
  and not exists (select 1 from public.attendance a where a.marked_by = u.id);