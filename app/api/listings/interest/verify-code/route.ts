import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { formatPhoneNumber } from '@/lib/sms'
import { notifyLandlordOfInterest } from '@/lib/listingInterestNotify'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_ATTEMPTS = 5

/**
 * POST /api/listings/interest/verify-code
 * Step 2 of the no-account "I'm Interested" flow. On a correct code,
 * records the interest with the verified phone (no auth.users account
 * needed) and notifies the landlord — same outcome as the logged-in path
 * in app/api/listings/interest/route.ts, just reached without a login.
 */
export async function POST(request: NextRequest) {
  try {
    const { listingId, phone, code, name } = await request.json()

    if (!listingId || !phone || !code) {
      return NextResponse.json({ error: 'Missing required field: listingId, phone, or code' }, { status: 400 })
    }

    const normalizedPhone = formatPhoneNumber(phone)

    const { data: pending } = await supabase
      .from('interest_verification_codes')
      .select('id, code, expires_at, attempts, verified')
      .eq('listing_id', listingId)
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!pending) {
      return NextResponse.json({ error: 'No verification code found for this number — request a new one' }, { status: 404 })
    }

    if (pending.verified) {
      return NextResponse.json({ error: 'This code was already used — request a new one' }, { status: 400 })
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This code has expired — request a new one' }, { status: 400 })
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts — request a new code' }, { status: 429 })
    }

    if (pending.code !== String(code).trim()) {
      await supabase
        .from('interest_verification_codes')
        .update({ attempts: pending.attempts + 1 })
        .eq('id', pending.id)

      return NextResponse.json(
        { error: 'Incorrect code', attemptsRemaining: MAX_ATTEMPTS - pending.attempts - 1 },
        { status: 400 }
      )
    }

    await supabase.from('interest_verification_codes').update({ verified: true }).eq('id', pending.id)

    const { data: listing } = await supabase
      .from('listings')
      .select('id, title, created_by')
      .eq('id', listingId)
      .maybeSingle()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const tenantName = (typeof name === 'string' && name.trim()) || 'A tenant'

    const { error: insertError } = await supabase.from('listing_interests').upsert(
      {
        listing_id: listingId,
        tenant_id: null,
        guest_phone: normalizedPhone,
        guest_name: tenantName,
      },
      { onConflict: 'listing_id,guest_phone', ignoreDuplicates: true }
    )

    if (insertError) {
      console.error('[Interest OTP] Failed to record guest interest:', insertError)
      return NextResponse.json({ error: 'Failed to record interest' }, { status: 500 })
    }

    await notifyLandlordOfInterest({
      listingOwnerId: listing.created_by,
      listingId,
      listingTitle: listing.title,
      tenantName,
      tenantPhone: normalizedPhone,
    })

    return NextResponse.json({ success: true, message: 'Interest recorded, owner notified' })
  } catch (error) {
    console.error('[Interest OTP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
