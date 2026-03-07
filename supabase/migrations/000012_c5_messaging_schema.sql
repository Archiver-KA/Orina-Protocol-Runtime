-- ATP2 Phase C / Batch C5
-- Messaging schema (deferred batch now activated): conversations + participants + messages
-- Scope: schema/indexes/triggers only. RLS is in 000013.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct',
  title text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_type_chk
    check (type in ('direct', 'group', 'system'))
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  constraint conversation_participants_role_chk
    check (role in ('member', 'admin', 'owner', 'system')),
  constraint conversation_participants_last_read_at_chk
    check (last_read_at is null or last_read_at >= joined_at),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  client_message_id text not null,
  body text null,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz null,
  deleted_at timestamptz null,
  constraint messages_client_message_id_nonempty_chk
    check (btrim(client_message_id) <> ''),
  constraint messages_attachments_array_chk
    check (jsonb_typeof(attachments) = 'array'),
  constraint messages_body_or_attachments_chk
    check (
      coalesce(length(nullif(body, '')), 0) > 0
      or jsonb_array_length(attachments) > 0
    ),
  constraint messages_edited_at_chk
    check (edited_at is null or edited_at >= created_at),
  constraint messages_deleted_at_chk
    check (deleted_at is null or deleted_at >= created_at)
);

create unique index if not exists idx_messages_conversation_sender_client_message_id_uk
  on public.messages (conversation_id, sender_user_id, client_message_id);

create index if not exists idx_conversations_updated_at_desc
  on public.conversations (updated_at desc);

create index if not exists idx_conversation_participants_user_id_joined_at_desc
  on public.conversation_participants (user_id, joined_at desc);

create index if not exists idx_conversation_participants_user_id_last_read_at_desc
  on public.conversation_participants (user_id, last_read_at desc nulls last);

create index if not exists idx_messages_conversation_id_created_at_desc
  on public.messages (conversation_id, created_at desc);

create index if not exists idx_messages_sender_user_id_created_at_desc
  on public.messages (sender_user_id, created_at desc);

create index if not exists idx_messages_conversation_id_visible_created_at_desc
  on public.messages (conversation_id, created_at desc)
  where deleted_at is null;

-- Attach shared updated_at trigger to conversations (set_updated_at() must already exist from D1 base)
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    raise exception 'public.set_updated_at() is required before applying 000012_c5_messaging_schema.sql';
  end if;
end
$$;

drop trigger if exists trg_conversations_set_updated_at on public.conversations;
create trigger trg_conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

-- Keep conversation ordering stable when messages are inserted/edited/soft-deleted.
create or replace function public.touch_conversation_updated_at_on_message_change_c5_v1()
returns trigger
language plpgsql
as $$
declare
  v_conversation_id uuid;
begin
  v_conversation_id := coalesce(new.conversation_id, old.conversation_id);
  if v_conversation_id is not null then
    update public.conversations
       set updated_at = now()
     where id = v_conversation_id;
  end if;
  return coalesce(new, old);
end
$$;

drop trigger if exists trg_messages_touch_conversations_updated_at_c5_v1 on public.messages;
create trigger trg_messages_touch_conversations_updated_at_c5_v1
after insert or update or delete on public.messages
for each row execute function public.touch_conversation_updated_at_on_message_change_c5_v1();
