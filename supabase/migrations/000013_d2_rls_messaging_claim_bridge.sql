-- ATP2 Phase C / Batch C5
-- Messaging RLS (participant-scoped read/write + service_role management paths)
-- Requires H2 claim helpers from 000011_d2_rls_hardening_owner_scoped_claim_bridge.sql
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'atp2_claim_profile_id_text_v1'
  ) then
    raise exception 'C5 RLS requires H2 claim helper public.atp2_claim_profile_id_text_v1() (apply 000011 first)';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'atp2_claim_role_v1'
  ) then
    raise exception 'C5 RLS requires H2 claim helper public.atp2_claim_role_v1() (apply 000011 first)';
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relname='conversations') then
    raise exception 'C5 RLS requires public.conversations table (apply 000012 first)';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relname='conversation_participants') then
    raise exception 'C5 RLS requires public.conversation_participants table (apply 000012 first)';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relname='messages') then
    raise exception 'C5 RLS requires public.messages table (apply 000012 first)';
  end if;
end
$$;

-- SECURITY DEFINER helper to avoid circular/recursive policy checks on conversation_participants.
create or replace function public.atp2_is_conversation_participant_v1(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id::text = public.atp2_claim_profile_id_text_v1()
  )
$$;

comment on function public.atp2_is_conversation_participant_v1(uuid) is
  'ATP2 C5 helper: checks conversation participant membership for current claim profile_id (security definer)';

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- conversations
--  - Participant-only read under authenticated claim bridge
--  - Create/update/delete managed by backend/service_role in C5
-- ---------------------------------------------------------------------------
drop policy if exists conversations_select_participant_claim_c5_v1 on public.conversations;
create policy conversations_select_participant_claim_c5_v1
on public.conversations
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and public.atp2_is_conversation_participant_v1(id)
);

drop policy if exists conversations_service_role_all_c5_v1 on public.conversations;
create policy conversations_service_role_all_c5_v1
on public.conversations
for all
to service_role
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- conversation_participants
--  - Participants can read participant list for conversations they belong to
--  - Participants can update their own row (e.g., last_read_at)
--  - Membership management (insert/delete) handled by backend/service_role in C5
-- ---------------------------------------------------------------------------
drop policy if exists conversation_participants_select_participant_claim_c5_v1 on public.conversation_participants;
create policy conversation_participants_select_participant_claim_c5_v1
on public.conversation_participants
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and public.atp2_is_conversation_participant_v1(conversation_id)
);

drop policy if exists conversation_participants_update_self_claim_c5_v1 on public.conversation_participants;
create policy conversation_participants_update_self_claim_c5_v1
on public.conversation_participants
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and user_id::text = public.atp2_claim_profile_id_text_v1()
  and public.atp2_is_conversation_participant_v1(conversation_id)
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and user_id::text = public.atp2_claim_profile_id_text_v1()
  and public.atp2_is_conversation_participant_v1(conversation_id)
);

drop policy if exists conversation_participants_service_role_all_c5_v1 on public.conversation_participants;
create policy conversation_participants_service_role_all_c5_v1
on public.conversation_participants
for all
to service_role
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- messages
--  - Participant-only read
--  - Sender + participant scoped insert/update/delete for authenticated users
--  - service_role all for backend fanout/admin operations
-- ---------------------------------------------------------------------------
drop policy if exists messages_select_participant_claim_c5_v1 on public.messages;
create policy messages_select_participant_claim_c5_v1
on public.messages
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and public.atp2_is_conversation_participant_v1(conversation_id)
);

drop policy if exists messages_insert_sender_participant_claim_c5_v1 on public.messages;
create policy messages_insert_sender_participant_claim_c5_v1
on public.messages
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and sender_user_id::text = public.atp2_claim_profile_id_text_v1()
  and public.atp2_is_conversation_participant_v1(conversation_id)
);

drop policy if exists messages_update_sender_participant_claim_c5_v1 on public.messages;
create policy messages_update_sender_participant_claim_c5_v1
on public.messages
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and sender_user_id::text = public.atp2_claim_profile_id_text_v1()
  and public.atp2_is_conversation_participant_v1(conversation_id)
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and sender_user_id::text = public.atp2_claim_profile_id_text_v1()
  and public.atp2_is_conversation_participant_v1(conversation_id)
);

drop policy if exists messages_delete_sender_participant_claim_c5_v1 on public.messages;
create policy messages_delete_sender_participant_claim_c5_v1
on public.messages
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and sender_user_id::text = public.atp2_claim_profile_id_text_v1()
  and public.atp2_is_conversation_participant_v1(conversation_id)
);

drop policy if exists messages_service_role_all_c5_v1 on public.messages;
create policy messages_service_role_all_c5_v1
on public.messages
for all
to service_role
using (true)
with check (true);
