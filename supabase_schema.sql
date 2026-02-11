-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- CHAT MESSAGES TABLE
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  content text not null,
  role text default 'user' check (role in ('user', 'admin', 'system')),
  username text,
  visible boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table chat_messages enable row level security;

-- Policies for Chat
create policy "Anyone can read visible messages"
  on chat_messages for select
  using (visible = true);

create policy "Authenticated users can insert messages"
  on chat_messages for insert
  with check (auth.uid() = user_id);

-- SIGNALS TABLE (For Realtime Dashboard)
create table if not exists signals (
  id uuid default gen_random_uuid() primary key,
  target_multiplier decimal not null,
  strategy text,
  confidence text check (confidence in ('high', 'medium', 'low')),
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  platform text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table signals enable row level security;

-- Policies for Signals
create policy "Anyone can read active signals"
  on signals for select
  using (true);

-- Only service role (n8n) or admins can insert/update signals
create policy "Service role can manage signals"
  on signals for all
  using ( auth.role() = 'service_role' );

-- CRASH HISTORY TABLE (For Charts/Heatmaps)
create table if not exists crash_history (
  id uuid default gen_random_uuid() primary key,
  multiplier decimal not null,
  round_time timestamptz default now(),
  platform text
);

alter table crash_history enable row level security;

create policy "Anyone can read crash history"
  on crash_history for select
  using (true);

-- Create a bucket for avatars if needed (optional)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
