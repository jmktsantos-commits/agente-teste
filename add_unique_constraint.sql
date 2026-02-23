-- Create a unique constraint to reject duplicate multiplier + timestamp (to the minute/second)
-- Since we drop milliseconds, we need to create a unique identifier

-- 1. Create a generated column that normalizes the date without milliseconds
ALTER TABLE crash_history ADD COLUMN IF NOT EXISTS unique_sig text GENERATED ALWAYS AS (
  platform || '_' || multiplier::text || '_' || to_char(round_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
) STORED;

-- 2. Add the unique constraint
ALTER TABLE crash_history DROP CONSTRAINT IF EXISTS crash_history_unique_sig_key;
ALTER TABLE crash_history ADD CONSTRAINT crash_history_unique_sig_key UNIQUE (unique_sig);
