-- =====================================================================
-- Anime Quote Studio: One-shot DB Optimization & Safety Migration
-- Version: trigger-maintained FTS (no generated columns)
-- Safe to run multiple times (idempotent).
-- =====================================================================
-- 0) EXTENSIONS ---------------------------------------------------------
create extension if not exists unaccent;

create extension if not exists pg_trgm;

create extension if not exists pgcrypto;

-- 1) COLUMN HYGIENE & TIMESTAMPS ---------------------------------------
do $$
begin
  -- Ensure timestamptz for created_at (if columns exist)
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='anime' and column_name='created_at') then
    alter table public.anime alter column created_at type timestamptz using created_at::timestamptz;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='characters' and column_name='created_at') then
    alter table public.characters alter column created_at type timestamptz using created_at::timestamptz;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='created_at') then
    alter table public.quotes alter column created_at type timestamptz using created_at::timestamptz;
  end if;

  -- Add updated_at + trigger to auto-maintain (quotes)
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='updated_at') then
    alter table public.quotes add column updated_at timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='quotes' and trigger_name='trg_quotes_updated_at') then
    create or replace function public.set_updated_at() returns trigger language plpgsql as $f$
    begin
      new.updated_at = now();
      return new;
    end $f$;
    create trigger trg_quotes_updated_at
      before update on public.quotes
      for each row execute function public.set_updated_at();
  end if;

  -- Tighten NOT NULLs where appropriate (only if columns exist)
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='characters' and column_name='anime_id') then
    alter table public.characters alter column anime_id set not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='character_id') then
    alter table public.quotes alter column character_id set not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='anime_id') then
    alter table public.quotes alter column anime_id set not null;
  end if;
end $$;

-- 2) UNIQUENESS & FK HOT INDEXES ---------------------------------------
-- Avoid duplicate characters within same anime
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='uq_characters_name_anime') then
    create unique index uq_characters_name_anime on public.characters (lower(name), anime_id);
  end if;
end $$;

-- Avoid duplicate quotes for same character+anime (using md5(text) to keep index small)
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='uq_quotes_text_char_anime') then
    create unique index uq_quotes_text_char_anime on public.quotes (md5(quote_text), character_id, anime_id);
  end if;
end $$;

-- FK supporting indexes
create index if not exists idx_quotes_character_id on public.quotes (character_id);

create index if not exists idx_quotes_anime_id on public.quotes (anime_id);

-- 3) STATUS & RLS (PUBLIC READ ONLY APPROVED) ---------------------------
-- Status enum + column
do $$
begin
  if not exists (select 1 from pg_type where typname='quote_status') then
    create type quote_status as enum ('pending','approved','flagged','removed');
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='status') then
    alter table public.quotes add column status quote_status not null default 'approved';
  end if;
end $$;

-- Enable RLS (idempotent)
alter table public.quotes enable row level security;

-- Replace permissive policy with approved-only policy
drop policy if exists "Allow public read access" on public.quotes;

drop policy if exists quotes_public_read on public.quotes;

create policy quotes_public_read on public.quotes for
select
  using (status = 'approved');

-- 4) FULL-TEXT SEARCH (TRIGGER-MAINTAINED TSV) -------------------------
-- Ensure a plain tsv column (NOT a generated column)
do $$
begin
  -- If tsv exists and was generated, drop and re-add; otherwise ensure existence
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='quotes' and column_name='tsv'
  ) then
    begin
      -- Safe drop; will no-op if already plain
      alter table public.quotes drop column tsv;
    exception when others then
      -- ignore
      perform 1;
    end;
  end if;
end$$;

alter table public.quotes
add column if not exists tsv tsvector;

-- Trigger function to compute tsv from quote_text (no cached names here)
create or replace function public.update_quotes_tsv () returns trigger language plpgsql as $$
begin
  new.tsv :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.quote_text, ''))), 'A');
  return new;
end$$;

-- Trigger on insert/update of quote_text
drop trigger if exists trg_quotes_tsv on public.quotes;

create trigger trg_quotes_tsv before insert
or
update of quote_text on public.quotes for each row
execute function public.update_quotes_tsv ();

-- Backfill existing rows (only when tsv is null)
update public.quotes
set
  tsv = setweight(
    to_tsvector('simple', unaccent (coalesce(quote_text, ''))),
    'A'
  )
where
  tsv is null;

-- Indexes for FTS + fuzzy
create index if not exists quotes_tsv_gin on public.quotes using gin (tsv);

create index if not exists quotes_quote_trgm on public.quotes using gin (quote_text gin_trgm_ops);

-- 5) HOT-PATH SORT INDEXES ---------------------------------------------
create index if not exists quotes_status_views_idx on public.quotes (status, view_count desc);

create index if not exists quotes_status_created_idx on public.quotes (status, created_at desc);

-- Optional: index filters
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='emotion') then
    create index if not exists quotes_emotion_btree on public.quotes (emotion);
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quotes' and column_name='tags') then
    create index if not exists quotes_tags_gin on public.quotes using gin (tags);
  end if;
end $$;

drop function if exists public.search_quotes (text, int, int);

-- 6) RPC: FAST SEARCH WITH PAGINATION (joins only to decorate) ---------
create or replace function public.search_quotes (
  in search_text text default null,
  in page int default 1,
  in page_size int default 24
) returns table (
  id bigint,
  quote_text text,
  character_name text,
  anime_title text,
  episode_number int,
  emotion text,
  view_count int,
  download_count int,
  rank real,
  created_at timestamptz
) language sql stable as $$
  with base as (
    select q.*,
           case
             when search_text is null or length(btrim(search_text)) = 0
               then 0
             else ts_rank(q.tsv, plainto_tsquery('simple', unaccent(search_text)))
           end as r
    from public.quotes q
    where q.status = 'approved'
      and (
        search_text is null
        or q.tsv @@ plainto_tsquery('simple', unaccent(search_text))
      )
  )
  select
    b.id,
    b.quote_text,
    c.name as character_name,
    a.title as anime_title,
    b.episode_number,
    b.emotion,
    b.view_count,
    b.download_count,
    b.r as rank,
    b.created_at
  from base b
  join public.characters c on c.id = b.character_id
  join public.anime a on a.id = b.anime_id
  order by
    (case when search_text is null then 0 else b.r end) desc,
    b.created_at desc
  limit page_size
  offset greatest(page - 1, 0) * page_size;
$$;

-- 7) RANDOM QUOTE WITHOUT FULL TABLE SCAN ------------------------------
-- Drop old version first
drop function if exists public.random_quote ();

create or replace function public.random_quote()
returns table (
  id bigint,
  quote_text text,
  character_name text,
  anime_title text,
  episode_number int,
  emotion text
)
language sql stable as $$
with samp as (
  select q.id, q.quote_text, c.name as character_name, a.title as anime_title, q.episode_number, q.emotion
  from public.quotes q TABLESAMPLE SYSTEM (1)
  join public.characters c on c.id = q.character_id
  join public.anime a on a.id = q.anime_id
  where q.status = 'approved'
  limit 1
),
latest as (
  select q.id, q.quote_text, c.name as character_name, a.title as anime_title, q.episode_number, q.emotion
  from public.quotes q
  join public.characters c on c.id = q.character_id
  join public.anime a on a.id = q.anime_id
  where q.status = 'approved'
  order by q.created_at desc
  limit 1
),
unioned as (
  select 1 as src, * from samp
  union all
  select 2 as src, * from latest
)
select id, quote_text, character_name, anime_title, episode_number, emotion
from unioned
order by src
limit 1
$$;

-- 8) ATOMIC COUNTERS (NO RACE CONDITIONS) ------------------------------
create or replace function public.increment_view_count (qid bigint) returns void language sql as $$
  update public.quotes set view_count = coalesce(view_count,0)+1 where id = qid;
$$;

create or replace function public.increment_download_count (qid bigint) returns void language sql as $$
  update public.quotes set download_count = coalesce(download_count,0)+1 where id = qid;
$$;

-- 9) DAILY USAGE LEDGER (CAPS & AUDIT-FRIENDLY) ------------------------
create table if not exists public.user_daily_usage (
  user_id uuid references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  downloads int not null default 0,
  primary key (user_id, day)
);

create or replace function public.get_downloads_today (user_id uuid) returns int language sql stable as $$
  select coalesce(downloads,0)
  from public.user_daily_usage
  where user_id=$1 and day=(now() at time zone 'utc')::date;
$$;

create or replace function public.bump_download (user_id uuid) returns void language sql as $$
  insert into public.user_daily_usage (user_id, day, downloads)
       values ($1, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
      set downloads = public.user_daily_usage.downloads + 1;
$$;

-- 10) FAVORITES (FAST TOGGLES) -----------------------------------------
create table if not exists public.user_favorites (
  user_id uuid references auth.users (id) on delete cascade,
  quote_id bigint references public.quotes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quote_id)
);

create index if not exists favs_user_idx on public.user_favorites (user_id);

create index if not exists favs_quote_idx on public.user_favorites (quote_id);

-- 11) SITE STATS (NO FULL TABLE SCANS) ---------------------------------
create table if not exists public.app_stats (
  id int primary key default 1,
  total_quotes bigint not null default 0,
  total_views bigint not null default 0,
  total_downloads bigint not null default 0
);

insert into
  public.app_stats (id)
values
  (1)
on conflict do nothing;

create or replace function public.app_stats_on_quotes_change () returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' and new.status='approved' then
    update public.app_stats
      set total_quotes=total_quotes+1,
          total_views=total_views+coalesce(new.view_count,0),
          total_downloads=total_downloads+coalesce(new.download_count,0)
      where id=1;
  elsif tg_op='UPDATE' then
    if old.status='approved' and new.status='approved' then
      update public.app_stats set
        total_views=total_views+(coalesce(new.view_count,0)-coalesce(old.view_count,0)),
        total_downloads=total_downloads+(coalesce(new.download_count,0)-coalesce(old.download_count,0))
      where id=1;
    elsif old.status <> 'approved' and new.status='approved' then
      update public.app_stats set total_quotes=total_quotes+1 where id=1;
    elsif old.status='approved' and new.status <> 'approved' then
      update public.app_stats set total_quotes=total_quotes-1 where id=1;
    end if;
  elsif tg_op='DELETE' and old.status='approved' then
    update public.app_stats
      set total_quotes=total_quotes-1,
          total_views=total_views-coalesce(old.view_count,0),
          total_downloads=total_downloads-coalesce(old.download_count,0)
      where id=1;
  end if;
  return null;
end $$;

drop trigger if exists trg_app_stats_quotes on public.quotes;

create trigger trg_app_stats_quotes
after insert
or
update
or delete on public.quotes for each row
execute function public.app_stats_on_quotes_change ();

-- 12) AUTH TRIGGER (SINGLE, LEAST-PRIVILEGE) ---------------------------
-- Assumes user_profiles exists with (id uuid pk, username text, subscription_tier text default 'free')
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user ();

create or replace function public.handle_new_user () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  insert into public.user_profiles (id, username, subscription_tier)
  values (new.id, coalesce(new.email, 'user_'||new.id), 'free')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- Least-privilege grants
revoke all on table public.user_profiles
from
  anon;

revoke all on table public.user_favorites
from
  anon;

revoke all on table public.user_daily_usage
from
  anon;

grant
select
,
update on table public.user_profiles to authenticated;

grant
select
,
  insert,
  delete on table public.user_favorites to authenticated;

grant
select
  on table public.user_daily_usage to authenticated;

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================