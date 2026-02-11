-- Allow anon inserts for seeding (temporary)
create policy "Allow anon inserts for seeding"
on crash_history for insert
with check (true);
