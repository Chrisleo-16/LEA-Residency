'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Initialize the Supabase Client with the service role key to bypass RLS policies on storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Generate a short-lived signed upload URL for chat media
 * @param path - The storage path (e.g., 'chats/chat-id/user-id/filename.ext')
 * @returns Signed upload URL valid for 60 seconds
 */
export async function generateUploadUrl(path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('chat-media')
      .createSignedUploadUrl(path, 60)

    if (error) throw error

    return { success: true, signedUrl: data.signedUrl, path }
  } catch (error: any) {
    console.error('[generateUploadUrl] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get a secure, time-limited media delivery URL
 * Only accessible to the sender or recipient of the message
 * @param messageId - The UUID of the message
 * @returns Signed download URL valid for 30 seconds, or 403/404 errors
 */
export async function getMediaDeliveryUrl(messageId: string) {
  try {
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', status: 401 }
    }

    // 2. Fetch message details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('media_path, status, sender_id, conversation_id')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return { success: false, error: 'Message not found', status: 404 }
    }

    // 3. Check if message is expired
    if (message.status === 'expired' || !message.media_path) {
      return { success: false, error: 'Media has expired', status: 410 }
    }

    // 4. Verify user permissions: User must be sender or a conversation participant (recipient)
    const isSender = message.sender_id === user.id
    let isRecipient = false

    if (!isSender) {
      const { data: participant, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', message.conversation_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (participant) {
        isRecipient = true
      }
    }

    if (!isSender && !isRecipient) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    // 5. Generate signed download URL (30 seconds validity)
    const { data: signedData, error: signError } = await supabase.storage
      .from('chat-media')
      .createSignedUrl(message.media_path, 30)

    if (signError) throw signError

    return { success: true, signedUrl: signedData.signedUrl }
  } catch (error: any) {
    console.error('[getMediaDeliveryUrl] Error:', error)
    return { success: false, error: error.message, status: 500 }
  }
}

/**
 * Track media view and handle expiration logic
 * Only callable by the RECIPIENT of the message, not the sender
 * @param messageId - The UUID of the message
 * @returns Success status or error details
 */
export async function trackMediaView(messageId: string) {
  try {
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Fetch message details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('sender_id, conversation_id, view_mode, view_count, status, media_path')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return { success: false, error: 'Message not found' }
    }

    // 3. Ensure the calling user is the RECIPIENT, not the sender
    if (message.sender_id === user.id) {
      return { success: false, error: 'Sender cannot increment view count' }
    }

    // 4. Verify recipient is a participant of the conversation
    const { data: participant, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (partError || !participant) {
      return { success: false, error: 'Forbidden' }
    }

    // 5. If message is already expired, skip tracking
    if (message.status === 'expired') {
      return { success: true, alreadyExpired: true }
    }

    // 6. Increment view count
    const newViewCount = (message.view_count || 0) + 1

    // 7. Evaluate expiration thresholds
    let shouldExpire = false
    if (message.view_mode === 'once' && newViewCount >= 1) {
      shouldExpire = true
    } else if (message.view_mode === 'twice' && newViewCount >= 2) {
      shouldExpire = true
    }

    // 8. Commit the update to PostgreSQL
    const updates: any = {
      view_count: newViewCount,
    }

    if (shouldExpire) {
      updates.status = 'expired'
      updates.media_path = null // Nullify column references
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', messageId)

    if (updateError) throw updateError

    // 9. If expired, delete the physical file from private Supabase Storage
    if (shouldExpire && message.media_path) {
      try {
        const { error: deleteStorageError } = await supabase.storage
          .from('chat-media')
          .remove([message.media_path])

        if (deleteStorageError) {
          console.error('[trackMediaView] Failed to remove storage file:', deleteStorageError.message)
        }
      } catch (storageError) {
        console.error('[trackMediaView] Exception deleting storage file:', storageError)
      }
    }

    // Revalidate paths if necessary
    revalidatePath('/dashboard')

    return {
      success: true,
      expired: shouldExpire,
      viewCount: newViewCount
    }
  } catch (error: any) {
    console.error('[trackMediaView] Error:', error)
    return { success: false, error: error.message }
  }
}
