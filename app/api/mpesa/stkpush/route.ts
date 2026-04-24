import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── PayHero Basic Auth ────────────────────────────────
const getPayHeroAuth = () =>
  Buffer.from(
    `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`
  ).toString('base64')

const CHANNEL_ID = parseInt(process.env.PAYHERO_CHANNEL_ID || '6731')
const PAYHERO_API = 'https://backend.payhero.co.ke/api/v2'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      amount, 
      phone, 
      tenantId, 
      month, 
      paymentType = 'rent',
      rentAmount,
      waterBill,
      serviceId,
      serviceDescription,
      customAmount
    } = body

    if (!amount || !phone || !tenantId || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phone, tenantId, month' },
        { status: 400 }
      )
    }

    // ── Normalize phone to 07XXXXXXXXX ───────────────
    let formattedPhone = phone.toString().trim()
    formattedPhone = formattedPhone.replace(/^254/, '0').replace(/^\+254/, '0')
    if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/mpesa/callback`

    // ── PayHero STK Push ──────────────────────────────
    console.log(`[PayHero STK] Sending KES ${amount} to ${formattedPhone}`)

    const response = await fetch(`${PAYHERO_API}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${getPayHeroAuth()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: formattedPhone,
        channel_id: CHANNEL_ID,
        provider: 'm-pesa',
        network_code: '63902',  // Safaricom M-Pesa — do not change
        external_reference: `${paymentType.toUpperCase()}-${tenantId}-${month}`,
        callback_url: callbackUrl,
      }),
    })

    const data = await response.json()
    console.log('[PayHero STK] Response:', data)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'STK push failed', details: data },
        { status: response.status }
      )
    }

    // ── Save pending payment to track it ─────────────
    const { data: landlord } = await supabase
      .from('profiles').select('id').eq('role', 'landlord').limit(1).single()

    // Build payment notes with enhanced details
    let paymentNotes = `STK sent — ref: ${data.reference || data.id || 'pending'}`
    
    if (paymentType === 'rent') {
      paymentNotes += ` | Rent: KES ${rentAmount || 0}`
      if (waterBill && waterBill > 0) {
        paymentNotes += ` | Water: KES ${waterBill}`
      }
    } else if (paymentType === 'repairs') {
      paymentNotes += ` | Service: ${serviceId || 'unknown'}`
      if (serviceDescription) {
        paymentNotes += ` | ${serviceDescription}`
      }
      if (customAmount && customAmount > 0) {
        paymentNotes += ` | Custom: KES ${customAmount}`
      }
    }

    await supabase.from('payments').insert({
      tenant_id: tenantId,
      landlord_id: landlord?.id || null,
      amount: Number(amount),
      phone_number: formattedPhone,
      mpesa_code: null,               // filled in when callback arrives
      payment_month: month,
      payment_method: 'mpesa',
      logged_by: 'system',
      status: 'pending',              // updated to complete/partial on callback
      notes: paymentNotes,
      // Add metadata for enhanced payments
      ...(paymentType === 'rent' && {
        payment_category: 'rent',
        rent_amount: rentAmount || 0,
        water_bill: waterBill || 0,
      }),
      ...(paymentType === 'repairs' && {
        payment_category: 'repairs',
        service_id: serviceId || null,
        service_description: serviceDescription || null,
        custom_amount: customAmount || 0,
      }),
    })

    return NextResponse.json({
      success: true,
      message: 'STK push sent — check your phone',
      reference: data.reference || data.id,
    })

  } catch (err: any) {
    console.error('[PayHero STK] Error:', err.message)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}