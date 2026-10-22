-- QR-ATT Admin Dashboard migration
-- Review against the deployed Supabase schema before running.
-- This migration preserves existing profile, event, and attendance rows.

begin;

-- 1. Allow the trusted admin role while preserving existing role values.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- 2. Prevent an authenticated user from assigning the admin role to themselves.
-- Trusted SQL Editor operations can assign the first admin because auth.uid() is null there.
create or replace function public.prevent_self_admin_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'admin' and auth.uid() = new.id then
      raise exception 'Admin role must be assigned by a trusted administrator.';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role = 'admin'
       and old.role is distinct from 'admin'
       and auth.uid() = old.id then
      raise exception 'Admin role must be assigned by a trusted administrator.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_self_admin_assignment_insert on public.profiles;
create trigger prevent_self_admin_assignment_insert
before insert on public.profiles
for each row
execute function public.prevent_self_admin_assignment();

drop trigger if exists prevent_self_admin_assignment_update on public.profiles;
create trigger prevent_self_admin_assignment_update
before update of role on public.profiles
for each row
execute function public.prevent_self_admin_assignment();

-- 3. Security-definer helper avoids recursive profile RLS checks in admin policies.
create or replace function public.is_qr_att_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_qr_att_admin() from public;
grant execute on function public.is_qr_att_admin() to authenticated;

-- 4. Admins may read all profile records. Existing owner/teacher policies remain intact.
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_qr_att_admin());

-- 5. Admins may read attendance for dashboard records and analytics.
-- Existing student and event-owner policies remain intact.
drop policy if exists "Admins can view all attendance" on public.attendance;
create policy "Admins can view all attendance"
on public.attendance
for select
to authenticated
using (public.is_qr_att_admin());

commit;
