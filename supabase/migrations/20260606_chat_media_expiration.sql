-- Database Migration: Chat Media with WhatsApp-like Expiration Tiers
-- File: supabase/migrations/20260606_chat_media_expiration.sql

-- 1. Update columns on messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio')),
  ADD COLUMN IF NOT EXISTS media_path TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'fulltime' CHECK (view_mode IN ('once', 'twice', 'fulltime')),
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Populate chat_id for existing messages from conversation_id (and vice versa)
UPDATE public.messages SET chat_id = conversation_id WHERE chat_id IS NULL AND conversation_id IS NOT NULL;
UPDATE public.messages SET conversation_id = chat_id WHERE conversation_id IS NULL AND chat_id IS NOT NULL;

-- 3. Set NOT NULL and DEFAULT constraints on messages table
ALTER TABLE public.messages 
  ALTER COLUMN chat_id SET NOT NULL,
  ALTER COLUMN message_type SET NOT NULL,
  ALTER COLUMN view_mode SET NOT NULL,
  ALTER COLUMN view_count SET NOT NULL;

-- 4. Convert status column from enum to TEXT with CHECK constraint
-- This drops the dependency on the enum type message_status and makes it flexible
ALTER TABLE public.messages ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.messages ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE public.messages ALTER COLUMN status SET DEFAULT 'sent';
ALTER TABLE public.messages ADD CONSTRAINT messages_status_check CHECK (status IN ('sent', 'deleted', 'expired'));

-- 5. Convert created_at column to timestamp with time zone (timestamptz)
ALTER TABLE public.messages ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.messages ALTER COLUMN created_at SET NOT NULL;

-- 6. Trigger to keep chat_id and conversation_id in sync
CREATE OR REPLACE FUNCTION sync_message_chat_and_conversation_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chat_id IS NULL AND NEW.conversation_id IS NOT NULL THEN
    NEW.chat_id := NEW.conversation_id;
  ELSIF NEW.conversation_id IS NULL AND NEW.chat_id IS NOT NULL THEN
    NEW.conversation_id := NEW.chat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_message_chat_and_conversation_id ON public.messages;
CREATE TRIGGER trigger_sync_message_chat_and_conversation_id
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION sync_message_chat_and_conversation_id();

-- 7. Trigger to handle media view count expiration (runs BEFORE UPDATE to modify columns)
CREATE OR REPLACE FUNCTION check_media_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_mode = 'once' AND NEW.view_count >= 1 THEN
    NEW.status := 'expired';
    NEW.media_path := NULL;
  ELSIF NEW.view_mode = 'twice' AND NEW.view_count >= 2 THEN
    NEW.status := 'expired';
    NEW.media_path := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_media_expiration_trigger ON public.messages;
CREATE TRIGGER check_media_expiration_trigger
BEFORE UPDATE OF view_count ON public.messages
FOR EACH ROW
EXECUTE FUNCTION check_media_expiration();

-- 8. Create indexes for new columns to ensure performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_status_view_mode ON public.messages(status, view_mode);

-- 9. Provision storage bucket 'chat-media' under the storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', false, 10485760, ARRAY['image/*', 'audio/*'])
ON CONFLICT (id) DO NOTHING;

-- 10. Provision standard RLS policies for storage bucket
CREATE POLICY "Allow authenticated users to read chat-media" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'chat-media');

CREATE POLICY "Allow authenticated users to insert chat-media" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Allow authenticated users to delete chat-media" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'chat-media');
