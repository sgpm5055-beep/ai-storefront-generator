-- AI Storefront Generator — schema
-- Run once in the Supabase SQL editor.
-- All writes go through the service role from server code; RLS denies
-- anonymous writes and allows anonymous reads only of published stores.

create extension if not exists pgcrypto;

-- One row per storefront.
create table if not exists stores (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique,
  edit_token_hash       text not null,
  handle                text,
  input_type            text not null check (input_type in ('handle','description')),
  description_text      text,
  ownership_code        text,
  ownership_code_hash   text,
  ownership_confirmed_at timestamptz,
  name                  text,
  avatar_url            text,
  followers             integer,
  bio                   text,
  niche                 text,
  language              text default 'en',
  status                text not null default 'building'
                          check (status in ('building','draft','published','unpublished','failed','directions')),
  validation_result     text check (validation_result in ('pass','repaired','template')),
  prompt_version        text not null default 'v1',
  is_sample             boolean not null default false,
  parent_store_id       uuid references stores(id) on delete cascade,
  direction             jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists stores_slug_idx on stores (slug) where slug is not null;
create index if not exists stores_token_idx on stores (edit_token_hash);

-- Drives the progress screen and retries.
create table if not exists jobs (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  stage         text not null,
  stage_status  text not null check (stage_status in ('pending','running','done','failed','skipped')),
  detail        text,
  error         text,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists jobs_store_idx on jobs (store_id, created_at);

-- The evidence every later stage quotes.
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  post_url      text,
  post_type     text check (post_type in ('reel','image','carousel','video')),
  views         integer,
  likes         integer,
  caption       text,
  extracted_text text,            -- transcript or image text
  source        text check (source in ('transcript','image_text','caption')),
  low_signal    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists posts_store_idx on posts (store_id);

-- 2 to 4 rows per store.
create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references stores(id) on delete cascade,
  position         integer not null,
  ladder_role      text not null check (ladder_role in ('entry','core','premium')),
  format           text not null check (format in ('digital','webinar','session','course')),
  title            text,
  promise          text,
  description      text,
  points           text[],
  price            integer,
  suggested_price  integer,
  price_reason     text,
  scope            text check (scope in ('small','standard','large')),
  effort           text,
  demand_item      text,
  evidence         text,
  checkout_link    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists products_store_idx on products (store_id, position);

-- The funnel. Also carries field-edit actions (kept, edited, regenerated, deleted).
create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid references stores(id) on delete cascade,
  name           text not null,
  prompt_version text,
  props          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists events_store_idx on events (store_id, created_at);
create index if not exists events_name_idx on events (name, created_at);

-- Per-device and per-IP abuse counters. Enough for a prototype.
create table if not exists rate_limits (
  id          uuid primary key default gen_random_uuid(),
  bucket_key  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limits_key_idx on rate_limits (bucket_key, created_at);

-- Row-level security -------------------------------------------------------
alter table stores       enable row level security;
alter table jobs         enable row level security;
alter table posts        enable row level security;
alter table products     enable row level security;
alter table events       enable row level security;
alter table rate_limits  enable row level security;

-- Anonymous clients may read published stores and their products only.
-- Everything else is served by the server using the service role, which
-- bypasses RLS.
drop policy if exists "published stores are public" on stores;
create policy "published stores are public"
  on stores for select to anon
  using (status = 'published');

drop policy if exists "products of published stores are public" on products;
create policy "products of published stores are public"
  on products for select to anon
  using (exists (
    select 1 from stores s
    where s.id = products.store_id and s.status = 'published'
  ));

-- Keep updated_at honest.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists stores_touch on stores;
create trigger stores_touch before update on stores
  for each row execute function touch_updated_at();

drop trigger if exists products_touch on products;
create trigger products_touch before update on products
  for each row execute function touch_updated_at();

-- Added 2026-11-20: candidates left over from selection, for "Try another".
alter table stores add column if not exists unused_candidates jsonb default '[]'::jsonb;
