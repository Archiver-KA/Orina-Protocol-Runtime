-- Migration 000058: unblock agent thread writes and add a message-count helper RPC.

DROP POLICY IF EXISTS "agent_threads_deny_all" ON public.agent_threads;

DROP POLICY IF EXISTS "agent_messages_deny_all" ON public.agent_messages;

CREATE OR REPLACE FUNCTION increment_thread_message_count(tid TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE agent_threads
  SET message_count = message_count + 1,
      updated_at = now()
  WHERE id = tid;
$$;