-- ATP2 Phase C / Batch C6
-- Guard against duplicate direct conversations for the same wallet pair.
-- This prevents multiple UUID threads for one direct pair (A/B), which can cause
-- sidebar/thread mismatches in the C6 polling UI.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

do $$
begin
  if exists (
    select 1
    from public.conversations c
    where c.type = 'direct'
      and coalesce(c.metadata->>'direct_key', '') <> ''
    group by c.metadata->>'direct_key'
    having count(*) > 1
  ) then
    raise exception
      '000014_c6_conversations_direct_key_unique_guard.sql blocked: duplicate direct_key rows exist in public.conversations. Run C6 duplicate snapshot and reset/dedupe first.';
  end if;
end
$$;

create unique index if not exists idx_conversations_direct_key_direct_uk
  on public.conversations ((metadata->>'direct_key'))
  where type = 'direct'
    and coalesce(metadata->>'direct_key', '') <> '';
