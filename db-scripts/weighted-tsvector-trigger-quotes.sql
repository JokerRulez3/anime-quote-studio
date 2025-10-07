create or replace function public.update_quotes_tsv()
returns trigger language plpgsql as $$
declare
  char_name text;
  anime_title text;
begin
  -- look up names for this quote
  select c.name, a.title
  into char_name, anime_title
  from public.characters c
  join public.anime a on a.id = new.anime_id
  where c.id = new.character_id;

  new.tsv :=
      setweight(to_tsvector('simple', unaccent(coalesce(new.quote_text, ''))), 'A')
   || setweight(to_tsvector('simple', unaccent(coalesce(char_name, ''))), 'B')
   || setweight(to_tsvector('simple', unaccent(coalesce(anime_title, ''))), 'C');
  return new;
end$$;

drop trigger if exists trg_quotes_tsv on public.quotes;
create trigger trg_quotes_tsv
before insert or update of quote_text, character_id, anime_id
on public.quotes
for each row execute function public.update_quotes_tsv();

update public.quotes q
set tsv =
      setweight(to_tsvector('simple', unaccent(coalesce(q.quote_text,''))), 'A')
   || setweight(to_tsvector('simple', unaccent(coalesce(c.name,''))), 'B')
   || setweight(to_tsvector('simple', unaccent(coalesce(a.title,''))), 'C')
from public.characters c,
     public.anime a
where q.character_id = c.id
  and a.id = q.anime_id;

reindex index quotes_tsv_gin;