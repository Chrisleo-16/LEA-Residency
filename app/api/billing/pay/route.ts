import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

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

  if (!profile?.phone_number) {
    return NextResponse.json({ error: 'No phone number on file' }, { status: 400 })
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
    return NextResponse.json({ error: 'A payment is already pending for this period' }, { status: 400 })
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
    const stkResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.PAYHERO_AUTH}`,
      },
      body: JSON.stringify({
        amount,
        phone_number: profile.phone_number,
        channel_id: process.env.PAYHERO_CHANNEL_ID,
        provider: 'm-pesa',
        external_reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/payhero-callback`,
      }),
    })

    if (!stkResponse.ok) {
      return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'Check your phone for the M-Pesa prompt' })
  } catch (err) {
    console.error('[Billing Pay] Error:', err)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}