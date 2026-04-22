-- Backfill public.profiles for auth.users rows created before
-- handle_new_user() trigger existed. Idempotent — safe to re-run.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  'admin'
from auth.users u
on conflict (id) do nothing;

-- Ensure every profile has role='admin' for single-role MVP.
update public.profiles
set role = 'admin'
where role is null or role = '';
