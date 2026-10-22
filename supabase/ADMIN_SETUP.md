# QR-ATT: Create the first admin account

Run this setup only in the Supabase project connected to your QR-ATT app.

## 1. Back up and inspect

1. Back up the current Supabase schema/data before changing roles or policies.
2. In Supabase Dashboard, open **SQL Editor** and inspect `public.profiles`, its role check constraint, and existing RLS policies.
3. Confirm the deployed schema matches the project's `supabase/schema.sql`. The migration below expects `profiles_role_check` to be the role constraint name used by this project.

## 2. Apply the migration

Open `supabase/admin_dashboard_migration.sql`, review it, and run it in the Supabase SQL Editor. It adds `admin` to the role constraint, prevents self-assignment of the admin role, and adds read policies for admin dashboard data. It does not create or delete user, event, or attendance records.

If your live schema differs from the supplied schema, stop and adapt the migration before running it.

## Teacher registration role fix

If newly registered teachers are saved as `student`, run `supabase/registration_role_fix.sql` in the SQL Editor. The app also needs the updated `lib/auth.ts` from this ZIP so signup sends `full_name` and `role` as Auth metadata. The database trigger accepts only `teacher` or defaults to `student`; public signup cannot create an admin.

For a teacher account that already exists with the wrong role, first verify the exact email and matching Auth/profile IDs, then run the commented correction query in `registration_role_fix.sql` after replacing `YOUR_TEACHER_EMAIL`. Do not change roles by guessing an account ID.

## 3. Create the Auth user

1. Open **Authentication → Users** in Supabase Dashboard.
2. Create the administrator account using the intended email and a strong password.
3. Confirm that a corresponding row exists in `public.profiles` and that its `id` equals the Auth user's `id`:

```sql
select u.id as auth_user_id, u.email, p.id as profile_id, p.role
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('YOUR_ADMIN_EMAIL');
```

Replace `YOUR_ADMIN_EMAIL` with the actual account email. Do not paste passwords or service-role keys into SQL or the app.

## 4. Assign the admin role

After verifying that exactly the intended Auth user and profile are returned, run this in the trusted Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id
  from auth.users
  where lower(email) = lower('YOUR_ADMIN_EMAIL')
);
```

Replace the email placeholder. Verify the result:

```sql
select id, email, full_name, role
from public.profiles
where lower(email) = lower('YOUR_ADMIN_EMAIL');
```

The role should be `admin`. If no profile row exists, stop and investigate the existing signup trigger instead of creating a duplicate profile.

## 5. Test access

1. Sign in to QR-ATT with the administrator account.
2. Confirm that the Admin tab appears and opens the dashboard.
3. Verify user counts, account distribution, recent attendance records, and the 7-day activity chart against known Supabase records.
4. Sign in with a student and teacher account. Confirm neither sees the Admin tab and neither can read all profiles or attendance through the client.
5. Verify that student and teacher registration and profile-name editing still work.

## Security notes

- Never add a Supabase service-role key to `.env` variables prefixed with `EXPO_PUBLIC_`, mobile source code, or an APK.
- Do not add an admin choice to public registration.
- The admin dashboard is read-only by design. It does not edit or delete accounts.
- The mobile route guard improves navigation but Supabase RLS is the data security boundary.
