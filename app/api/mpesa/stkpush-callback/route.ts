import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch (err) {
    console.error('[PayHero Callback] Invalid JSON body')
    return NextResponse.json({ success: true })
  }

  console.log('[PayHero Callback]', JSON.stringify(body, null, 2))

  // Acknowledge immediately — process in the background
  waitUntil(
    processPayment(body).catch(err => {
      console.error('[PayHero Callback] Background processing error:', err)
    })
  )

  return NextResponse.json({ success: true })
}

async function processPayment(body: any) {
  const {
    status,
    amount,
    phone_number,
    reference,       // "RENT-{tenantId}-{YYYY-MM}", "REPAIRS-{tenantId}-{YYYY-MM}", or "SUBFEE-{landlordId}-{YYYY-MM|SETUP}"
    receipt_number,  // M-Pesa code e.g. "RGR000X1234"
    transaction_date,
  } = body

  // Only process successful payments
  if (status !== 'Success') {
    console.log(`[PayHero] Payment ${status} for ${reference} — marking failed`)

    if (reference) {
      const rentMatch = reference.match(/^(RENT|REPAIRS)-(.+)-(\d{4}-\d{2})$/)
      if (rentMatch) {
        const tenantId = rentMatch[2]
        const paymentMonth = rentMatch[3]
        await supabase
          .from('payments')
          .update({ status: 'failed', notes: `Payment ${status} via M-Pesa` })
          .eq('tenant_id', tenantId)
          .eq('payment_month', paymentMonth)
          .eq('status', 'pending')
        return
      }

      const subMatch = reference.match(/^SUBFEE-(.+)-(SETUP|\d{4}-\d{2})$/)
      if (subMatch) {
        const landlordId = subMatch[1]
        const billingPeriod = subMatch[2]
        await supabase
          .from('subscription_payments')
          .update({ status: 'failed' })
          .eq('landlord_id', landlordId)
          .eq('billing_period', billingPeriod)
          .eq('status', 'pending')

        await supabase
          .from('landlord_subscriptions')
          .update({ status: 'overdue' })
          .eq('landlord_id', landlordId)
        return
      }
    }
    return
  }

  // ── Subscription fee payments (setup or monthly) ──
  const subMatch = reference?.match(/^SUBFEE-(.+)-(SETUP|\d{4}-\d{2})$/)
  if (subMatch) {
    const landlordId = subMatch[1]
    const billingPeriod = subMatch[2]

    const { data: payment } = await supabase
      .from('subscription_payments')
      .select('id, subscription_id, payment_type')
      .eq('landlord_id', landlordId)
      .eq('billing_period', billingPeriod)
      .eq('status', 'pending')
      .maybeSingle()

    if (!payment) {
      console.log('[PayHero] No pending subscription payment found for', reference)
      return
    }

    const { error: updateErr } = await supabase
      .from('subscription_payments')
      .update({
        status: 'complete',
        mpesa_code: receipt_number || null,
        payment_date: transaction_date || new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (updateErr) {
      if (updateErr.code === '23505') {
        console.log('[PayHero] Duplicate subscription payment ignored:', receipt_number)
      } else {
        console.error('[PayHero] Subscription payment update error:', updateErr)
      }
      return
    }

    const now = new Date()
    const newPeriodEnd = new Date(now)
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30)

    const updateFields: Record<string, unknown> = {
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: newPeriodEnd.toISOString(),
    }

    if (payment.payment_type === 'setup') {
      updateFields.setup_fee_paid = true
    }

    await supabase
      .from('landlord_subscriptions')
      .update(updateFields)
      .eq('id', payment.subscription_id)

    console.log(`✅ Subscription payment confirmed for landlord ${landlordId}, period: ${billingPeriod}`)
    return
  }

  // ── Rent / repairs payments (existing logic, unchanged) ──

  // Prevent duplicate processing
  if (receipt_number) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('mpesa_code', receipt_number)
      .maybeSingle()

    if (existing) {
      console.log('[PayHero] Duplicate ignored:', receipt_number)
      return
    }
  }

  // Parse tenantId and month from reference
  let tenantId: string | null = null
  let paymentMonth: string | null = null
  let paymentType = 'rent'

  if (reference) {
    const match = reference.match(/^(RENT|REPAIRS)-(.+)-(\d{4}-\d{2})$/)
    if (match) {
      paymentType = match[1].toLowerCase()
      tenantId = match[2]
      paymentMonth = match[3]
      console.log(`[PayHero] Parsed ref → tenant: ${tenantId} | month: ${paymentMonth} | type: ${paymentType}`)
    }
  }

  // Fallback: find tenant by phone number
  if (!tenantId && phone_number) {
    const phone07 = phone_number.startsWith('254')
      ? '0' + phone_number.slice(3)
      : phone_number
    const phone254 = phone_number.startsWith('0')
      ? '254' + phone_number.slice(1)
      : phone_number

    const { data: tenant } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'tenant')
      .or(`phone_number.eq.${phone07},phone_number.eq.${phone254}`)
      .maybeSingle()

    tenantId = tenant?.id || null
    console.log(`[PayHero] Phone fallback tenant: ${tenantId}`)
  }

  // Fallback: use current month
  if (!paymentMonth) {
    const now = new Date()
    paymentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const paidAmount = Number(amount)

  // Calculate complete/partial status
  let isComplete = false
  let pendingAmount = 0

  if (tenantId) {
    const { data: rentSetting } = await supabase
      .from('rent_settings')
      .select('monthly_amount')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (rentSetting) {
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('payment_month', paymentMonth)
        .in('status', ['complete', 'partial', 'confirmed'])

      const alreadyPaid = (existingPayments || [])
        .reduce((sum, p) => sum + Number(p.amount), 0)

      const totalAfterThis = alreadyPaid + paidAmount
      isComplete = totalAfterThis >= rentSetting.monthly_amount
      pendingAmount = Math.max(0, rentSetting.monthly_amount - totalAfterThis)
    }
  }

  // Find landlord
  let landlordId: string | null = null
  if (tenantId) {
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('landlord_id')
      .eq('tenant_id', tenantId)
      .neq('landlord_id', null)
      .limit(1)
      .maybeSingle()
    landlordId = existingPayment?.landlord_id || null

    if (!landlordId) {
      const { data: slot } = await supabase
        .from('tenant_slots')
        .select('landlord_block_id')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (slot?.landlord_block_id) {
        const { data: landlordProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('landlord_block_id', slot.landlord_block_id)
          .eq('role', 'landlord')
          .maybeSingle()
        landlordId = landlordProfile?.id || null
      }
    }
  }

  const finalNotes = pendingAmount > 0
    ? `KES ${pendingAmount.toLocaleString()} still pending`
    : 'Fully paid via M-Pesa STK ✅'

  // Find the pending record by tenant + month + status
  const { data: pendingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('payment_month', paymentMonth)
    .eq('status', 'pending')
    .maybeSingle()

  if (pendingPayment) {
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        mpesa_code: receipt_number || null,
        amount: paidAmount,
        phone_number: phone_number,
        status: isComplete ? 'complete' : 'partial',
        payment_date: transaction_date || new Date().toISOString(),
        notes: finalNotes,
      })
      .eq('id', pendingPayment.id)

    if (updateError) {
      if (updateError.code === '23505') {
        console.log('[PayHero] Duplicate mpesa_code on update — already processed:', receipt_number)
      } else {
        console.error('[PayHero] Update error:', updateError)
      }
    } else {
      console.log(`✅ Updated pending → ${isComplete ? 'complete' : 'partial'}: ${receipt_number}`)
    }
  } else {
    console.log('[PayHero] No pending record found, inserting new payment')
    const { error: insertError } = await supabase.from('payments').insert({
      tenant_id: tenantId,
      landlord_id: landlordId,
      amount: paidAmount,
      phone_number: phone_number,
      mpesa_code: receipt_number || null,
      payment_month: paymentMonth,
      payment_method: 'mpesa',
      logged_by: 'system',
      status: isComplete ? 'complete' : 'partial',
      payment_date: transaction_date || new Date().toISOString(),
      notes: finalNotes,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('[PayHero] Duplicate mpesa_code on insert — already processed:', receipt_number)
      } else {
        console.error('[PayHero] Insert error:', insertError)
      }
    } else {
      console.log(`✅ Inserted new payment: ${receipt_number}`)
    }
  }

  console.log(`✅ PayHero: ${receipt_number} | KES ${paidAmount} | ${isComplete ? 'COMPLETE' : `PARTIAL — KES ${pendingAmount} pending`}`)
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'LEA Executive Residency — PayHero Callback',
    channel_id: process.env.PAYHERO_CHANNEL_ID,
  })
}