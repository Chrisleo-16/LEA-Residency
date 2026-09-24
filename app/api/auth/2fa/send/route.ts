import { NextRequest, NextResponse } from 'next/server'
import {
  resolveAuthUser,
  sendOtpForUser,
  service,
  type OtpPurpose,
} from '@/lib/security/twoFa'
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/sms'

/**
 * POST /api/auth/2fa/send
 * body: { purpose: 'login_2fa' | 'enroll_2fa' | 'verify_phone', phone?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await resolveAuthUser(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const purpose = (body.purpose || 'login_2fa') as OtpPurpose
    if (!['login_2fa', 'enroll_2fa', 'verify_phone'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
    }

    const sb = service()
    const { data: profile } = await sb
      .from('profiles')
      .select('phone_number, two_factor_enabled')
      .eq('id', user.id)
      .maybeSingle()

    let phone = body.phone ? String(body.phone) : profile?.phone_number || ''

    if (purpose === 'login_2fa') {
      if (!profile?.two_factor_enabled) {
        return NextResponse.json(
          { error: 'Two-factor authentication is not enabled' },
          { status: 400 }
        )
      }
      if (!phone) {
        return NextResponse.json(
          { error: 'No phone on file. Add a phone in Settings first.' },
          { status: 400 }
        )
      }
    }

    if (purpose === 'enroll_2fa' || purpose === 'verify_phone') {
      if (!phone) {
        return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
      }
      if (!validatePhoneNumber(phone)) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }
      phone = formatPhoneNumber(phone)
      await sb
        .from('profiles')
        .update({ phone_number: phone })
        .eq('id', user.id)
    }

    const result = await sendOtpForUser({
      userId: user.id,
      phone,
      purpose,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const masked =
      result.phone.length > 4
        ? `***${result.phone.slice(-4)}`
        : result.phone

    return NextResponse.json({
      success: true,
      expiresInMinutes: result.expiresInMinutes,
      phoneMasked: masked,
    })
  } catch (err: any) {
    console.error('[2FA send]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
