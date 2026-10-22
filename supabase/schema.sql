-- ============================================================
-- QR-ATT SUPABASE DATABASE SCHEMA
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student'
    check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. EVENTS
-- ------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. ATTENDANCE
-- ------------------------------------------------------------

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null
    references auth.users(id) on delete cascade,
  event_id uuid not null
    references public.events(id) on delete cascade,
  scanned_at timestamptz not null default now(),

  unique(student_id, event_id)
);

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

drop policy if exists "Profiles are viewable by owner"
on public.profiles;

create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);


drop policy if exists "Users can insert their own profile"
on public.profiles;

create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);


drop policy if exists "Users can update their own profile"
on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);


drop policy if exists "Teachers can view profiles of their attendees"
on public.profiles;

create policy "Teachers can view profiles of their attendees"
on public.profiles
for select
using (
  exists (
    select 1
    from public.attendance a
    join public.events e
      on e.id = a.event_id
    where a.student_id = profiles.id
      and e.created_by = auth.uid()
  )
);

-- ============================================================
-- EVENTS POLICIES
-- ============================================================

drop policy if exists "Events are readable by any authenticated user"
on public.events;

create policy "Events are readable by any authenticated user"
on public.events
for select
using (auth.role() = 'authenticated');


drop policy if exists "Users can insert events"
on public.events;

create policy "Users can insert events"
on public.events
for insert
with check (
  auth.uid() = created_by
);


drop policy if exists "Users can update their own events"
on public.events;

create policy "Users can update their own events"
on public.events
for update
using (
  auth.uid() = created_by
);

-- ============================================================
-- ATTENDANCE POLICIES
-- ============================================================

drop policy if exists "Students can view their own attendance"
on public.attendance;

create policy "Students can view their own attendance"
on public.attendance
for select
using (
  auth.uid() = student_id
);


drop policy if exists "Students can insert their own attendance"
on public.attendance;

create policy "Students can insert their own attendance"
on public.attendance
for insert
with check (
  auth.uid() = student_id
);


drop policy if exists "Teachers can view attendance for their events"
on public.attendance;

create policy "Teachers can view attendance for their events"
on public.attendance
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = attendance.event_id
      and e.created_by = auth.uid()
  )
);

-- ============================================================
-- NEW USER PROFILE TRIGGER
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher'
      else 'student'
    end
  );

  return new;
end;
$$;


drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ============================================================
-- DONE
-- ============================================================