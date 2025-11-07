-- Ensure helpful extensions
create extension if not exists unaccent;

-- Drop old version with the previous signature
drop function if exists public.search_quotes(text, integer, integer);

-- Recreate with emotion-aware search + JSON shape compatible with App.tsx
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
    (
      -- text relevance from tsv
      case
        when search_text is null or length(btrim(search_text)) = 0 then 0
        else coalesce(
          ts_rank(
            q.tsv,
            plainto_tsquery('simple', unaccent(search_text))
          ),
          0
        )
      end
      +
      -- bonus if emotion matches the search term
      case
        when search_text is not null
         and length(btrim(search_text)) > 0
         and (
           lower(coalesce(q.emotion,'')) = lower(search_text)
           or lower(coalesce(q.emotion,'')) like '%' || lower(search_text) || '%'
         )
        then 0.5
        else 0
      end
    ) as score
  from public.quotes q
  where
    q.status = 'approved'
    and (
      -- no search => include all approved
      search_text is null
      or length(btrim(search_text)) = 0
      -- text search over quote/anime/character via tsv
      or q.tsv @@ plainto_tsquery('simple', unaccent(search_text))
      -- or emotion-based search (for pills like "motivational")
      or lower(coalesce(q.emotion,'')) = lower(search_text)
      or lower(coalesce(q.emotion,'')) like '%' || lower(search_text) || '%'
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
  -- if no search: newest first
  case
    when search_text is null or length(btrim(search_text)) = 0
      then b.created_at
    else null
  end desc,
  -- if search term: highest score first
  case
    when search_text is not null and length(btrim(search_text)) > 0
      then b.score
    else null
  end desc,
  -- stable tie-breaker
  b.id desc
limit page_size
offset greatest(page - 1, 0) * page_size;
$$;
