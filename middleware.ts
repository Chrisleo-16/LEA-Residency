import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { TWO_FA_COOKIE } from '@/lib/security/constants'

type ProfileGate = {
  role?: string | null
  landlord_code?: string | null
  landlord_block_id?: string | null
  property_setup_complete?: boolean | null
  two_factor_enabled?: boolean | null
}

function needsLandlordSetup(profile: ProfileGate | null | undefined) {
  return (
    profile?.role === 'landlord' &&
    (!profile.landlord_code ||
      !profile.landlord_block_id ||
      !profile.property_setup_complete)
  )
}

function needsRoleSelection(profile: ProfileGate | null | undefined) {
  return !profile?.role
}

function needs2fa(
  profile: ProfileGate | null | undefined,
  request: NextRequest,
  userId: string
) {
  if (!profile?.two_factor_enabled) return false
  const cookie = request.cookies.get(TWO_FA_COOKIE)?.value
  return cookie !== userId
}

function createSupabase(request: NextRequest) {
  let response = NextResponse.next({ request })

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return {
    client,
    getResponse: () => response,
  }
}

async function loadProfile(
  client: ReturnType<typeof createServerClient>,
  userId: string
): Promise<ProfileGate | null> {
  // Prefer full select; if migration not applied yet, fall back without 2FA columns.
  const full = await client
    .from('profiles')
    .select(
      'role, landlord_code, landlord_block_id, property_setup_complete, two_factor_enabled'
    )
    .eq('id', userId)
    .maybeSingle()

  if (!full.error) return full.data as ProfileGate | null

  const fallback = await client
    .from('profiles')
    .select('role, landlord_code, landlord_block_id, property_setup_complete')
    .eq('id', userId)
    .maybeSingle()

  if (fallback.data) {
    return { ...(fallback.data as ProfileGate), two_factor_enabled: false }
  }
  return null
}

export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname

    const isProtectedRoute =
      path.startsWith('/dashboard') ||
      path.startsWith('/developer-dashboard') ||
      path.startsWith('/landlord')

    const isAuthPage = path === '/login'
    const isSetupPage = path === '/complete-setup' || path === '/select-role'
    const isVerify2fa = path === '/verify-2fa'

    const { client: supabase, getResponse } = createSupabase(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const copyCookies = (redirectRes: NextResponse) => {
      getResponse()
        .cookies.getAll()
        .forEach(({ name, value, ...options }) => {
          redirectRes.cookies.set(name, value, options)
        })
      return redirectRes
    }

    if ((isProtectedRoute || isVerify2fa) && !user) {
      return copyCookies(NextResponse.redirect(new URL('/login', request.url)))
    }

    // Logged-out users must always reach /login (do not block on profile errors)
    if (isAuthPage && !user) {
      return getResponse()
    }

    if ((isProtectedRoute || isSetupPage || isAuthPage || isVerify2fa) && user) {
      const profile = await loadProfile(supabase, user.id)

      const resolvePostAuthTarget = () => {
        if (needs2fa(profile, request, user.id)) return '/verify-2fa'
        if (profile?.role === 'developer') return '/developer-dashboard'
        if (needsRoleSelection(profile)) return '/select-role'
        if (needsLandlordSetup(profile)) return '/complete-setup'
        return '/dashboard'
      }

      if (isVerify2fa) {
        if (!profile?.two_factor_enabled) {
          return copyCookies(
            NextResponse.redirect(new URL(resolvePostAuthTarget(), request.url))
          )
        }
        if (!needs2fa(profile, request, user.id)) {
          const target =
            profile?.role === 'developer'
              ? '/developer-dashboard'
              : needsLandlordSetup(profile)
                ? '/complete-setup'
                : needsRoleSelection(profile)
                  ? '/select-role'
                  : '/dashboard'
          return copyCookies(NextResponse.redirect(new URL(target, request.url)))
        }
        return getResponse()
      }

      if (isAuthPage) {
        return copyCookies(
          NextResponse.redirect(new URL(resolvePostAuthTarget(), request.url))
        )
      }

      if (isProtectedRoute) {
        if (needs2fa(profile, request, user.id)) {
          return copyCookies(
            NextResponse.redirect(new URL('/verify-2fa', request.url))
          )
        }
        if (needsRoleSelection(profile)) {
          return copyCookies(
            NextResponse.redirect(new URL('/select-role', request.url))
          )
        }
        if (needsLandlordSetup(profile)) {
          return copyCookies(
            NextResponse.redirect(new URL('/complete-setup', request.url))
          )
        }
      }

      if (isSetupPage) {
        if (needs2fa(profile, request, user.id)) {
          return copyCookies(
            NextResponse.redirect(new URL('/verify-2fa', request.url))
          )
        }
        if (
          path === '/select-role' &&
          profile?.role === 'tenant' &&
          profile.landlord_block_id
        ) {
          return copyCookies(
            NextResponse.redirect(new URL('/dashboard', request.url))
          )
        }
        if (
          path === '/complete-setup' &&
          profile?.role === 'landlord' &&
          !needsLandlordSetup(profile)
        ) {
          return copyCookies(
            NextResponse.redirect(new URL('/dashboard', request.url))
          )
        }
        if (
          path === '/select-role' &&
          profile?.role === 'landlord' &&
          needsLandlordSetup(profile)
        ) {
          return copyCookies(
            NextResponse.redirect(new URL('/complete-setup', request.url))
          )
        }
        if (
          path === '/select-role' &&
          profile?.role === 'landlord' &&
          !needsLandlordSetup(profile)
        ) {
          return copyCookies(
            NextResponse.redirect(new URL('/dashboard', request.url))
          )
        }
      }
    }

    return getResponse()
  } catch (err) {
    // Never blank /login (or anything) with a hard failure from auth gating
    console.error('[middleware] unexpected error — passing through:', err)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/developer-dashboard/:path*',
    '/landlord/:path*',
    '/login',
    '/complete-setup',
    '/select-role',
    '/verify-2fa',
  ],
}
