-- Create live_streams table for expert live sessions
CREATE TABLE IF NOT EXISTS live_streams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform text NOT NULL UNIQUE, -- 'bravobet', 'superbet', 'esportivabet'
    is_live boolean NOT NULL DEFAULT false,
    stream_url text, -- YouTube/Twitch embed URL or direct link
    expert_name text NOT NULL DEFAULT 'Expert',
    expert_avatar text, -- optional avatar URL
    viewers_count int DEFAULT 0,
    started_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Insert default rows for each platform
INSERT INTO live_streams (platform, expert_name, is_live)
VALUES
    ('bravobet', 'Expert Bravobet', false),
    ('superbet', 'Expert Superbet', false),
    ('esportivabet', 'Expert EsportivaBet', false)
ON CONFLICT (platform) DO NOTHING;

-- Enable RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Public read live_streams"
ON live_streams FOR SELECT
TO authenticated
USING (true);

-- Only service role / admin can update
CREATE POLICY "Admin update live_streams"
ON live_streams FOR UPDATE
TO service_role
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
