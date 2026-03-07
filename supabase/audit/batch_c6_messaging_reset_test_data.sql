-- ATP2 Phase C / Batch C6
-- Messaging reset (TEST PROJECT ONLY)
-- Purpose: wipe old messaging data (conversations / participants / messages) to remove
-- conflicting legacy/duplicate threads while stabilizing C6 UI behavior.
-- WARNING: Destructive. Do NOT run on production without explicit backup/approval.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

begin;

select
  (select count(*) from public.conversations) as conversations_before,
  (select count(*) from public.conversation_participants) as participants_before,
  (select count(*) from public.messages) as messages_before;

select
  coalesce(jsonb_agg(
    jsonb_build_object(
      'direct_key', direct_key,
      'conversation_count', conversation_count
    )
    order by direct_key
  ), '[]'::jsonb) as duplicate_direct_keys_before
from (
  select
    c.metadata->>'direct_key' as direct_key,
    count(*) as conversation_count
  from public.conversations c
  where c.type = 'direct'
    and coalesce(c.metadata->>'direct_key', '') <> ''
  group by c.metadata->>'direct_key'
  having count(*) > 1
) d;

-- Reset all messaging rows (schema remains intact)
truncate table
  public.messages,
  public.conversation_participants,
  public.conversations;

select
  (select count(*) from public.conversations) as conversations_after,
  (select count(*) from public.conversation_participants) as participants_after,
  (select count(*) from public.messages) as messages_after;

commit;

select
  'ATP2 C6 messaging reset test data complete' as status,
  now() as checked_at;
