import { NextRequest, NextResponse } from 'next/server'
import {
  resolveAuthUser,
  clearTwoFaCookie,
  service,
} from '@/lib/security/twoFa'

/**
 * POST /api/auth/2fa/disable
 * Requires verified enroll/login cookie OR recent profile ownership.
 * body: optional — disables two_factor_enabled after confirming session.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await resolveAuthUser(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = service()
    const { error: updErr } = await sb
      .from('profiles')
      .update({ two_factor_enabled: false })
      .eq('id', user.id)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    const res = NextResponse.json({ success: true, twoFactorEnabled: false })
    clearTwoFaCookie(res)
    return res
  } catch (err: any) {
    console.error('[2FA disable]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
