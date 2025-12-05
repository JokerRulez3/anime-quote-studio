-- Remove any old versions
drop function if exists public.search_quotes(text, integer, integer);
drop function if exists public.search_quotes(text, text, integer, integer);

create or replace function public.search_quotes (
  in search_text    text default null,
  in emotion_filter text default null,
  in page           int  default 1,
  in page_size      int  default 24
)
returns table (
  id             bigint,
  quote_text     text,
  "character"    jsonb,
  anime          jsonb,
  episode_number int,
  emotion        text,
  view_count     int,
  download_count int,
  created_at     timestamptz
)
language sql
stable
as $$
  with base as (
    select
      q.id,
      q.quote_text,
      q.episode_number,
      q.emotion,
      q.view_count,
      q.download_count,
      q.created_at,
      c.id   as character_id,
      c.name as character_name,
      a.id   as anime_id,
      a.title as anime_title
    from public.quotes q
    join public.characters c on c.id = q.character_id
    join public.anime a      on a.id = q.anime_id
    where
      q.status = 'approved'
      -- emotion filter (All = null / empty string)
      and (
        emotion_filter is null
        or length(btrim(emotion_filter)) = 0
        or lower(q.emotion) = lower(emotion_filter)
      )
      -- text filter across quote / character / anime
      and (
        search_text is null
        or length(btrim(search_text)) = 0
        or q.quote_text   ilike '%' || search_text || '%'
        or c.name         ilike '%' || search_text || '%'
        or a.title        ilike '%' || search_text || '%'
      )
  )
  select
    b.id,
    b.quote_text,
    jsonb_build_object(
      'id',   b.character_id,
      'name', b.character_name
    ) as "character",
    jsonb_build_object(
      'id',    b.anime_id,
      'title', b.anime_title
    ) as anime,
    b.episode_number,
    b.emotion,
    b.view_count,
    b.download_count,
    b.created_at
  from base b
  order by
    b.created_at desc,
    b.id desc
  limit page_size
  offset greatest(page - 1, 0) * page_size;
$$;
