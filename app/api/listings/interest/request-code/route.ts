import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendSMS, validatePhoneNumber, formatPhoneNumber } from '@/lib/sms'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CODE_LENGTH = 6
const CODE_TTL_MINUTES = 10
const MAX_CODES_PER_HOUR = 3

function generateCode(): string {
  return Math.floor(Math.random() * 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, '0')
}

/**
 * POST /api/listings/interest/request-code
 * Step 1 of the no-account "I'm Interested" flow: send a 6-digit SMS code
 * to prove phone ownership, instead of requiring a full login. Step 2 is
 * /api/listings/interest/verify-code.
 */
export async function POST(request: NextRequest) {
  try {
    const { listingId, phone } = await request.json()

    if (!listingId || !phone) {
      return NextResponse.json({ error: 'Missing required field: listingId or phone' }, { status: 400 })
    }

    if (!validatePhoneNumber(phone)) {
      return NextResponse.json({ error: 'Invalid phone number. Please use a valid Kenyan phone number.' }, { status: 400 })
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .maybeSingle()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const normalizedPhone = formatPhoneNumber(phone)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count } = await supabase
      .from('interest_verification_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .gte('created_at', oneHourAgo)

    if ((count || 0) >= MAX_CODES_PER_HOUR) {
      return NextResponse.json({ error: 'Too many code requests for this number. Please try again later.' }, { status: 429 })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('interest_verification_codes').insert({
      listing_id: listingId,
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
    })

    if (insertError) {
      console.error('[Interest OTP] Failed to store code:', insertError)
      return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 })
    }

    const smsResult = await sendSMS({
      to: normalizedPhone,
      message: `Your LEA verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. Don't share this code with anyone.`,
    })

    if (!smsResult.success) {
      console.error('[Interest OTP] Failed to send SMS:', smsResult)
      return NextResponse.json({ error: 'Failed to send verification code — please try again' }, { status: 502 })
    }

    return NextResponse.json({ success: true, expiresInMinutes: CODE_TTL_MINUTES })
  } catch (error) {
    console.error('[Interest OTP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
