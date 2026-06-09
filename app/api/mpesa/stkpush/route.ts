import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
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
      customAmount,
    } = body

    if (!amount || !phone || !tenantId || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phone, tenantId, month' },
        { status: 400 }
      )
    }

    // Normalize phone to 07XXXXXXXXX
    let formattedPhone = phone.toString().trim()
    formattedPhone = formattedPhone.replace(/^254/, '0').replace(/^\+254/, '0')
    if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/mpesa/callback`
    const targetChannelId = body.channelId || CHANNEL_ID

    // Build a stable external reference for matching later
    const externalReference = `${paymentType.toUpperCase()}-${tenantId}-${month}`

    console.log(`[PayHero STK] Sending KES ${amount} to ${formattedPhone} | Ref: ${externalReference}`)

    const response = await fetch(`${PAYHERO_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${getPayHeroAuth()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: formattedPhone,
        channel_id: targetChannelId,
        provider: 'm-pesa',
        network_code: '63902',
        external_reference: externalReference,
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

    // Find landlord for this tenant
    let landlordId: string | null = null
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('landlord_id')
      .eq('tenant_id', tenantId)
      .neq('landlord_id', null)
      .limit(1)
      .maybeSingle()
    landlordId = existingPayment?.landlord_id || null

    // If still no landlord, look it up via tenant_slots
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

    // Build notes - only use valid columns, encode payment details in notes
    let notes = `STK sent | ref:${externalReference}`
    if (paymentType === 'rent') {
      notes += ` | rent:${rentAmount || amount}`
      if (waterBill && Number(waterBill) > 0) {
        notes += ` | water:${waterBill}`
      }
    } else if (paymentType === 'repairs') {
      notes += ` | service:${serviceId || 'general'}`
      if (serviceDescription) notes += ` | ${serviceDescription}`
      if (customAmount && Number(customAmount) > 0) notes += ` | custom:${customAmount}`
    }

    // Insert pending record using ONLY columns that exist in your schema
    const { error: insertError } = await supabase.from('payments').insert({
      tenant_id: tenantId,
      landlord_id: landlordId,
      amount: Number(amount),
      phone_number: formattedPhone,
      mpesa_code: null,
      payment_month: month,
      payment_method: 'mpesa',
      logged_by: 'system',
      status: 'pending',
      notes,
    })

    if (insertError) {
      console.error('[PayHero STK] Failed to insert pending record:', insertError)
      // Don't block the response — STK was already sent
    }

    return NextResponse.json({
      success: true,
      message: 'STK push sent — check your phone',
      reference: externalReference,
    })
  } catch (err: any) {
    console.error('[PayHero STK] Error:', err.message)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}