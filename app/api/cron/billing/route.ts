import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: dueSubscriptions, error } = await supabase
    .from('landlord_subscriptions')
    .select('id, landlord_id, monthly_fee, status')
    .lte('current_period_end', new Date().toISOString())
    .in('status', ['active', 'overdue'])

  if (error) {
    console.error('[Billing Cron] Fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }

  const results = []

  for (const sub of dueSubscriptions || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, full_name')
      .eq('id', sub.landlord_id)
      .single()

    if (!profile?.phone_number) {
      console.error(`[Billing Cron] No phone number for landlord ${sub.landlord_id}`)
      results.push({ landlord_id: sub.landlord_id, status: 'no_phone' })
      continue
    }

    const billingPeriod = new Date().toISOString().slice(0, 7)
    const reference = `SUBFEE-${sub.landlord_id}-${billingPeriod}`

    // Avoid duplicate pending records for the same period
    const { data: existingPending } = await supabase
      .from('subscription_payments')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('billing_period', billingPeriod)
      .eq('payment_type', 'monthly')
      .maybeSingle()

    if (existingPending) {
      results.push({ landlord_id: sub.landlord_id, status: 'already_pending' })
      continue
    }

    await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: sub.id,
        landlord_id: sub.landlord_id,
        amount: sub.monthly_fee,
        status: 'pending',
        payment_type: 'monthly',
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
          amount: sub.monthly_fee,
          phone_number: profile.phone_number,
          channel_id: process.env.PAYHERO_CHANNEL_ID,
          provider: 'm-pesa',
          external_reference: reference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/payhero-callback`,
        }),
      })

      if (!stkResponse.ok) {
        console.error(`[Billing Cron] STK push failed for landlord ${sub.landlord_id}`)
        await supabase
          .from('landlord_subscriptions')
          .update({ status: 'overdue' })
          .eq('id', sub.id)
        results.push({ landlord_id: sub.landlord_id, status: 'stk_failed' })
        continue
      }

      results.push({ landlord_id: sub.landlord_id, status: 'stk_sent' })
    } catch (err) {
      console.error(`[Billing Cron] Error for landlord ${sub.landlord_id}:`, err)
      results.push({ landlord_id: sub.landlord_id, status: 'error' })
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}