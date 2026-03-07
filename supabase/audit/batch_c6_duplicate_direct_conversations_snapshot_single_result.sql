-- ATP2 Phase C / Batch C6
-- Duplicate direct conversation snapshot (single-result)
-- Purpose: detect multiple conversation UUIDs for the same direct pair (metadata.direct_key)
-- before/after reset or before applying 000014 unique guard migration.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

drop table if exists pg_temp._atp2_c6_direct_dupe_audit;

create temporary table _atp2_c6_direct_dupe_audit (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_c6_direct_dupe_audit (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user
  );

insert into _atp2_c6_direct_dupe_audit (seq, section, payload)
with direct_rows as (
  select
    c.id,
    c.created_at,
    c.updated_at,
    c.metadata,
    c.metadata->>'direct_key' as direct_key
  from public.conversations c
  where c.type = 'direct'
    and coalesce(c.metadata->>'direct_key', '') <> ''
),
dupes as (
  select direct_key, count(*) as conversation_count
  from direct_rows
  group by direct_key
  having count(*) > 1
)
select
  1,
  'duplicate_direct_key_summary',
  jsonb_build_object(
    'duplicate_keys', coalesce((select jsonb_agg(direct_key order by direct_key) from dupes), '[]'::jsonb),
    'duplicate_key_count', coalesce((select count(*) from dupes), 0)
  );

insert into _atp2_c6_direct_dupe_audit (seq, section, payload)
with direct_rows as (
  select
    c.id,
    c.created_at,
    c.updated_at,
    c.metadata,
    c.metadata->>'direct_key' as direct_key
  from public.conversations c
  where c.type = 'direct'
    and coalesce(c.metadata->>'direct_key', '') <> ''
),
dupe_rows as (
  select r.*
  from direct_rows r
  join (
    select direct_key
    from direct_rows
    group by direct_key
    having count(*) > 1
  ) d using (direct_key)
),
participants as (
  select
    cp.conversation_id,
    p.wallet_address
  from public.conversation_participants cp
  join public.profiles p on p.id = cp.user_id
),
participant_agg as (
  select
    conversation_id,
    jsonb_agg(wallet_address order by wallet_address) as participant_wallets
  from participants
  group by conversation_id
),
message_agg as (
  select
    m.conversation_id,
    count(*) filter (where m.deleted_at is null) as visible_messages,
    max(m.created_at) as latest_message_at
  from public.messages m
  group by m.conversation_id
)
select
  2,
  'duplicate_direct_key_details',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'direct_key', d.direct_key,
        'conversation_id', d.id,
        'created_at', d.created_at,
        'updated_at', d.updated_at,
        'participant_wallets', coalesce(pa.participant_wallets, '[]'::jsonb),
        'visible_messages', coalesce(ma.visible_messages, 0),
        'latest_message_at', ma.latest_message_at
      )
      order by d.direct_key, d.updated_at desc, d.id
    ),
    '[]'::jsonb
  )
from dupe_rows d
left join participant_agg pa on pa.conversation_id = d.id
left join message_agg ma on ma.conversation_id = d.id;

select seq, section, payload
from _atp2_c6_direct_dupe_audit
order by seq;
