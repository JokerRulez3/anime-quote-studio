-- Robust view recorder (idempotent per call; no user required)
create or replace function public.record_view(
  p_quote_id bigint,
  p_user_id uuid default null,
  p_referrer text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quotes
  set view_count = coalesce(view_count, 0) + 1
  where id = p_quote_id;

  -- optional: keep a log table (create if you don't have it)
  if to_regclass('public.user_views') is not null then
    insert into public.user_views (user_id, quote_id, referrer)
    values (p_user_id, p_quote_id, p_referrer);
  end if;
end
$$;

-- allow web clients to call it
grant execute on function public.record_view(bigint, uuid, text) to anon, authenticated;

-- If you had an old increment_view_count RPC, you can drop it or keep both.
