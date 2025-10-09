-- Enable case-insensitive text for safe UNIQUEs
create extension if not exists citext;

-- ==========================================================
-- 1) Anime: make title citext and ensure UNIQUE constraint on (title)
--    (safe if constraint already exists)
-- ==========================================================
alter table public.anime
  alter column title type citext using title::citext;

do $$
declare
  has_constraint boolean;
begin
  select exists (
    select 1 from pg_constraint
    where conname = 'uq_anime_title'
  ) into has_constraint;

  if not has_constraint then
    -- If an index with this name exists (not a constraint), drop it first
    if exists (
      select 1 from pg_class
      where relname = 'uq_anime_title' and relkind = 'i'
    ) then
      execute 'drop index if exists public.uq_anime_title';
    end if;

    alter table public.anime
      add constraint uq_anime_title unique (title);
  end if;
end$$;

-- ==========================================================
-- 2) Characters: make name citext and ensure UNIQUE constraint on (name, anime_id)
-- ==========================================================
-- Drop old expression index that caused name collision
drop index if exists public.uq_characters_name_anime;

alter table public.characters
  alter column name type citext using name::citext;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_characters_name_anime_key'
  ) then
    alter table public.characters
      add constraint uq_characters_name_anime_key unique (name, anime_id);
  end if;
end$$;

-- ==========================================================
-- 3) Quotes: keep conflict key on (quote_hash, character_id, anime_id)
-- ==========================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='quotes' and column_name='quote_hash'
  ) then
    alter table public.quotes
      add column quote_hash text generated always as (md5(quote_text)) stored;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_quotes_hash_char_anime'
  ) then
    alter table public.quotes
      add constraint uq_quotes_hash_char_anime unique (quote_hash, character_id, anime_id);
  end if;
end$$;

-- ==========================================================
-- 4) Staging: dedupe index (safe to keep)
-- ==========================================================
create unique index if not exists uq_staging_quotes_dedupe
  on public.staging_quotes ((md5(quote_text)), character, anime);

-- ==========================================================
-- 5) Merge Function: uses the unique constraints above
-- ==========================================================
drop function if exists public.merge_staging_quotes();

create or replace function public.merge_staging_quotes()
returns void language sql as $$
  -- Upsert anime (uses uq_anime_title)
  insert into public.anime (title)
  select distinct trim(anime) from public.staging_quotes
  on conflict (title) do nothing;

  -- Upsert characters (uses uq_characters_name_anime_key)
  insert into public.characters (name, anime_id)
  select distinct sq.character, a.id
  from public.staging_quotes sq
  join public.anime a on a.title = sq.anime
  on conflict (name, anime_id) do nothing;

  -- Insert quotes (uses uq_quotes_hash_char_anime)
  insert into public.quotes
    (quote_text, character_id, anime_id, episode_number, emotion, status,
     source, source_id, source_url)
  select
    sq.quote_text, c.id, a.id, sq.episode_number, sq.emotion, 'approved',
    sq.source, sq.source_id, sq.source_url
  from public.staging_quotes sq
  join public.anime a on a.title = sq.anime
  join public.characters c on c.name = sq.character and c.anime_id = a.id
  on conflict (quote_hash, character_id, anime_id) do nothing;

  truncate public.staging_quotes;
$$;

-- ==========================================================
-- 6) Refresh PostgREST cache (optional)
-- ==========================================================
select pg_notify('pgrst','reload schema');
