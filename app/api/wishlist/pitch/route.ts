import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/wishlist/pitch
 * A landlord "pitches" one of their listings to a matched tenant wishlist.
 * Triggered from the one-tap "Pitch My Room" push notification action.
 */
export async function POST(request: NextRequest) {
  try {
    const { wishlistId, listingId, message } = await request.json()

    if (!wishlistId || !listingId) {
      return NextResponse.json(
        { error: 'Missing required fields: wishlistId and listingId' },
        { status: 400 }
      )
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
      .select('id, created_by')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.created_by !== user.id) {
      return NextResponse.json({ error: 'You do not own this listing' }, { status: 403 })
    }

    const { error } = await supabase.from('wishlist_pitches').upsert(
      {
        wishlist_id: wishlistId,
        listing_id: listingId,
        landlord_id: user.id,
        message: message || null,
      },
      { onConflict: 'wishlist_id,listing_id', ignoreDuplicates: true }
    )

    if (error) {
      console.error('[Wishlist Pitch] Database error:', error)
      return NextResponse.json({ error: 'Failed to record pitch' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Pitch recorded' })
  } catch (error) {
    console.error('[Wishlist Pitch] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
