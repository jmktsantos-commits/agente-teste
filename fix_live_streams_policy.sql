-- Fix: Allow authenticated users to update live_streams (API route handles auth check)
DROP POLICY IF EXISTS "Admin update live_streams" ON live_streams;

CREATE POLICY "Admin update live_streams"
ON live_streams FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
