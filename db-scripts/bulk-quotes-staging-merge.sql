-- A) Flat staging table (easy to bulk insert into)
create table if not exists public.staging_quotes (
  quote_text text not null,
  character  text not null,
  anime      text not null,
  episode_number int,
  emotion text,
  source text,        -- e.g. 'yurippe'
  source_id text,     -- _id from the API
  source_url text,    -- provenance
  created_at timestamptz default now()
);

-- Helpful index to avoid staging duplicates if you call ingestion repeatedly
create index if not exists staging_quotes_dedupe_idx
  on public.staging_quotes (md5(quote_text), character, anime);

-- B) (Optional, but recommended) Put provenance on main quotes table too
alter table public.quotes
  add column if not exists source text,
  add column if not exists source_id text,
  add column if not exists source_url text;

-- C) Merge function: move from staging → normalized tables with dedupe
drop function if exists public.merge_staging_quotes();

create or replace function public.merge_staging_quotes()
returns void
language sql
as $$
  -- Upsert anime
  insert into public.anime (title)
  select distinct trim(anime) from public.staging_quotes
  on conflict (title) do nothing;

  -- Upsert characters per anime
  insert into public.characters (name, anime_id)
  select distinct sq.character, a.id
  from public.staging_quotes sq
  join public.anime a on a.title = sq.anime
  on conflict (name, anime_id) do nothing;

  -- Insert quotes with provenance, skip duplicates
  insert into public.quotes
    (quote_text, character_id, anime_id, episode_number, emotion, status,
     source, source_id, source_url)
  select
    sq.quote_text,
    c.id,
    a.id,
    sq.episode_number,
    sq.emotion,
    'approved',
    sq.source,
    sq.source_id,
    sq.source_url
  from public.staging_quotes sq
  join public.anime a on a.title = sq.anime
  join public.characters c on c.name = sq.character and c.anime_id = a.id
  on conflict (md5(quote_text), character_id, anime_id) do nothing;

  truncate public.staging_quotes;
$$;
