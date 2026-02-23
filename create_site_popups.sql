-- Create site_popups table
-- Run this in Supabase SQL Editor

create table if not exists site_popups (
    id          uuid primary key default gen_random_uuid(),
    type        text not null check (type in ('text', 'image')),
    content     text,               -- for type = 'text'
    image_url   text,               -- for type = 'image'
    link_url    text,               -- optional clickable link for image popups
    title       text,               -- optional title
    target      text not null default 'all' check (target in ('all', 'specific')),
    target_lead_ids text[],         -- only relevant when target = 'specific'
    status      text not null default 'active' check (status in ('active', 'dismissed', 'expired')),
    created_at  timestamptz not null default now(),
    expires_at  timestamptz         -- optional auto-expiry
);

-- Enable Row Level Security
alter table site_popups enable row level security;

-- Allow admins to do everything
create policy "Admins can manage popups"
    on site_popups for all
    using (true)
    with check (true);

-- Allow anonymous/authenticated users to read active popups (for site display)
create policy "Anyone can read active popups"
    on site_popups for select
    using (status = 'active');

-- Enable Realtime so the site can listen for new popups
alter publication supabase_realtime add table site_popups;
