import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js'

function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase URL or service role key')
  }
  return createServiceClient(url, key)
}

async function softDeleteMessage(
  admin: SupabaseClient,
  messageId: string,
  conversationId: string,
  userId: string
): Promise<{ data: { id: string; conversation_id: string } | null; error: Error | null }> {
  const deletedAt = new Date().toISOString()

  const attempts: Record<string, unknown>[] = [
    {
      content: '',
      status: 'deleted',
      deleted_at: deletedAt,
      attachment_url: null,
      attachment_type: null,
    },
    { content: '', status: 'deleted', deleted_at: deletedAt },
    { content: '', status: 'deleted' },
    { content: '', deleted_at: deletedAt },
    { content: '' },
  ]

  let lastError: Error | null = null

  for (const patch of attempts) {
    const { data, error } = await admin
      .from('messages')
      .update(patch)
      .eq('id', messageId)
      .eq('sender_id', userId)
      .eq('conversation_id', conversationId)
      .select('id, conversation_id')
      .maybeSingle()

    if (!error && data) {
      return { data, error: null }
    }
    if (error) {
      lastError = new Error(error.message)
    }
  }

  return { data: null, error: lastError }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const messageId = body?.messageId as string | undefined
    const conversationId = body?.conversationId as string | undefined

    if (!messageId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing messageId or conversationId' },
        { status: 400 }
      )
    }

    let admin: SupabaseClient
    try {
      admin = getServiceSupabase()
    } catch (e) {
      console.error('[Messages Delete API] Service client:', e)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: participant, error: participantError } = await admin
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (participantError) {
      console.error('[Messages Delete API] Participant lookup:', participantError)
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
    }

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    const { data: message, error: messageError } = await admin
      .from('messages')
      .select('id, sender_id, conversation_id, status')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (messageError) {
      console.error('[Messages Delete API] Message lookup:', messageError)
      return NextResponse.json({ error: 'Failed to load message' }, { status: 500 })
    }

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the sender can delete this message for everyone' },
        { status: 403 }
      )
    }

    if (message.status === 'deleted') {
      return NextResponse.json({
        message_id: message.id,
        chat_id: conversationId,
        status: 'deleted' as const,
      })
    }

    const { data: updated, error: deleteError } = await softDeleteMessage(
      admin,
      messageId,
      conversationId,
      user.id
    )

    if (deleteError || !updated) {
      console.error('[Messages Delete API] Soft delete failed:', deleteError?.message)
      return NextResponse.json(
        {
          error: 'Failed to delete message',
          detail:
            process.env.NODE_ENV === 'development'
              ? deleteError?.message
              : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message_id: updated.id,
      chat_id: updated.conversation_id,
      status: 'deleted' as const,
    })
  } catch (err) {
    console.error('[Messages Delete API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
