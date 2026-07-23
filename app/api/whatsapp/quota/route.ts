import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhatsAppQuotaStatus } from '@/lib/whatsapp'

/**
 * GET /api/whatsapp/quota
 * Current usage against the rolling-24h unique-new-conversation cap.
 * Developer-only — this is a portfolio-wide operational metric, not
 * something tied to an individual landlord's listings.
 *
 * Note: the window is rolling, not a calendar-day reset at midnight — treat
 * "remaining" as "in the last 24 hours", not "left today".
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'developer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = await getWhatsAppQuotaStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('[WhatsApp Quota] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
