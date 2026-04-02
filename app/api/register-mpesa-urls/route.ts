import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const consumerKey    = process.env.MPESA_CONSUMER_KEY!
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET!
    const shortcode      = process.env.MPESA_SHORTCODE || '400200'
    const appUrl         = process.env.NEXT_PUBLIC_SITE_URL!
    const isProd         = process.env.MPESA_ENVIRONMENT === 'production'

    const baseUrl = isProd
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    // ── Get access token ──────────────────────────────
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const tokenRes = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return NextResponse.json({
        error: 'Failed to get access token',
        detail: tokenData,
      }, { status: 401 })
    }

    // ── Register callback URLs ────────────────────────
    const callbackUrl = `${appUrl}/api/mpesa-callback`

    const regRes = await fetch(`${baseUrl}/mpesa/c2b/v1/registerurl`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ShortCode:        shortcode,
        ResponseType:     'Completed',
        ConfirmationURL:  callbackUrl,
        ValidationURL:    callbackUrl,
      }),
    })

    const regData = await regRes.json()
    console.log('Safaricom registration response:', regData)

    return NextResponse.json({
      success: regData.ResponseCode === '0',
      environment: isProd ? 'production' : 'sandbox',
      callbackUrl,
      shortcode,
      safaricomResponse: regData,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}