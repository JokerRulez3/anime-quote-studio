-- 1) Ensure the audit table exists (you already have it, this is idempotent)
create table if not exists public.user_downloads (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  quote_id bigint references public.quotes(id) on delete cascade,
  background_style text,
  font_style text,
  created_at timestamptz not null default now()
);

-- 2) (Optional) RLS for audit table — keep selects private, inserts via the RPC
alter table public.user_downloads enable row level security;

-- Allow a user to read only their own rows (optional)
drop policy if exists user_downloads_self_read on public.user_downloads;
create policy user_downloads_self_read
  on public.user_downloads for select
  using (auth.uid() = user_id);

-- Block direct inserts/updates/deletes from clients (we'll do them via SECURITY DEFINER)
drop policy if exists user_downloads_block_write on public.user_downloads;
create policy user_downloads_block_write
  on public.user_downloads for all
  using (false) with check (false);

-- 3) One RPC to do everything atomically and bypass RLS safely
drop function if exists public.record_download(uuid, bigint, text, text);

create or replace function public.record_download(
  p_user_id uuid,
  p_quote_id bigint,
  p_background_style text default null,
  p_font_style text default null
) returns void
language plpgsql
security definer          -- runs with the table owner's privileges
set search_path = public  -- critical for SECURITY DEFINER
as $$
begin
  -- 3a) Log the download
  insert into public.user_downloads (user_id, quote_id, background_style, font_style)
  values (p_user_id, p_quote_id, p_background_style, p_font_style);

  -- 3b) Bump per-day usage
  insert into public.user_daily_usage (user_id, day, downloads)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set downloads = public.user_daily_usage.downloads + 1;

  -- 3c) Increment quote counter
  update public.quotes
     set download_count = coalesce(download_count, 0) + 1
   where id = p_quote_id;
end;
$$;

-- 4) Allow authenticated clients to call it
grant execute on function public.record_download(uuid, bigint, text, text) to authenticated;

-- 5) (optional but useful) nudge PostgREST to reload the schema
select pg_notify('pgrst', 'reload schema');
