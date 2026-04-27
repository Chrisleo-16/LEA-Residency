import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[PayHero Callback]', JSON.stringify(body, null, 2))

    // ── PayHero webhook payload structure ─────────────
    const {
      status,           // "Success" | "Failed" | "Cancelled"
      amount,           // e.g. 18000
      phone_number,     // e.g. "0712345678"
      reference,        // our external_reference e.g. "RENT-uuid-2024-03"
      receipt_number,   // M-Pesa receipt code e.g. "RGR000X1234"
      transaction_date, // ISO date string
    } = body

    // ── Only process successful payments ─────────────
    if (status !== 'Success') {
      console.log(`[PayHero] Payment ${status} for ${reference} — ignored`)

      // Update pending payment to failed
      if (reference) {
        await supabase
          .from('payments')
          .update({ status: 'failed', notes: `Payment ${status}` })
          .eq('status', 'pending')
          .ilike('notes', `%STK sent — ref: ${reference}%`)
      }
      return NextResponse.json({ success: true })
    }

    // ── Prevent duplicates ────────────────────────────
    if (receipt_number) {
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('mpesa_code', receipt_number)
        .maybeSingle()

      if (existing) {
        console.log('[PayHero] Duplicate ignored:', receipt_number)
        return NextResponse.json({ success: true })
      }
    }

    // ── Parse tenantId and month from reference ───────
    // Format: "TYPE-{tenantId}-{month}" e.g. "RENT-uuid-2024-03" or "REPAIRS-uuid-2024-03"
    let tenantId: string | null = null
    let paymentMonth: string | null = null
    let paymentType: string = 'rent'

    if (reference) {
      // TYPE-{uuid}-{YYYY-MM}
      const match = reference.match(/^(RENT|REPAIRS)-(.+)-(\d{4}-\d{2})$/)
      if (match) {
        paymentType = match[1].toLowerCase()
        tenantId = match[2]
        paymentMonth = match[3]
      }
    }

    // ── Fallback: find tenant by phone ────────────────
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
    }

    // ── Fallback: use current month ───────────────────
    if (!paymentMonth) {
      const now = new Date()
      paymentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    // ── Calculate complete/partial status ─────────────
    let isComplete = false
    let pendingAmount = 0
    const paidAmount = Number(amount)

    if (tenantId) {
      const { data: rentSetting } = await supabase
        .from('rent_settings')
        .select('monthly_amount')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (rentSetting) {
        // Sum ALL confirmed payments this month (excluding pending)
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

    // ── Get landlord ──────────────────────────────────
    const { data: landlord } = await supabase
      .from('profiles').select('id').eq('role', 'landlord').limit(1).single()

    // ── Check if pending payment exists to update ─────
    const { data: pendingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('status', 'pending')
      .ilike('notes', `%STK sent — ref: ${reference}%`)
      .maybeSingle()

    if (pendingPayment) {
      // ── Update existing pending record ────────────
      await supabase
        .from('payments')
        .update({
          mpesa_code: receipt_number || null,
          amount: paidAmount,
          phone_number: phone_number,
          status: isComplete ? 'complete' : 'partial',
          payment_date: transaction_date || new Date().toISOString(),
          notes: pendingAmount > 0
            ? `KES ${pendingAmount.toLocaleString()} still pending`
            : 'Fully paid via M-Pesa STK ✅',
        })
        .eq('id', pendingPayment.id)
    } else {
      // ── Insert new payment record ─────────────────
      await supabase.from('payments').insert({
        tenant_id: tenantId,
        landlord_id: landlord?.id || null,
        amount: paidAmount,
        phone_number: phone_number,
        mpesa_code: receipt_number || null,
        payment_month: paymentMonth,
        payment_method: 'mpesa',
        logged_by: 'system',
        status: isComplete ? 'complete' : 'partial',
        payment_date: transaction_date || new Date().toISOString(),
        notes: pendingAmount > 0
          ? `KES ${pendingAmount.toLocaleString()} still pending`
          : 'Auto-logged via PayHero ✅',
      })
    }

    console.log(`✅ PayHero: ${receipt_number} | KES ${paidAmount} | ${isComplete ? 'COMPLETE' : `PARTIAL — KES ${pendingAmount} pending`}`)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[PayHero Callback] Error:', err.message)
    // Always return 200 so PayHero doesn't retry
    return NextResponse.json({ success: true })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'LEA Executive Residency — PayHero Callback',
    channel_id: process.env.PAYHERO_CHANNEL_ID,
  })
}