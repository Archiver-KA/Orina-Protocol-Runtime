-- ATP2 Phase C / Batch C5 Messaging Schema Smoke SQL (transaction + rollback)
-- Purpose: fail fast on messaging schema/index/trigger regressions after applying 000012 + 000013.
-- Scope: schema/constraints/triggers only (RLS behavior is verified by snapshot + later C6/H3 flows).
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

begin;

do $$
declare
  v_seed1 text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_seed2 text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_wallet1 text := '0x' || substr(v_seed1, 1, 40);
  v_wallet2 text := '0x' || substr(v_seed2, 1, 40);
  v_profile1_id uuid;
  v_profile2_id uuid;
  v_conversation_id uuid;
  v_message1_id uuid;
  v_message2_id uuid;
  v_old_ts timestamptz := '2000-01-01 00:00:00+00'::timestamptz;
  v_tmp_ts timestamptz;
  v_dup_failed boolean := false;
  v_check_failed boolean := false;
begin
  -- Basic object presence assertions
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'conversations') then
    raise exception 'C5 smoke failed: public.conversations missing';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'conversation_participants') then
    raise exception 'C5 smoke failed: public.conversation_participants missing';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'messages') then
    raise exception 'C5 smoke failed: public.messages missing';
  end if;

  -- Seed two profiles for FK references
  insert into public.profiles (wallet_address, display_name, username)
  values (v_wallet1, 'C5 Smoke User A', 'c5u_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  returning id into v_profile1_id;

  insert into public.profiles (wallet_address, display_name, username)
  values (v_wallet2, 'C5 Smoke User B', 'c5v_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  returning id into v_profile2_id;

  insert into public.conversations (type, title, metadata, updated_at)
  values ('direct', 'C5 Smoke Conversation', '{"scope":"c5-smoke"}'::jsonb, v_old_ts)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (v_conversation_id, v_profile1_id, 'owner');

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (v_conversation_id, v_profile2_id, 'member');

  v_dup_failed := false;
  begin
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (v_conversation_id, v_profile2_id, 'member');
  exception when unique_violation then
    v_dup_failed := true;
  end;
  if not v_dup_failed then
    raise exception 'C5 smoke failed: conversation_participants PK/unique did not fire';
  end if;

  update public.conversation_participants
     set last_read_at = now()
   where conversation_id = v_conversation_id
     and user_id = v_profile1_id;

  insert into public.messages (
    conversation_id,
    sender_user_id,
    client_message_id,
    body
  ) values (
    v_conversation_id,
    v_profile1_id,
    'c5-msg-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'Hello from C5 smoke'
  )
  returning id into v_message1_id;

  -- Conversation updated_at should be touched by message trigger
  select updated_at into v_tmp_ts from public.conversations where id = v_conversation_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'C5 smoke failed: conversations.updated_at not touched by messages trigger';
  end if;

  insert into public.messages (
    conversation_id,
    sender_user_id,
    client_message_id,
    attachments
  ) values (
    v_conversation_id,
    v_profile2_id,
    'c5-msg-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    '[{"kind":"image","url":"https://example.com/c5.png"}]'::jsonb
  )
  returning id into v_message2_id;

  -- Duplicate client message id by same sender in same conversation must fail
  v_dup_failed := false;
  begin
    insert into public.messages (
      conversation_id,
      sender_user_id,
      client_message_id,
      body
    )
    select
      m.conversation_id,
      m.sender_user_id,
      m.client_message_id,
      'duplicate client message id'
    from public.messages m
    where m.id = v_message1_id;
  exception when unique_violation then
    v_dup_failed := true;
  end;
  if not v_dup_failed then
    raise exception 'C5 smoke failed: messages client dedupe unique index did not fire';
  end if;

  -- Empty body + empty attachments should fail check
  v_check_failed := false;
  begin
    insert into public.messages (
      conversation_id,
      sender_user_id,
      client_message_id,
      body,
      attachments
    ) values (
      v_conversation_id,
      v_profile1_id,
      'c5-msg-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
      '',
      '[]'::jsonb
    );
  exception when check_violation then
    v_check_failed := true;
  end;
  if not v_check_failed then
    raise exception 'C5 smoke failed: messages body/attachments check did not fire';
  end if;

  update public.messages
     set body = 'Hello from C5 smoke (edited)',
         edited_at = now()
   where id = v_message1_id;

  update public.messages
     set deleted_at = now()
   where id = v_message2_id;

  if not exists (
    select 1 from public.messages
    where id = v_message2_id
      and deleted_at is not null
  ) then
    raise exception 'C5 smoke failed: soft delete update not persisted';
  end if;

  raise notice 'ATP2 C5 messaging schema smoke PASS (transaction will rollback).';
end
$$;

select
  (select count(*) from public.conversations) as conversations_total,
  (select count(*) from public.conversation_participants) as conversation_participants_total,
  (select count(*) from public.messages) as messages_total;

rollback;

select
  'ATP2 C5 messaging schema smoke rollback complete' as status,
  now() as checked_at;
