import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, formatPhoneNumber } from '@/lib/sms'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PendingPitch {
  id: string
  wishlist_id: string
  message: string | null
  listing: { title: string; location: string; price: number } | null
  wishlist: { id: string; first_name: string; phone: string; status: string } | null
}

/**
 * GET /api/cron/wishlist-digest
 * Runs once daily in the evening. Aggregates every landlord pitch a tenant
 * hasn't been told about yet into a single SMS, so tenants get one curated
 * digest instead of being contacted every time a manager pitches a room.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: pendingPitches, error } = await supabase
    .from('wishlist_pitches')
    .select(`
      id,
      wishlist_id,
      message,
      listing:listings ( title, location, price ),
      wishlist:tenant_wishlists!inner ( id, first_name, phone, status )
    `)
    .is('notified_at', null)
    .eq('wishlist.status', 'active')

  if (error) {
    console.error('[Wishlist Digest] Fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch pending pitches' }, { status: 500 })
  }

  const byWishlist = new Map<string, { wishlist: NonNullable<PendingPitch['wishlist']>; pitches: PendingPitch[] }>()
  for (const row of (pendingPitches as unknown as PendingPitch[]) || []) {
    if (!row.wishlist || !row.listing) continue
    const key = row.wishlist_id
    if (!byWishlist.has(key)) {
      byWishlist.set(key, { wishlist: row.wishlist, pitches: [] })
    }
    byWishlist.get(key)!.pitches.push(row)
  }

  const results: Array<{ wishlistId: string; status: string }> = []

  for (const { wishlist, pitches } of byWishlist.values()) {
    try {
      const lines = pitches.map((p, i) => {
        const listing = p.listing!
        const note = p.message ? `: "${p.message}"` : ''
        return `${i + 1}. ${listing.title} — KES ${listing.price.toLocaleString()} in ${listing.location}${note}`
      })

      const message = [
        `Hi ${wishlist.first_name}, tonight's LEA digest: ${pitches.length} manager${pitches.length > 1 ? 's' : ''} responded to your house wishlist!`,
        ...lines,
        `Found a place already? Let us know so we can stop matching you. Questions? Call LEA support on +254 799 956574.`,
      ].join('\n')

      const smsResult = await sendSMS({ to: formatPhoneNumber(wishlist.phone), message })
      if (!smsResult.success) {
        console.error(`[Wishlist Digest] SMS failed for wishlist ${wishlist.id}:`, smsResult.error)
        results.push({ wishlistId: wishlist.id, status: 'sms_failed' })
        continue
      }

      await supabase
        .from('wishlist_pitches')
        .update({ notified_at: new Date().toISOString() })
        .in('id', pitches.map((p) => p.id))

      results.push({ wishlistId: wishlist.id, status: 'sent' })
    } catch (err) {
      console.error(`[Wishlist Digest] Error for wishlist ${wishlist.id}:`, err)
      results.push({ wishlistId: wishlist.id, status: 'error' })
    }
  }

  return NextResponse.json({
    success: true,
    digestsSent: results.filter((r) => r.status === 'sent').length,
    results,
  })
}
