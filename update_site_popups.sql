-- Run this in Supabase SQL Editor to update the site_popups table
-- Adds position and scheduled_at columns, and 'scheduled' status

-- Add position column
alter table site_popups
    add column if not exists position text not null default 'bottom-right';

-- Add constraint for position values  
-- (skip if it already exists)
do $$ begin
    alter table site_popups
        add constraint site_popups_position_check
        check (position in ('bottom-right', 'top', 'center'));
exception when duplicate_object then null; end $$;

-- Add scheduled_at column
alter table site_popups
    add column if not exists scheduled_at timestamptz;

-- Allow 'scheduled' as a status value
-- Drop old constraint first
alter table site_popups drop constraint if exists site_popups_status_check;
alter table site_popups
    add constraint site_popups_status_check
    check (status in ('active', 'dismissed', 'expired', 'scheduled'));
