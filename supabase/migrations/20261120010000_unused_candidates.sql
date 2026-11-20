-- "Try another" draws a replacement from the candidates the selection step
-- did not use, so no new ideation call is needed. PRD §Decision log.
alter table stores add column if not exists unused_candidates jsonb default '[]'::jsonb;
