import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePhoneNumber, formatPhoneNumber, sendSMS } from '@/lib/sms'
import { sendPushToUser } from '@/lib/pushServer'

const MAX_NOTIFIED_MATCHES = 5

function bedroomsMatch(wishlistBedrooms: string, listingBedrooms: number): boolean {
  switch (wishlistBedrooms) {
    case 'studio':
      return listingBedrooms <= 1
    case '1':
      return listingBedrooms === 1
    case '2':
      return listingBedrooms === 2
    case '3+':
      return listingBedrooms >= 3
    default:
      return false
  }
}

function locationMatches(neighborhoods: string[], listingLocation: string): boolean {
  const loc = listingLocation.toLowerCase()
  return neighborhoods.some((n) => {
    const place = n.split(',')[0].trim().toLowerCase()
    return place.length > 0 && loc.includes(place)
  })
}

async function notifyMatchingLandlords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wishlistId: string,
  body: WishlistFormData
) {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, location, price, bedrooms, created_by')

  if (error || !listings?.length) return

  const matches = listings.filter(
    (l) =>
      l.price <= body.maxBudget &&
      bedroomsMatch(body.bedrooms, l.bedrooms) &&
      locationMatches(body.neighborhoods, l.location)
  )

  if (!matches.length) return

  const notified = matches.slice(0, MAX_NOTIFIED_MATCHES)
  if (matches.length > notified.length) {
    console.log(
      `[Wishlist] ${matches.length} listings matched wishlist ${wishlistId}, only notifying the first ${notified.length}`
    )
  }

  await Promise.allSettled(
    notified.map((listing) =>
      sendPushToUser(
        listing.created_by,
        '🏠 New tenant lead!',
        `Looking for a ${body.bedrooms === 'studio' ? 'studio' : body.bedrooms + '-bed'} near ${listing.location}, budget KES ${body.maxBudget.toLocaleString()}. Pitch "${listing.title}"?`,
        '/listings',
        { type: 'wishlist_match', wishlistId, listingId: listing.id }
      )
    )
  )
}

interface WishlistFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  maxBudget: number
  neighborhoods: string[]
  bedrooms: string
  moveInDate: string
  amenities: string[]
  notes: string
  agreedToTerms: boolean
}

/**
 * POST /api/wishlist
 * Handles tenant house-hunting wishlist submissions (reverse matchmaking).
 */
export async function POST(request: NextRequest) {
  try {
    const body: WishlistFormData = await request.json()

    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'maxBudget', 'bedrooms', 'moveInDate']
    const missingFields = requiredFields.filter((field) => !body[field as keyof WishlistFormData])

    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    if (!body.neighborhoods?.length) {
      return NextResponse.json(
        { error: 'Select at least one target neighborhood' },
        { status: 400 }
      )
    }

    if (!body.agreedToTerms) {
      return NextResponse.json(
        { error: 'You must agree to the terms to continue' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (!validatePhoneNumber(body.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please use a valid Kenyan phone number.' },
        { status: 400 }
      )
    }

    const moveInDate = new Date(body.moveInDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (moveInDate < today) {
      return NextResponse.json(
        { error: 'Move-in date must be today or in the future' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(body.maxBudget) || body.maxBudget <= 0) {
      return NextResponse.json({ error: 'Enter a valid budget' }, { status: 400 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const supabase = await createClient()
    const id = randomUUID()

    // Deliberately not using .select() here: the SELECT policy on
    // tenant_wishlists is admin-only, and Postgres requires a passing SELECT
    // policy to satisfy RETURNING — even on an otherwise-valid INSERT. Using
    // .select() would make anonymous submissions fail RLS on the read-back,
    // not the insert itself. Generating the id ourselves avoids needing it.
    const { error } = await supabase.from('tenant_wishlists').insert({
      id,
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone,
      max_budget: body.maxBudget,
      neighborhoods: body.neighborhoods,
      bedrooms: body.bedrooms,
      move_in_date: body.moveInDate,
      amenities: body.amenities || [],
      notes: body.notes || null,
      agreed_to_terms: body.agreedToTerms,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'active',
    })

    if (error) {
      console.error('[Wishlist] Database error:', error)
      return NextResponse.json({ error: 'Failed to save wishlist' }, { status: 500 })
    }

    try {
      const formattedPhone = formatPhoneNumber(body.phone)
      await sendSMS({
        to: formattedPhone,
        message: `Hi ${body.firstName}, your LEA house wishlist is live! We're matching you with managers now — check your evening digest for pitches.`,
      })
    } catch (smsError) {
      console.error('[Wishlist] SMS notification failed:', smsError)
    }

    try {
      await notifyMatchingLandlords(supabase, id, body)
    } catch (matchError) {
      console.error('[Wishlist] Matching/notify failed:', matchError)
    }

    console.log('[Wishlist] New wishlist received:', id)

    return NextResponse.json({
      success: true,
      message: 'Wishlist submitted successfully',
      wishlistId: id,
    })
  } catch (error) {
    console.error('[Wishlist] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
