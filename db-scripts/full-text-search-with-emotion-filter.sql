-- 1) Make sure extension exists
create extension if not exists unaccent;

-- 2) TEXT SEARCH: (re)create search_quotes as pure text search
drop function if exists public.search_quotes(text, integer, integer);

create or replace function public.search_quotes (
  in search_text text default null,
  in page int default 1,
  in page_size int default 24
) returns table (
  id bigint,
  quote_text text,
  "character" jsonb,
  anime jsonb,
  episode_number int,
  emotion text,
  view_count int,
  download_count int,
  created_at timestamptz
)
language sql
stable
as $$
with base as (
  select
    q.*,
    case
      when search_text is null or length(btrim(search_text)) = 0
        then 0
      else coalesce(
        ts_rank(
          q.tsv,
          plainto_tsquery('simple', unaccent(search_text))
        ),
        0
      )
    end as score
  from public.quotes q
  where
    q.status = 'approved'
    and (
      search_text is null
      or length(btrim(search_text)) = 0
      or q.tsv @@ plainto_tsquery('simple', unaccent(search_text))
    )
)
select
  b.id,
  b.quote_text,
  jsonb_build_object(
    'id', c.id,
    'name', c.name
  ) as "character",
  jsonb_build_object(
    'id', a.id,
    'title', a.title
  ) as anime,
  b.episode_number,
  b.emotion,
  b.view_count,
  b.download_count,
  b.created_at
from base b
join public.characters c on c.id = b.character_id
join public.anime a on a.id = b.anime_id
order by
  case
    when search_text is not null and length(btrim(search_text)) > 0
      then b.score
    else null
  end desc,
  b.created_at desc,
  b.id desc
limit page_size
offset greatest(page - 1, 0) * page_size;
$$;

-- 3) EMOTION FILTER: strict emotion-based search
drop function if exists public.search_quotes_by_emotion(text, integer, integer);

create or replace function public.search_quotes_by_emotion (
  in emotion_filter text,
  in page int default 1,
  in page_size int default 24
) returns table (
  id bigint,
  quote_text text,
  "character" jsonb,
  anime jsonb,
  episode_number int,
  emotion text,
  view_count int,
  download_count int,
  created_at timestamptz
)
language sql
stable
as $$
select
  q.id,
  q.quote_text,
  jsonb_build_object(
    'id', c.id,
    'name', c.name
  ) as "character",
  jsonb_build_object(
    'id', a.id,
    'title', a.title
  ) as anime,
  q.episode_number,
  q.emotion,
  q.view_count,
  q.download_count,
  q.created_at
from public.quotes q
join public.characters c on c.id = q.character_id
join public.anime a on a.id = q.anime_id
where
  q.status = 'approved'
  and emotion_filter is not null
  and length(btrim(emotion_filter)) > 0
  and lower(coalesce(q.emotion, '')) = lower(emotion_filter)
order by
  q.created_at desc,
  q.id desc
limit page_size
offset greatest(page - 1, 0) * page_size;
$$;
