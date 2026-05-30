import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Live verification of Paybill/Till/Bank via PayHero
 * POST /api/payments/verify-channel
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { paymentType, shortCode, accountName, accountNumber, bankName } = body

    if (!paymentType || !shortCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Prepare PayHero payload
    // PayHero API expectations derived from research:
    // channel_type: "paybill" | "till" | "bank"
    // account_id: From ENV
    // short_code: The number being verified
    // account_number: For bank accounts
    // description: Beneficiary/Account name
    
    const accountId = parseInt(process.env.PAYHERO_ACCOUNT_ID || '5000')
    const auth = Buffer.from(`${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`).toString('base64')

    const payheroPayload = {
      channel_type: paymentType, // 'paybill', 'till', or 'bank'
      account_id: accountId,
      short_code: shortCode,
      account_number: paymentType === 'bank' ? accountNumber : shortCode,
      description: paymentType === 'bank' ? bankName : accountName
    }

    console.log('[PayHero Verify] Sending registration request:', payheroPayload)

    const response = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payheroPayload),
    })

    const data = await response.json()
    console.log('[PayHero Verify] Response:', data)

    if (!response.ok) {
      // Handle failure cases as requested by user
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          code: 'PAYHERO_UNLINKED',
          message: 'Verification failed because your PayHero account is not yet linked to LEA.',
          explanation: 'Your PayHero account itself is not yet set up or the API credentials in LEA are missing.',
          resolution: [
            'Visit app.payhero.co.ke and log in to your dashboard.',
            'Ensure you have created a Payment Channel for this number under your PayHero dashboard.',
            'Once the channel exists on PayHero, return here to verify — our system will confirm it instantly.'
          ],
          action: { label: 'Go to PayHero', url: 'https://app.payhero.co.ke' }
        }, { status: 401 })
      }

      if (response.status === 400) {
        const typeLabel = paymentType === 'paybill' ? 'Paybill' : paymentType === 'till' ? 'Till Number' : 'Bank Account'
        return NextResponse.json({
          status: 'error',
          code: 'CHANNEL_NOT_FOUND',
          message: `We could not verify ${typeLabel} ${shortCode}.`,
          explanation: `This number was not found on the ${paymentType === 'bank' ? 'PesaLink' : 'M-Pesa'} payment network.`,
          resolution: [
            `Double-check the number with your ${paymentType === 'bank' ? 'Bank Statement' : 'Safaricom Business account'}.`,
            paymentType === 'paybill' ? 'Ensure you are entering the Paybill and not a Till Number.' : 'Ensure the number is active and ready for payments.',
            paymentType === 'bank' ? 'Contact your bank to confirm your account is enabled for PesaLink.' : 'Contact Safaricom Business on 0722 002 100 to confirm your Paybill is active.'
          ]
        }, { status: 400 })
      }

      // Default network/server error
      return NextResponse.json({
        status: 'error',
        code: 'NETWORK_ERROR',
        message: 'Verification could not be completed due to a temporary connection issue.',
        explanation: 'There was a temporary connection issue with our payment provider (PayHero).',
        resolution: [
          'Please tap "Verify" again in a few seconds.',
          'If the problem persists, you can skip this step and complete verification later from Settings under Payment Setup.'
        ]
      }, { status: 503 })
    }

    // Success - Save to Supabase
    const { error: dbError } = await supabase
      .from('landlord_payment_settings')
      .upsert({
        landlord_id: user.id,
        payment_type: paymentType,
        paybill_number: shortCode,
        account_name: accountName || bankName,
        bank_account_number: paymentType === 'bank' ? accountNumber : null,
        paybill_account_number: paymentType === 'paybill' ? accountNumber : null,
        bank_name: bankName || null,
        payhero_channel_id: data.id,
        verified: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'landlord_id, payment_type, paybill_number' })

    if (dbError) {
      console.error('[DB Error] Failed to save verified channel:', dbError)
      return NextResponse.json({ error: 'Verified but failed to save to database' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment details verified successfully!',
      channel: data
    })

  } catch (err: any) {
    console.error('[PayHero Verify] Internal Error:', err)
    return NextResponse.json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during verification.',
      explanation: err.message
    }, { status: 500 })
  }
}
