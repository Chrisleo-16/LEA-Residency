import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Initiate PesaLink Bank Transfer via PayHero
 * POST /api/payments/pesalink
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      amount, 
      phone, 
      tenantId, 
      channelId,
      reference,
      bankAccount,
      bankCode
    } = body

    if (!amount || !channelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = Buffer.from(`${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`).toString('base64')
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`

    // PayHero PesaLink Initiation
    // Based on standard PayHero API for bank transfers
    const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: phone, // Source phone
        channel_id: channelId, // Landlord's PayHero Channel ID
        provider: 'bank',
        network_code: bankCode || 'pesalink',
        external_reference: reference,
        callback_url: callbackUrl,
        additional_data: {
          bank_account: bankAccount
        }
      }),
    })

    const data = await response.json()
    console.log('[PayHero PesaLink] Response:', data)

    if (!response.ok) {
      return NextResponse.json({ error: 'PesaLink initiation failed', details: data }, { status: response.status })
    }

    // Log pending payment in database
    await supabase.from('payments').insert({
      tenant_id: tenantId || user.id,
      amount: Number(amount),
      payment_method: 'bank',
      status: 'pending',
      notes: `PesaLink initiated - Ref: ${reference}`,
      logged_by: 'system',
      payment_month: new Date().toISOString().slice(0, 7) // Default to current month
    })

    return NextResponse.json({
      success: true,
      message: 'PesaLink transfer initiated',
      data
    })

  } catch (err: any) {
    console.error('[PayHero PesaLink] Error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
