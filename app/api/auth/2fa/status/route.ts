import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthUser, service } from '@/lib/security/twoFa'

/** GET /api/auth/2fa/status — current 2FA + phone state */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await resolveAuthUser(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = service()
    const { data: profile } = await sb
      .from('profiles')
      .select('phone_number, two_factor_enabled, phone_verified_at')
      .eq('id', user.id)
      .maybeSingle()

    const phone = profile?.phone_number || ''
    const masked =
      phone.length > 4 ? `***${phone.slice(-4)}` : phone || null

    return NextResponse.json({
      success: true,
      twoFactorEnabled: !!profile?.two_factor_enabled,
      phoneVerified: !!profile?.phone_verified_at,
      phoneMasked: masked,
      hasPhone: !!phone,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
