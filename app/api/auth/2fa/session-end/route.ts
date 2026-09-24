import { NextRequest, NextResponse } from 'next/server'
import { clearTwoFaCookie, resolveAuthUser } from '@/lib/security/twoFa'

/** Clears the 2FA session cookie (call on sign-out). Does not disable 2FA. */
export async function POST(request: NextRequest) {
  await resolveAuthUser(request).catch(() => null)
  const res = NextResponse.json({ success: true })
  clearTwoFaCookie(res)
  return res
}
