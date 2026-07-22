-- Soft delete for chat messages ("Delete for Everyone")
-- Run in Supabase SQL Editor or via: supabase db push

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
    CREATE TYPE message_status AS ENUM ('sent', 'deleted');
  END IF;
END$$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS status message_status NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

COMMENT ON COLUMN public.messages.status IS 'sent | deleted (soft delete for everyone)';
COMMENT ON COLUMN public.messages.deleted_at IS 'When the message was deleted for everyone';

CREATE INDEX IF NOT EXISTS idx_messages_conversation_status
  ON public.messages (conversation_id, status);

-- Authoritative delete window using database clock (avoids JS timezone bugs)
CREATE OR REPLACE FUNCTION public.soft_delete_message_for_everyone(
  p_message_id uuid,
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message public.messages%ROWTYPE;
BEGIN
  SELECT * INTO v_message
  FROM public.messages
  WHERE id = p_message_id
    AND conversation_id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found';
  END IF;

  IF v_message.sender_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not_sender';
  END IF;

  IF v_message.status = 'deleted' THEN
    RETURN jsonb_build_object(
      'message_id', v_message.id,
      'chat_id', v_message.conversation_id,
      'status', 'deleted'
    );
  END IF;

  UPDATE public.messages
  SET
    content = '',
    status = 'deleted',
    deleted_at = now(),
    attachment_url = NULL,
    attachment_type = NULL
  WHERE id = p_message_id
    AND sender_id = p_user_id
    AND conversation_id = p_conversation_id
    AND (status IS NULL OR status = 'sent');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delete_failed';
  END IF;

  RETURN jsonb_build_object(
    'message_id', p_message_id,
    'chat_id', p_conversation_id,
    'status', 'deleted'
  );
END;
$$;
