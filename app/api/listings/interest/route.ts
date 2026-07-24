import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyLandlordOfInterest } from '@/lib/listingInterestNotify'

/**
 * POST /api/listings/interest
 * A tenant taps "I'm Interested" on a listing. Auto-notifies the listing
 * owner (push + WhatsApp, falling back to SMS) with the tenant's name and
 * phone number — no agent, no back-and-forth, the lead lands directly with
 * the landlord.
 */
export async function POST(request: NextRequest) {
  try {
    const { listingId, message } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing required field: listingId' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, title, created_by')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.created_by === user.id) {
      return NextResponse.json({ error: 'You cannot express interest in your own listing' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('listing_interests').upsert(
      {
        listing_id: listingId,
        tenant_id: user.id,
        message: message || null,
      },
      { onConflict: 'listing_id,tenant_id', ignoreDuplicates: true }
    )

    if (insertError) {
      console.error('[Listing Interest] Database error:', insertError)
      return NextResponse.json({ error: 'Failed to record interest' }, { status: 500 })
    }

    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('full_name, phone_number')
      .eq('id', user.id)
      .maybeSingle()

    const tenantName = tenantProfile?.full_name || 'A tenant'

    await notifyLandlordOfInterest({
      listingOwnerId: listing.created_by,
      listingId,
      listingTitle: listing.title,
      tenantName,
      tenantPhone: tenantProfile?.phone_number || null,
    })

    return NextResponse.json({ success: true, message: 'Interest recorded, owner notified' })
  } catch (error) {
    console.error('[Listing Interest] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
