-- ============================================================
-- Subscription plans: dedupe & normalize, then upsert Free/Basic/Pro
-- Safe to run multiple times
-- ============================================================

-- 0) Ensure table & columns exist (no-ops if present)
create table if not exists public.subscription_plans (
  id bigserial primary key,
  name text unique
);

do $$
declare
  cols text[] := array[
    'tier_key text',
    'price_monthly numeric',
    'price_yearly numeric',
    'downloads_per_day int',
    'downloads_per_month int',
    'has_watermark boolean',
    'has_hd_downloads boolean',
    'has_premium_backgrounds boolean',
    'has_premium_fonts boolean',
    'can_submit_quotes boolean',
    'stripe_price_id_basic_monthly text',
    'stripe_price_id_basic_yearly text'
  ];
  col text;
begin
  foreach col in array cols loop
    begin
      execute format('alter table public.subscription_plans add column if not exists %s;', col);
    exception when others then
      raise notice 'Skipped column %', col;
    end;
  end loop;
end$$;

-- 1) Normalize known legacy names → 'Pro'
--    If a 'Premium' row exists alongside 'Pro', prefer 'Pro' and drop 'Premium'.
do $$
begin
  if exists (select 1 from public.subscription_plans where lower(name) = 'premium')
     and exists (select 1 from public.subscription_plans where lower(name) = 'pro') then
    delete from public.subscription_plans
    where lower(name) = 'premium';
  elsif exists (select 1 from public.subscription_plans where lower(name) = 'premium')
        and not exists (select 1 from public.subscription_plans where lower(name) = 'pro') then
    update public.subscription_plans
      set name = 'Pro'
    where lower(name) = 'premium';
  end if;
end$$;

-- 2) Hard de-duplication by NAME (keep lowest id per case-insensitive name)
delete from public.subscription_plans sp
using public.subscription_plans sp2
where lower(sp.name) = lower(sp2.name)
  and sp.id > sp2.id;

-- 3) Hard de-duplication by TIER_KEY (keep lowest id per tier_key)
--    This resolves any existing unique violations.
delete from public.subscription_plans sp
using public.subscription_plans sp2
where sp.tier_key is not null
  and sp2.tier_key = sp.tier_key
  and sp.id > sp2.id;

-- 4) Ensure a unique index on tier_key (partial: only when tier_key is not null)
--    (Will succeed now that duplicates are removed.)
create unique index if not exists uq_subscription_plans_tier_key
  on public.subscription_plans (tier_key)
  where tier_key is not null;

-- 5) Upsert the three canonical plans, using UNIQUE(name) as the conflict target
insert into public.subscription_plans (
  name, tier_key, price_monthly, price_yearly, downloads_per_day, downloads_per_month,
  has_watermark, has_hd_downloads, has_premium_backgrounds, has_premium_fonts, can_submit_quotes,
  stripe_price_id_basic_monthly, stripe_price_id_basic_yearly
)
values
  ('Free',  'free',  0,     0,     3,   10,  true,  false, false, false, false, null, null),
  ('Basic', 'basic', 2.99,  24.00, 20,  null, true,  true,  true,  true,  false, null, null),
  ('Pro',   'pro',   4.99,  39.00, null, null, false, true,  true,  true,  true,  null, null)
on conflict (name) do update
set
  tier_key                = excluded.tier_key,
  price_monthly           = excluded.price_monthly,
  price_yearly            = excluded.price_yearly,
  downloads_per_day       = excluded.downloads_per_day,
  downloads_per_month     = excluded.downloads_per_month,
  has_watermark           = excluded.has_watermark,
  has_hd_downloads        = excluded.has_hd_downloads,
  has_premium_backgrounds = excluded.has_premium_backgrounds,
  has_premium_fonts       = excluded.has_premium_fonts,
  can_submit_quotes       = excluded.can_submit_quotes;

-- 6) Sanity: map any remaining null tier_keys for canonical names
update public.subscription_plans
set tier_key = 'free'
where tier_key is null and lower(name) = 'free';

update public.subscription_plans
set tier_key = 'basic'
where tier_key is null and lower(name) = 'basic';

update public.subscription_plans
set tier_key = 'pro'
where tier_key is null and lower(name) = 'pro';

-- 7) Show final state
select id, name, tier_key, price_monthly, price_yearly, downloads_per_day, downloads_per_month
from public.subscription_plans
order by name;
