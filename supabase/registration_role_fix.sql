-- QR-ATT: Fix public registration so teacher/student role and name are saved.
-- Safe to run on the existing schema. Does not modify existing user records.
-- Run in Supabase SQL Editor after reviewing the deployed schema.

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

-- The existing on_auth_user_created trigger should already call handle_new_user().
-- This migration intentionally does not drop/recreate the trigger or change RLS policies.

-- After running this migration, correct a teacher account that was already created
-- with role='student' by replacing the email below with the exact account email.
-- Run this correction separately only after verifying the matching auth.users/profile row:
-- update public.profiles p
-- set role = 'teacher'
-- from auth.users u
-- where p.id = u.id
--   and lower(u.email) = lower('YOUR_TEACHER_EMAIL')
--   and p.role = 'student';
