-- Run this if you already applied 20250602000000_message_soft_delete.sql without the RPC.
-- Safe to re-run: uses CREATE OR REPLACE.

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
