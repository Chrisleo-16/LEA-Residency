import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/pushServer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PAYHERO_AUTH was never a real env var (only PAYHERO_USERNAME/PAYHERO_PASSWORD
// are set) — build the Basic auth header the same way app/api/billing/pay/route.ts does.
const getPayHeroAuth = () =>
  Buffer.from(`${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`).toString('base64')

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in3Days = new Date(now)
  in3Days.setDate(now.getDate() + 3)
  const in7Days = new Date(now)
  in7Days.setDate(now.getDate() + 7)

  // ── Reminders: 7 days and 3 days before renewal ──
  const { data: upcoming } = await supabase
    .from('landlord_subscriptions')
    .select('id, landlord_id, monthly_fee, current_period_end, tier')
    .eq('status', 'active')
    .gt('current_period_end', now.toISOString())
    .lte('current_period_end', in7Days.toISOString())

  for (const sub of upcoming || []) {
    const daysLeft = Math.ceil(
      (new Date(sub.current_period_end).getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24)
    )

    // Only send on exactly day 7 or day 3 — not every day in between
    if (daysLeft !== 7 && daysLeft !== 3) continue

    await sendPushToUser(
      sub.landlord_id,
      `Subscription renews in ${daysLeft} days`,
      `Your LEA ${sub.tier} plan (KES ${sub.monthly_fee.toLocaleString()}) renews in ${daysLeft} days. You will receive an M-Pesa prompt automatically.`,
      '/dashboard?tab=billing'
    )
  }

  // ── Bill subscriptions now due ──
  const { data: dueSubscriptions, error } = await supabase
    .from('landlord_subscriptions')
    .select('id, landlord_id, monthly_fee, status, tier')
    .lte('current_period_end', now.toISOString())
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
      results.push({ landlord_id: sub.landlord_id, status: 'no_phone' })
      continue
    }

    const billingPeriod = now.toISOString().slice(0, 7)
    const reference = `SUBFEE-${sub.landlord_id}-${billingPeriod}`

    // Avoid duplicate pending records
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

    await supabase.from('subscription_payments').insert({
      subscription_id: sub.id,
      landlord_id: sub.landlord_id,
      amount: sub.monthly_fee,
      status: 'pending',
      payment_type: 'monthly',
      billing_period: billingPeriod,
    })

    // Notify before STK push
    await sendPushToUser(
      sub.landlord_id,
      'Subscription renewal — M-Pesa prompt incoming',
      `Your LEA subscription (KES ${sub.monthly_fee.toLocaleString()}) is due. Check your phone for an M-Pesa STK push to renew.`,
      '/dashboard?tab=billing'
    )

    try {
      const stkResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${getPayHeroAuth()}`,
        },
        body: JSON.stringify({
          amount: sub.monthly_fee,
          phone_number: profile.phone_number,
          channel_id: process.env.PAYHERO_CHANNEL_ID,
          provider: 'm-pesa',
          external_reference: reference,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')}/api/mpesa/stkpush-callback`,
        }),
      })

      if (!stkResponse.ok) {
        await supabase
          .from('landlord_subscriptions')
          .update({ status: 'overdue' })
          .eq('id', sub.id)

        await sendPushToUser(
          sub.landlord_id,
          'Subscription payment failed',
          'We could not send the M-Pesa prompt. Please open LEA and tap Pay Now to renew your subscription.',
          '/dashboard?tab=billing'
        )

        results.push({ landlord_id: sub.landlord_id, status: 'stk_failed' })
        continue
      }

      results.push({ landlord_id: sub.landlord_id, status: 'stk_sent' })
    } catch (err) {
      console.error(`[Billing Cron] Error for landlord ${sub.landlord_id}:`, err)
      results.push({ landlord_id: sub.landlord_id, status: 'error' })
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  })
}