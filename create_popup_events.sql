-- Create popup_events table for tracking views and clicks
-- Run this in Supabase SQL Editor

create table if not exists popup_events (
    id          uuid primary key default gen_random_uuid(),
    popup_id    uuid not null references site_popups(id) on delete cascade,
    event_type  text not null check (event_type in ('view', 'click')),
    user_agent  text,
    ip_hash     text,  -- hashed IP for deduplication without storing raw IPs
    created_at  timestamptz not null default now()
);

-- Index for fast aggregation queries
create index if not exists idx_popup_events_popup_id on popup_events(popup_id);
create index if not exists idx_popup_events_type on popup_events(event_type);

-- RLS: anyone can insert events (site visitors), only service role can read all
alter table popup_events enable row level security;

create policy "Anyone can insert popup events"
    on popup_events for insert
    with check (true);

create policy "Anyone can read popup events"
    on popup_events for select
    using (true);
