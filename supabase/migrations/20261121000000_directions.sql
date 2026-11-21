-- Directions: three speculative drafts for a creator who teaches nothing.
--
-- A substantive creator (a comedian, an actor, a public figure) used to hit
-- the same dead end as an empty page. They now get three draft stores, each
-- grown from a direction inferred from their own words. The drafts are
-- siblings of the parent build and are always stored as guesses.

alter table stores add column if not exists parent_store_id uuid
  references stores(id) on delete cascade;

-- The direction this draft grew from: topic, the quote it came from, and
-- why we proposed it. Shown on the chooser so the guess is visible.
alter table stores add column if not exists direction jsonb;

create index if not exists stores_parent_idx on stores (parent_store_id)
  where parent_store_id is not null;

-- The parent row of a directions build is neither a draft nor a failure.
alter table stores drop constraint if exists stores_status_check;
alter table stores add constraint stores_status_check
  check (status in ('building','draft','published','unpublished','failed','directions'));
