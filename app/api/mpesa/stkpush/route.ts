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

const DEFAULT_RENT_CHANNEL_ID = parseInt(process.env.PAYHERO_CHANNEL_ID || '6731')
const PAYHERO_API = 'https://backend.payhero.co.ke/api/v2'

async function resolveLandlordId(tenantId: string): Promise<string | null> {
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('landlord_id')
    .eq('tenant_id', tenantId)
    .neq('landlord_id', null)
    .limit(1)
    .maybeSingle()
  if (existingPayment?.landlord_id) return existingPayment.landlord_id

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
    return landlordProfile?.id || null
  }
  return null
}

async function resolveWifiChannelId(landlordId: string): Promise<number | null> {
  const { data } = await supabase
    .from('landlord_payment_settings')
    .select('payhero_channel_id')
    .eq('landlord_id', landlordId)
    .eq('is_wifi', true)
    .maybeSingle()
  return data?.payhero_channel_id ? Number(data.payhero_channel_id) : null
}

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
      variableAmounts: bodyVars,
      advanceMonths: bodyAdvance,
      serviceId,
      serviceDescription,
      customAmount,
    } = body

    const variableAmounts: Record<string, number> = { ...(bodyVars || {}) }
    const water = Math.max(0, Number(waterBill) || 0)
    if (water > 0 && !variableAmounts.water) variableAmounts.water = water
    const advanceMonths = Math.min(3, Math.max(0, Number(bodyAdvance) || 0))
    const onlyChargeTypes: string[] = Array.isArray(body.onlyChargeTypes)
      ? body.onlyChargeTypes.map((t: string) => String(t).toLowerCase())
      : []

    if (!amount || !phone || !tenantId || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phone, tenantId, month' },
        { status: 400 }
      )
    }

    if (Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (waterBill != null && Number(waterBill) < 0) {
      return NextResponse.json(
        { error: 'Water bill cannot be negative' },
        { status: 400 }
      )
    }

    let formattedPhone = phone.toString().trim()
    formattedPhone = formattedPhone.replace(/^254/, '0').replace(/^\+254/, '0')
    if (!formattedPhone.startsWith('0')) formattedPhone = '0' + formattedPhone

    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/mpesa/callback`

    // Resolve landlord first — needed to pick the right channel for wifi
    const landlordId = await resolveLandlordId(tenantId)

    let targetChannelId = body.channelId ? Number(body.channelId) : null

    if (paymentType === 'wifi') {
      if (!targetChannelId && landlordId) {
        targetChannelId = await resolveWifiChannelId(landlordId)
      }
      if (!targetChannelId) {
        return NextResponse.json(
          { error: 'No Wi-Fi payment channel configured for this landlord yet.' },
          { status: 400 }
        )
      }
    } else {
      // Rent / repairs: never fall back to the platform default channel when the
      // landlord has no PayHero channel (e.g. Pochi la Biashara — manual only).
      if (!targetChannelId && landlordId) {
        const { data: rentChannel } = await supabase
          .from('landlord_payment_settings')
          .select('payhero_channel_id, payment_type, paybill_number, account_name')
          .eq('landlord_id', landlordId)
          .eq('verified', true)
          .eq('is_wifi', false)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (rentChannel?.payhero_channel_id) {
          targetChannelId = Number(rentChannel.payhero_channel_id)
        } else if (rentChannel) {
          return NextResponse.json(
            {
              error:
                `This landlord uses ${rentChannel.account_name || 'Pochi la Biashara'} (${rentChannel.paybill_number}). STK push is not available — pay manually and share your M-Pesa code with your landlord.`,
            },
            { status: 400 }
          )
        }
      }
      targetChannelId = targetChannelId || DEFAULT_RENT_CHANNEL_ID
    }

    const externalReference = `${paymentType.toUpperCase()}-${tenantId}-${month}`

    console.log(`[PayHero STK] Sending KES ${amount} to ${formattedPhone} | Ref: ${externalReference} | Channel: ${targetChannelId}`)

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

    let notes = `STK sent | ref:${externalReference}`
    if (paymentType === 'rent') {
      notes += ` | rent:${rentAmount || amount}`
      if (Object.keys(variableAmounts).length) {
        notes += ` | vars:${JSON.stringify(variableAmounts)}`
      }
      if (advanceMonths > 0) notes += ` | advance:${advanceMonths}`
      if (onlyChargeTypes.length) notes += ` | only:${onlyChargeTypes.join(',')}`
    } else if (paymentType === 'repairs') {
      notes += ` | service:${serviceId || 'general'}`
      if (serviceDescription) notes += ` | ${serviceDescription}`
      if (customAmount && Number(customAmount) > 0) notes += ` | custom:${customAmount}`
    } else if (paymentType === 'wifi') {
      notes += ` | WIFI | wifi:${amount}`
    }

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
    }

    // Seed / update tenancy bill so My Bills reflects rent (+ variables / advance)
    if (paymentType === 'rent' && landlordId) {
      try {
        const {
          ensureTenancyAccount,
          generateBillForPeriod,
          addBillingMonths,
        } = await import('@/lib/tenancy/ledger')
        const { data: slot } = await supabase
          .from('tenant_slots')
          .select('landlord_block_id')
          .eq('tenant_id', tenantId)
          .maybeSingle()
        const account = await ensureTenancyAccount(supabase, {
          tenantId,
          landlordId,
          landlordBlockId: slot?.landlord_block_id || null,
        })
        for (let i = 0; i <= advanceMonths; i++) {
          const period = addBillingMonths(month, i)
          await generateBillForPeriod(supabase, account.id, period, {
            variableAmounts:
              i === 0 && Object.keys(variableAmounts).length
                ? variableAmounts
                : undefined,
            createdBy: tenantId,
          })
        }
      } catch (ledgerErr: any) {
        console.warn('[PayHero STK] bill seed skip:', ledgerErr?.message)
      }
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