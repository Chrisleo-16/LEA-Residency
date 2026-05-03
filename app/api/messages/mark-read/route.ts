import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { messageId, chatId } = await request.json()

    if (!messageId || !chatId) {
      return NextResponse.json(
        { error: 'Missing messageId or chatId' },
        { status: 400 }
      )
    }

    // Mark the specific message as read
    const { error: messageError } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId)

    if (messageError) {
      console.error('Failed to mark message as read:', messageError)
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      )
    }

    // Update chat last_read_at for the user
    // Note: You'll need to pass the userId in a real implementation
    const { error: chatError } = await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)

    if (chatError) {
      console.error('Failed to update chat read status:', chatError)
      // Don't fail the request if chat update fails
    }

    return NextResponse.json({
      success: true,
      messageId,
      chatId,
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
