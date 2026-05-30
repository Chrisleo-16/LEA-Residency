import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// TypeScript type for push subscription from browser
interface PushSubscription {
  endpoint: string
  keys: {
    auth: string
    p256dh: string
  }
}

/**
 * POST /api/push/subscribe
 * Saves a push notification subscription for the authenticated user
 * 
 * Based on: https://medium.com/@vedantsaraswat_44942/configuring-push-notifications-in-a-pwa-part-1-1b8e9fe2954
 * - Receives the Push Subscription Object from client
 * - Stores endpoint and keys in database for server-side push
 * - Handles both new subscriptions and existing ones
 */
export async function POST(request: NextRequest) {
  try {
    // Get the push subscription object from request body
    const body: PushSubscription = await request.json()

    if (!body.endpoint || !body.keys?.auth || !body.keys?.p256dh) {
      return NextResponse.json(
        { error: 'Invalid subscription object - missing endpoint or keys' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    let userId: string | null = null
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authData?.user) {
      userId = authData.user.id
    } else {
      // Fallback: support Bearer token
      const authHeader = request.headers.get('Authorization')
      if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const token = authHeader.split(' ')[1]
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data, error: bearerError } = await supabase.auth.getUser(token)
      if (bearerError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      userId = data.user.id
    }
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'

    // Check if subscription already exists (by endpoint)
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', body.endpoint)
      .single()

    let result
    if (existing) {
      // Update existing subscription
      result = await supabase
        .from('push_subscriptions')
        .update({
          user_id: userId,
          auth_key: body.keys.auth,
          p256dh_key: body.keys.p256dh,
          is_active: true,
          updated_at: new Date().toISOString(),
          user_agent: userAgent,
          ip_address: ipAddress,
        })
        .eq('endpoint', body.endpoint)
        .select()
    } else {
      // Insert new subscription
      result = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          endpoint: body.endpoint,
          auth_key: body.keys.auth,
          p256dh_key: body.keys.p256dh,
          is_active: true,
          user_agent: userAgent,
          ip_address: ipAddress,
        })
        .select()
    }

    if (result.error) {
      console.error('[Push] Subscribe error:', result.error)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    console.log('[Push] Subscription saved for user:', userId)
    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
      data: result.data?.[0],
    })
  } catch (error) {
    console.error('[Push] Subscribe exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
