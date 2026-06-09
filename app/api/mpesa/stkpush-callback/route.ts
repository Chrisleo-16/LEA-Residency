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

    const {
      status,
      amount,
      phone_number,
      reference,       // our external_reference: "RENT-{tenantId}-{YYYY-MM}"
      receipt_number,  // M-Pesa code e.g. "RGR000X1234"
      transaction_date,
    } = body

    // Only process successful payments
    if (status !== 'Success') {
      console.log(`[PayHero] Payment ${status} for ${reference} — marking failed`)

      if (reference) {
        // Parse tenantId + month from reference to find the right pending record
        const match = reference.match(/^(RENT|REPAIRS)-(.+)-(\d{4}-\d{2})$/)
        if (match) {
          const tenantId = match[2]
          const paymentMonth = match[3]
          await supabase
            .from('payments')
            .update({ status: 'failed', notes: `Payment ${status} via M-Pesa` })
            .eq('tenant_id', tenantId)
            .eq('payment_month', paymentMonth)
            .eq('status', 'pending')
        }
      }
      return NextResponse.json({ success: true })
    }

    // Prevent duplicate processing
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

    // Parse tenantId and month from reference
    // Format: "RENT-{uuid}-{YYYY-MM}" or "REPAIRS-{uuid}-{YYYY-MM}"
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

      // Fallback via tenant_slots
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
    // This is reliable because stkpush.ts always creates it with these values
    const { data: pendingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('payment_month', paymentMonth)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingPayment) {
      // Update the pending record to complete
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
        console.error('[PayHero] Update error:', updateError)
      } else {
        console.log(`✅ Updated pending → ${isComplete ? 'complete' : 'partial'}: ${receipt_number}`)
      }
    } else {
      // No pending record found — insert fresh
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
        console.error('[PayHero] Insert error:', insertError)
      } else {
        console.log(`✅ Inserted new payment: ${receipt_number}`)
      }
    }

    console.log(`✅ PayHero: ${receipt_number} | KES ${paidAmount} | ${isComplete ? 'COMPLETE' : `PARTIAL — KES ${pendingAmount} pending`}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[PayHero Callback] Error:', err.message)
    // Always return 200 so PayHero doesn't retry endlessly
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