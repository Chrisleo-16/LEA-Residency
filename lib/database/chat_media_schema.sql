-- Database Migration for Chat Media with Expiration Tiers
-- Run this in Supabase SQL Editor or via supabase db push

-- Ensure messages table exists with required columns
-- If messages table already exists, this will add the new columns

-- Add new columns to messages table for media expiration
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('text', 'image', 'audio')),
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS media_path TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'deleted', 'expired')),
ADD COLUMN IF NOT EXISTS view_mode TEXT NOT NULL DEFAULT 'fulltime' CHECK (view_mode IN ('once', 'twice', 'fulltime')),
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Create chat-media private storage bucket if it doesn't exist
-- Note: This must be done manually in Supabase dashboard or via API
-- Bucket name: chat-media
-- Public: false

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_view_mode ON messages(view_mode);

-- Enable Row Level Security on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
-- Allow users to read messages from chats they participate in
CREATE POLICY "Users can read messages from their chats"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

-- Allow users to insert messages into chats they participate in
CREATE POLICY "Users can insert messages into their chats"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Allow users to update their own messages
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid());

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (sender_id = auth.uid());

-- Function to automatically expire media based on view count
CREATE OR REPLACE FUNCTION check_media_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_mode = 'once' AND NEW.view_count >= 1 THEN
    NEW.status = 'expired';
    NEW.media_path = NULL;
  ELSIF NEW.view_mode = 'twice' AND NEW.view_count >= 2 THEN
    NEW.status = 'expired';
    NEW.media_path = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check expiration on view_count update
DROP TRIGGER IF EXISTS check_media_expiration_trigger ON messages;
CREATE TRIGGER check_media_expiration_trigger
AFTER UPDATE OF view_count ON messages
FOR EACH ROW
EXECUTE FUNCTION check_media_expiration();
