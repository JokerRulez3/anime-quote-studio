alter table public.quotes 
  add column if not exists emotion text,
  add column if not exists emotion_confidence numeric,
  add column if not exists emotion_model text;

create index if not exists quotes_emotion_idx on public.quotes(emotion);

create or replace function public.update_quotes_tsv()
returns trigger language plpgsql as $$
declare char_name text; anime_title text;
begin
  select c.name, a.title into char_name, anime_title
  from public.characters c join public.anime a on a.id = new.anime_id
  where c.id = new.character_id;

  new.tsv :=
      setweight(to_tsvector('simple', unaccent(coalesce(new.quote_text,''))), 'A')
   || setweight(to_tsvector('simple', unaccent(coalesce(char_name,''))), 'B')
   || setweight(to_tsvector('simple', unaccent(coalesce(anime_title,''))), 'C')
   || setweight(to_tsvector('simple', unaccent(coalesce(new.emotion,''))), 'D');
  return new;
end$$;

drop trigger if exists trg_quotes_tsv on public.quotes;
create trigger trg_quotes_tsv
before insert or update of quote_text, character_id, anime_id, emotion
on public.quotes
for each row execute function public.update_quotes_tsv();
