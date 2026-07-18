// app/api/push/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/pushServer' // ← correct, matches your actual file// ← adjust path to match where this actually lives

/**
 * POST /api/push/send
 * Sends push notifications to one or more users.
 * Delegates actual sending to sendPushToUser (service-role client,
 * safe to reuse from server-to-server contexts too).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds, title, body: notificationBody, url } = body

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: title and body' },
        { status: 400 }
      )
    }

    // Auth check — only a logged-in user can trigger this HTTP route.
    // (Server-to-server code, e.g. M-Pesa callbacks, should call
    // sendPushToUser directly instead of hitting this endpoint.)
    const supabase = await createClient()
    let authUser = null
    const { data: authData } = await supabase.auth.getUser()
    if (authData?.user) {
      authUser = authData.user
    } else {
      const authHeader = request.headers.get('Authorization')
      const token = authHeader?.split(' ')[1]
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data, error: bearerError } = await supabase.auth.getUser(token)
      if (bearerError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      authUser = data.user
    }

    // TODO: role check — restrict to landlords/admins if this shouldn't be tenant-triggerable

    // Resolve target user list: explicit userIds, or broadcast to everyone with an active subscription
    let targetUserIds: string[] = userIds

    if (!targetUserIds || targetUserIds.length === 0) {
      const { data: allSubs } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true)

      targetUserIds = [...new Set((allSubs || []).map((s) => s.user_id))]
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No active subscriptions found', sent: 0 })
    }

    const results = await Promise.allSettled(
      targetUserIds.map((uid) => sendPushToUser(uid, title, notificationBody, url || '/dashboard'))
    )

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value === true).length
    const failed = results.length - sent

    return NextResponse.json({
      success: true,
      message: `Notifications sent: ${sent} successful, ${failed} failed`,
      sent,
      failed,
      total: results.length,
    })
  } catch (error) {
    console.error('[Push] Send exception:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}

/**
 * GET /api/push/send
 * Sends a test notification to the currently authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() // ← this line was missing before, causing the crash

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized - no token' }, { status: 401 })

    const { data, error: authError } = await supabase.auth.getUser(token)
    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized - invalid token' }, { status: 401 })
    }

    const sent = await sendPushToUser(
      data.user.id,
      'LEA Executive - Test Notification',
      'This is a test push notification from LEA Executive!',
      '/dashboard'
    )

    return NextResponse.json({
      success: sent,
      message: sent ? 'Test notification sent' : 'No active subscriptions found for this user',
    })
  } catch (error) {
    console.error('[Push] Test send exception:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}