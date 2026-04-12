import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:admin@lea-residency.com', // Contact email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

/**
 * POST /api/push/send
 * Sends push notifications to users
 *
 * Based on: https://medium.com/@vedantsaraswat_44942/configuring-push-notifications-in-a-pwa-part-1-1b8e9fe2954
 * - Uses VAPID protocol for secure server-side push
 * - Can send to specific users or broadcast to all active subscriptions
 * - Handles notification payload with title, body, icon, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds, title, body: notificationBody, url, icon, badge } = body

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: title and body' },
        { status: 400 }
      )
    }

    // Get authorization header to verify admin/landlord access
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - no auth header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid token format' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const { data, error: authError } = await supabase.auth.getUser(token)
    if (authError || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      )
    }

    // TODO: Add role check to ensure only landlords/admins can send notifications
    // For now, allow any authenticated user

    // Get subscriptions to send to
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Send to specific users
      query = query.in('user_id', userIds)
    }
    // If no userIds specified, send to all active subscriptions (broadcast)

    const { data: subscriptions, error: subError } = await query

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        sent: 0,
      })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      url: url || '/dashboard',
      timestamp: Date.now(),
    })

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.auth_key,
                p256dh: sub.p256dh_key,
              },
            },
            payload
          )
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          console.error('[Push] Send error for endpoint:', sub.endpoint, error.message)

          // If subscription is invalid/expired, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 400) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('endpoint', sub.endpoint)
          }

          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`[Push] Sent notifications: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      sent: successful,
      failed,
      total: results.length,
    })
  } catch (error) {
    console.error('[Push] Send exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/push/send
 * Test endpoint to send a test notification to current user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - no auth header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid token format' },
        { status: 401 }
      )
    }

    const { data, error: authError } = await supabase.auth.getUser(token)
    if (authError || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      )
    }

    const userId = data.user.id

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active subscriptions found for this user',
      })
    }

    // Send test notification
    const payload = JSON.stringify({
      title: 'LEA Executive - Test Notification',
      body: 'This is a test push notification from LEA Executive!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/dashboard',
      timestamp: Date.now(),
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.auth_key,
                p256dh: sub.p256dh_key,
              },
            },
            payload
          )
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          console.error('[Push] Test send error:', error.message)
          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length

    return NextResponse.json({
      success: successful > 0,
      message: `Test notification sent to ${successful} device(s)`,
      sent: successful,
    })
  } catch (error) {
    console.error('[Push] Test send exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
