import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createHash, randomInt } from 'crypto'
import { sendSMS, validatePhoneNumber, formatPhoneNumber } from '@/lib/sms'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { TWO_FA_COOKIE } from '@/lib/security/constants'

export { TWO_FA_COOKIE }
export const CODE_LENGTH = 6
export const CODE_TTL_MINUTES = 10
export const MAX_CODES_PER_HOUR = 3
export const MAX_ATTEMPTS = 5

export type OtpPurpose = 'login_2fa' | 'enroll_2fa' | 'verify_phone'

export function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, '0')
}

export function hashCode(code: string): string {
  return createHash('sha256').update(String(code).trim()).digest('hex')
}

export async function resolveAuthUser(request: NextRequest) {
  const auth = await createClient()
  const header = request.headers.get('authorization')
  const bearer =
    header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null
  const { data, error } = bearer
    ? await auth.auth.getUser(bearer)
    : await auth.auth.getUser()
  return { user: data.user, error }
}

export function setTwoFaCookie(res: NextResponse, userId: string) {
  res.cookies.set(TWO_FA_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
}

export function clearTwoFaCookie(res: NextResponse) {
  res.cookies.set(TWO_FA_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function sendOtpForUser(opts: {
  userId: string
  phone: string
  purpose: OtpPurpose
}) {
  if (!validatePhoneNumber(opts.phone)) {
    return { ok: false as const, error: 'Invalid phone number', status: 400 }
  }
  const phone = formatPhoneNumber(opts.phone)
  const sb = service()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await sb
    .from('auth_otp_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', opts.userId)
    .eq('purpose', opts.purpose)
    .gte('created_at', oneHourAgo)

  if ((count || 0) >= MAX_CODES_PER_HOUR) {
    return {
      ok: false as const,
      error: 'Too many code requests. Try again later.',
      status: 429,
    }
  }

  const code = generateCode()
  const expiresAt = new Date(
    Date.now() + CODE_TTL_MINUTES * 60 * 1000
  ).toISOString()

  const { error: insertError } = await sb.from('auth_otp_codes').insert({
    user_id: opts.userId,
    phone,
    code: hashCode(code),
    purpose: opts.purpose,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[2FA] store OTP:', insertError)
    return { ok: false as const, error: 'Failed to generate code', status: 500 }
  }

  const sms = await sendSMS({
    to: phone,
    message: `Your LEA security code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. Do not share it.`,
  })

  if (!sms.success) {
    return {
      ok: false as const,
      error: 'Failed to send SMS — check your phone number and try again',
      status: 502,
    }
  }

  return {
    ok: true as const,
    phone,
    expiresInMinutes: CODE_TTL_MINUTES,
  }
}

export async function verifyOtpForUser(opts: {
  userId: string
  code: string
  purpose: OtpPurpose
}) {
  const sb = service()
  const { data: pending } = await sb
    .from('auth_otp_codes')
    .select('id, code, expires_at, attempts, consumed_at, phone')
    .eq('user_id', opts.userId)
    .eq('purpose', opts.purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pending) {
    return { ok: false as const, error: 'No code found — request a new one', status: 404 }
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { ok: false as const, error: 'Code expired — request a new one', status: 400 }
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, error: 'Too many attempts — request a new code', status: 429 }
  }

  if (pending.code !== hashCode(opts.code)) {
    await sb
      .from('auth_otp_codes')
      .update({ attempts: pending.attempts + 1 })
      .eq('id', pending.id)
    return {
      ok: false as const,
      error: 'Incorrect code',
      status: 400,
      attemptsRemaining: MAX_ATTEMPTS - pending.attempts - 1,
    }
  }

  await sb
    .from('auth_otp_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', pending.id)

  return { ok: true as const, phone: pending.phone as string }
}
