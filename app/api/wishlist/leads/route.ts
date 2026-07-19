import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LeadRow {
  wishlist_id: string
  first_name: string
  last_name: string
  max_budget: number
  neighborhoods: string[]
  bedrooms: string
  move_in_date: string
  amenities: string[]
  notes: string | null
  created_at: string
  listing_id: string
  listing_title: string
  already_pitched: boolean
}

/**
 * GET /api/wishlist/leads
 * Returns tenant wishlists matched to the calling landlord's own listings,
 * grouped by wishlist with the list of the landlord's listings that match it.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_landlord_leads')

    if (error) {
      console.error('[Wishlist Leads] Database error:', error)
      return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
    }

    const leadsByWishlist = new Map<string, any>()
    for (const row of (data as LeadRow[]) || []) {
      let lead = leadsByWishlist.get(row.wishlist_id)
      if (!lead) {
        lead = {
          wishlistId: row.wishlist_id,
          firstName: row.first_name,
          lastName: row.last_name,
          maxBudget: row.max_budget,
          neighborhoods: row.neighborhoods,
          bedrooms: row.bedrooms,
          moveInDate: row.move_in_date,
          amenities: row.amenities,
          notes: row.notes,
          createdAt: row.created_at,
          listings: [],
        }
        leadsByWishlist.set(row.wishlist_id, lead)
      }
      lead.listings.push({
        id: row.listing_id,
        title: row.listing_title,
        alreadyPitched: row.already_pitched,
      })
    }

    return NextResponse.json({ leads: Array.from(leadsByWishlist.values()) })
  } catch (error) {
    console.error('[Wishlist Leads] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
