-- Crie esta função no Supabase SQL Editor
-- Ela bypassa o cache do PostgREST e escreve diretamente no banco

create or replace function create_site_popup(payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  result site_popups;
begin
  insert into site_popups (
    type,
    content,
    image_url,
    link_url,
    title,
    target,
    target_lead_ids,
    position,
    status,
    scheduled_at
  ) values (
    payload->>'type',
    payload->>'content',
    payload->>'image_url',
    payload->>'link_url',
    payload->>'title',
    coalesce(payload->>'target', 'all'),
    (select array_agg(v) from jsonb_array_elements_text(payload->'target_lead_ids') as t(v)),
    coalesce(payload->>'position', 'bottom-right'),
    coalesce(payload->>'status', 'active'),
    (payload->>'scheduled_at')::timestamptz
  )
  returning * into result;

  return to_jsonb(result);
end;
$$;
