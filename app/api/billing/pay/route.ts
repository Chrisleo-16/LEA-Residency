import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const getPayHeroAuth = () =>
  Buffer.from(
    `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`
  ).toString('base64')

const CHANNEL_ID = parseInt(process.env.PAYHERO_CHANNEL_ID || '6731')
const PAYHERO_API = 'https://backend.payhero.co.ke/api/v2'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const body = await req.json().catch(() => ({}))
  const phoneFromBody = body?.phone

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('landlord_subscriptions')
    .select('id, monthly_fee, setup_fee_paid, status')
    .eq('landlord_id', user.id)
    .maybeSingle()

  if (!subscription) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('id', user.id)
    .single()

  const rawPhone = phoneFromBody || profile?.phone_number

  if (!rawPhone) {
    return NextResponse.json({ error: 'No phone number available' }, { status: 400 })
  }

  // Normalize phone to 07XXXXXXXXX
  let phone = rawPhone.toString().trim()
  phone = phone.replace(/^254/, '0').replace(/^\+254/, '0')
  if (!phone.startsWith('0')) {
    phone = '0' + phone
  }

  const isSetup = !subscription.setup_fee_paid
  const amount = isSetup ? 5000 : subscription.monthly_fee
  const billingPeriod = isSetup ? 'SETUP' : new Date().toISOString().slice(0, 7)
  const reference = `SUBFEE-${user.id}-${billingPeriod}`
  const paymentType = isSetup ? 'setup' : 'monthly'

  // Check for existing pending payment for this period
  const { data: existingPending } = await serviceClient
    .from('subscription_payments')
    .select('id')
    .eq('subscription_id', subscription.id)
    .eq('billing_period', billingPeriod)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
  // Delete the stale pending record and allow retry
  await serviceClient
    .from('subscription_payments')
    .delete()
    .eq('id', existingPending.id)
}

  await serviceClient.from('subscription_payments').insert({
    subscription_id: subscription.id,
    landlord_id: user.id,
    amount,
    status: 'pending',
    payment_type: paymentType,
    billing_period: billingPeriod,
  })

  try {
    const stkResponse = await fetch(`${PAYHERO_API}/payments`, {  // ✅ /payments endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${getPayHeroAuth()}`,  // ✅ built from USERNAME:PASSWORD
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: phone,                          // ✅ normalized phone
        channel_id: CHANNEL_ID,                      // ✅ parsed as int
        provider: 'm-pesa',
        network_code: '63902',                        // ✅ added
        external_reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mpesa/callback`, // ✅ correct env var
      }),
    })

    const data = await stkResponse.json()

    if (!stkResponse.ok) {
      console.error('[Billing Pay] STK push failed:', data)
      return NextResponse.json({ error: 'Failed to initiate payment', details: data }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'Check your phone for the M-Pesa prompt' })
  } catch (err) {
    console.error('[Billing Pay] Error:', err)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}