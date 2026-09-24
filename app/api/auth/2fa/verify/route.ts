import { NextRequest, NextResponse } from 'next/server'
import {
  resolveAuthUser,
  verifyOtpForUser,
  setTwoFaCookie,
  service,
  type OtpPurpose,
} from '@/lib/security/twoFa'

/**
 * POST /api/auth/2fa/verify
 * body: { purpose, code }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await resolveAuthUser(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const purpose = (body.purpose || 'login_2fa') as OtpPurpose
    const code = String(body.code || '').trim()

    if (!code || code.length < 4) {
      return NextResponse.json({ error: 'Enter the verification code' }, { status: 400 })
    }

    const result = await verifyOtpForUser({
      userId: user.id,
      code,
      purpose,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          attemptsRemaining: (result as any).attemptsRemaining,
        },
        { status: result.status }
      )
    }

    const sb = service()

    if (purpose === 'verify_phone' || purpose === 'enroll_2fa') {
      await sb
        .from('profiles')
        .update({
          phone_verified_at: new Date().toISOString(),
          ...(purpose === 'enroll_2fa' ? { two_factor_enabled: true } : {}),
          ...(result.phone ? { phone_number: result.phone } : {}),
        })
        .eq('id', user.id)
    }

    const res = NextResponse.json({
      success: true,
      purpose,
      twoFactorEnabled: purpose === 'enroll_2fa' ? true : undefined,
    })

    if (purpose === 'login_2fa' || purpose === 'enroll_2fa') {
      setTwoFaCookie(res, user.id)
    }

    return res
  } catch (err: any) {
    console.error('[2FA verify]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
