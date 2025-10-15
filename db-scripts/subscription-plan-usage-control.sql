-- ============================================================
-- 🧱 Create profiles table linked to auth.users
-- ============================================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  avatar_url text,
  plan text default 'free',
  downloads_today int default 0,
  plan_resets_at timestamptz default (now() + interval '1 day'),
  joined_at timestamptz default now()
);

-- Automatically insert a profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
