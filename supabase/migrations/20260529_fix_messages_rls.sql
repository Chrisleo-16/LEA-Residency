-- Fix RLS policies on messages and conversations tables to allow inserts during landlord_id migration

-- ============================================================================
-- ADD LANDLORD_BLOCK_ID TO PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS landlord_block_id UUID;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_landlord_block_id ON profiles(landlord_block_id);

-- ============================================================================
-- ADD LANDLORD_ID TO POLICIES
-- ============================================================================

ALTER TABLE policies ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_policies_landlord_id ON policies(landlord_id);

-- ============================================================================
-- ADD LANDLORD_ID TO CONVERSATIONS
-- ============================================================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_landlord_id ON conversations(landlord_id);

-- ============================================================================
-- ADD LANDLORD_ID TO MESSAGES
-- ============================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_landlord_id ON messages(landlord_id);

-- ============================================================================
-- CREATE TRIGGER FUNCTIONS FOR LANDLORD_ID AUTO-SET
-- ============================================================================

-- Create function to auto-set landlord_id on conversations
CREATE OR REPLACE FUNCTION set_conversation_landlord_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.landlord_id IS NULL THEN
    NEW.landlord_id := (SELECT landlord_block_id FROM profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-set landlord_id on messages
CREATE OR REPLACE FUNCTION set_message_landlord_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.landlord_id IS NULL THEN
    NEW.landlord_id := (SELECT landlord_id FROM conversations WHERE id = NEW.conversation_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX MESSAGES RLS POLICIES
-- ============================================================================

-- Drop existing restrictive RLS policies on messages
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;

-- Create permissive insert policy that only checks sender_id
CREATE POLICY "messages_insert_permissive" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Create permissive select policy that allows users to see messages in conversations they participate in
CREATE POLICY "messages_select_permissive" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- ============================================================================
-- FIX CONVERSATIONS RLS POLICIES
-- ============================================================================

-- Drop existing restrictive RLS policies on conversations
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;

-- Create permissive insert policy that allows authenticated users to create conversations
CREATE POLICY "conversations_insert_permissive" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (true);

-- Create permissive select policy that allows users to see conversations they participate in
CREATE POLICY "conversations_select_permissive" ON public.conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- ============================================================================
-- FIX CONVERSATION_PARTICIPANTS RLS POLICIES
-- ============================================================================

-- Drop existing restrictive RLS policies on conversation_participants
DROP POLICY IF EXISTS "participants_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;

-- Create permissive insert policy that allows authenticated users to join conversations
CREATE POLICY "participants_insert_permissive" ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (true);

-- Create permissive select policy that allows users to see all participants
CREATE POLICY "participants_select_permissive" ON public.conversation_participants
FOR SELECT TO authenticated
WITH CHECK (true);

-- ============================================================================
-- CREATE TRIGGERS FOR AUTO-SET LANDLORD_ID
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_conversation_landlord_id ON public.conversations;
DROP TRIGGER IF EXISTS trigger_set_message_landlord_id ON public.messages;

-- Create triggers
CREATE TRIGGER trigger_set_conversation_landlord_id
BEFORE INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION set_conversation_landlord_id();

CREATE TRIGGER trigger_set_message_landlord_id
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION set_message_landlord_id();
