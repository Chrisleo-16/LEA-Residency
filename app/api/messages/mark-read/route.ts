import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function authenticate(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { supabase, user: null, profile: null, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, landlord_block_id')
    .eq('id', data.user.id)
    .maybeSingle()

  return { supabase, user: data.user, profile, error: null }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId, conversationId } = await request.json()

    if (!messageId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing messageId or conversationId' },
        { status: 400 }
      )
    }

    // Landlord isolation check: ensure conversation belongs to user's landlord
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, landlord_id')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (profile?.role === 'tenant' || profile?.role === 'landlord') {
      if (!profile.landlord_block_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (conversation.landlord_id !== profile.landlord_block_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Ownership check: ensure user is a participant in the conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark the specific message as read
    const { error: messageError } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId)
      .eq('conversation_id', conversationId)

    if (messageError) {
      console.error('Failed to mark message as read:', messageError)
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      )
    }

    // Update conversation participant last_read_at for the user
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (participantError) {
      console.error('Failed to update conversation read status:', participantError)
      // Don't fail the request if participant update fails
    }

    return NextResponse.json({
      success: true,
      messageId,
      conversationId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Mark read API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
