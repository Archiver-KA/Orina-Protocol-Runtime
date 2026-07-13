-- Migration 000084: complete the AI conversation cutover from the legacy KV table.
--
-- Deployment note: deploy the relational-only Edge bundle in the same approved
-- maintenance window. This migration intentionally revokes service-role Data API
-- access to the legacy KV table after backfilling wallet-scoped conversations.
-- Rollback (owner-only, temporary): GRANT SELECT, INSERT, UPDATE, DELETE ON
-- public.kv_store_b0d68fc8 TO service_role. Do not restore anon/authenticated access.

DO $migration$
DECLARE
  legacy_record RECORD;
  legacy_message JSONB;
  legacy_meta JSONB;
  v_message_ordinal BIGINT;
  v_normalized_wallet TEXT;
  v_conversation_id TEXT;
  v_thread_id TEXT;
  v_thread_title TEXT;
  v_agent_context TEXT;
BEGIN
  FOR legacy_record IN
    SELECT
      substring(source.key FROM '^conversation:(0x[0-9a-fA-F]{40}):') AS wallet_address,
      substring(source.key FROM '^conversation:0x[0-9a-fA-F]{40}:([^:]{1,128}):messages$') AS conversation_id,
      source.value AS messages
    FROM public.kv_store_b0d68fc8 AS source
    WHERE source.key ~ '^conversation:0x[0-9a-fA-F]{40}:[^:]{1,128}:messages$'
      AND jsonb_typeof(source.value) = 'array'
  LOOP
    v_normalized_wallet := lower(legacy_record.wallet_address);
    v_conversation_id := legacy_record.conversation_id;
    v_thread_id := 'ai_thread:' || v_normalized_wallet || ':' || v_conversation_id;

    -- Skip threads already populated by the former dual-write path. This keeps
    -- the migration idempotent and avoids duplicating messages.
    IF EXISTS (SELECT 1 FROM public.agent_threads AS t WHERE t.id = v_thread_id) THEN
      CONTINUE;
    END IF;

    SELECT source.value
      INTO legacy_meta
      FROM public.kv_store_b0d68fc8 AS source
     WHERE source.key = 'conversation:' || legacy_record.wallet_address || ':' || v_conversation_id;

    v_thread_title := left(coalesce(
      nullif(legacy_meta->>'title', ''),
      (
        SELECT nullif(item->>'content', '')
        FROM jsonb_array_elements(legacy_record.messages) WITH ORDINALITY AS entries(item, ordinal)
        WHERE coalesce(item->>'senderType', '') IN ('customer', 'seller')
        ORDER BY ordinal
        LIMIT 1
      ),
      'AI Conversation'
    ), 80);

    v_agent_context := CASE legacy_meta->>'agentContext'
      WHEN 'buyer' THEN 'buyer'
      WHEN 'seller' THEN 'seller'
      WHEN 'arbiter' THEN 'arbiter'
      ELSE 'guest'
    END;

    INSERT INTO public.agent_threads (
      id,
      wallet_address,
      title,
      model_id,
      message_count,
      token_total,
      created_at,
      updated_at
    ) VALUES (
      v_thread_id,
      v_normalized_wallet,
      v_thread_title,
      'orina-ai-engine-v2',
      0,
      0,
      now(),
      now()
    );

    v_message_ordinal := 0;
    FOR legacy_message IN
      SELECT item
      FROM jsonb_array_elements(legacy_record.messages) WITH ORDINALITY AS entries(item, ordinal)
      WHERE jsonb_typeof(item) = 'object'
        AND nullif(item->>'content', '') IS NOT NULL
      ORDER BY ordinal
    LOOP
      v_message_ordinal := v_message_ordinal + 1;
      INSERT INTO public.agent_messages (
        thread_id,
        role,
        content,
        model_id,
        token_count,
        metadata,
        created_at
      ) VALUES (
        v_thread_id,
        CASE
          WHEN coalesce(legacy_message->>'senderType', '') IN ('customer', 'seller') THEN 'user'
          ELSE 'assistant'
        END,
        legacy_message->>'content',
        CASE
          WHEN coalesce(legacy_message->>'senderType', '') IN ('customer', 'seller') THEN NULL
          ELSE 'orina-ai-engine-v2'
        END,
        greatest(1, ceil(length(legacy_message->>'content')::numeric / 4)::integer),
        (
          CASE
            WHEN jsonb_typeof(legacy_message->'metadata') = 'object'
              THEN legacy_message->'metadata'
            ELSE '{}'::jsonb
          END
        ) || jsonb_build_object(
          'source', 'legacy-kv-cutover-000084',
          'legacy_message_id', nullif(legacy_message->>'id', ''),
          'conversation_id', v_conversation_id,
          'agent_context', v_agent_context
        ),
        now() + make_interval(secs => v_message_ordinal::double precision / 1000000.0)
      );
    END LOOP;

    PERFORM public.agent_thread_sync_stats(v_thread_id);
  END LOOP;
END;
$migration$;

-- A CJ access token was formerly cached as plaintext in this general-purpose
-- table. Remove it even if the preceding backfill found no conversations.
DELETE FROM public.kv_store_b0d68fc8
WHERE key = 'cj_access_token';

REVOKE ALL ON TABLE public.kv_store_b0d68fc8 FROM PUBLIC;
REVOKE ALL ON TABLE public.kv_store_b0d68fc8 FROM anon;
REVOKE ALL ON TABLE public.kv_store_b0d68fc8 FROM authenticated;
REVOKE ALL ON TABLE public.kv_store_b0d68fc8 FROM service_role;

COMMENT ON TABLE public.kv_store_b0d68fc8 IS
  'Owner-only legacy archive. Runtime Data API access revoked by migration 000084.';
