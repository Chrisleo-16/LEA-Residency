import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getFriendlyAuthError } from '@/lib/auth-errors'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const ref = searchParams.get('ref') ?? searchParams.get('state')
  const intendedRoleParam = searchParams.get('intended_role')
  const intendedRoleCookie = request.cookies.get('pending_oauth_role')?.value
  const intendedRole =
    intendedRoleParam === 'landlord' || intendedRoleCookie === 'landlord'
      ? 'landlord'
      : null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed&message=no_authorization_code`)
  }

  try {
    // Need a mutable response to set cookies
    const cookieResponse = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[OAuth Callback] ref:', ref, '| intendedRole:', intendedRole, '| user:', data.session?.user?.id)

    if (error || !data.session?.user) {
      console.error('[OAuth Callback] Error:', error?.message)
      const friendlyError = getFriendlyAuthError(error?.message || 'Session exchange failed')
      const msg = encodeURIComponent(`${friendlyError.title}\n\n${friendlyError.description}`)
      return NextResponse.redirect(`${origin}/login?error=auth_failed&message=${msg}`)
    }

    const userId = data.session.user.id
    const userEmail = data.session.user.email
    const userName =
      data.session.user.user_metadata?.full_name ||
      data.session.user.user_metadata?.name ||
      userEmail

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, landlord_block_id, property_setup_complete, landlord_code')
      .eq('id', userId)
      .maybeSingle()

    console.log('[OAuth Callback] profile:', profile)

    // Clear signup intent cookie after we read it
    cookieResponse.cookies.set('pending_oauth_role', '', { path: '/', maxAge: 0 })

    // Handle tenant joining via referral link (takes priority over signup landlord intent)
    if (ref) {
      console.log('[OAuth Callback] ref present, checking block...')
      const { data: block } = await supabaseAdmin
        .from('landlord_blocks')
        .select('id')
        .eq('id', ref)
        .eq('is_active', true)
        .maybeSingle()

      if (block) {
        await supabaseAdmin
          .from('profiles')
          .update({
            landlord_block_id: ref,
            role: 'tenant',
            property_setup_complete: true,
            onboarding_completed: true,
          })
          .eq('id', userId)

        return redirect(origin, '/dashboard', request, cookieResponse)
      }
    }

    // Signup → Google with landlord intent (new or defaulted-tenant shell profile)
    const isUnsetOrDefaultTenant =
      !profile?.role ||
      (profile.role === 'tenant' && !profile.landlord_block_id)

    if (intendedRole === 'landlord' && isUnsetOrDefaultTenant) {
      console.log('[OAuth Callback] Applying signup landlord intent')
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: userEmail,
        full_name: userName,
        role: 'landlord',
        blockchain_verified: false,
        property_setup_complete: false,
        kyc_verified: false,
        onboarding_completed: false,
      })
      return redirect(origin, '/complete-setup', request, cookieResponse)
    }

    // Brand-new OAuth user with no profile yet
    if (!profile) {
      console.log('[OAuth Callback] No profile — creating shell profile for role selection')
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: userEmail,
        full_name: userName,
        blockchain_verified: false,
        property_setup_complete: false,
        kyc_verified: false,
        onboarding_completed: false,
      })
      return redirect(origin, '/select-role', request, cookieResponse)
    }

    // Profile exists but role not chosen yet
    if (!profile.role) {
      console.log('[OAuth Callback] Profile without role — sending to role selection')
      return redirect(origin, '/select-role', request, cookieResponse)
    }

    // Tenant without a linked property — do not force landlord setup
    if (profile.role === 'tenant') {
      if (!profile.landlord_block_id) {
        console.log('[OAuth Callback] Tenant without property link — role selection / join flow')
        return redirect(origin, '/select-role', request, cookieResponse)
      }
      return redirect(origin, '/dashboard', request, cookieResponse)
    }

    // Returning user
    console.log('[OAuth Callback] Returning user, role:', profile.role)

    if (profile.role === 'developer') {
      return redirect(origin, '/developer-dashboard', request, cookieResponse)
    }

    if (profile.role === 'landlord' && (!profile.landlord_block_id || !profile.property_setup_complete)) {
      return redirect(origin, '/complete-setup', request, cookieResponse)
    }

    return redirect(origin, '/dashboard', request, cookieResponse)

  } catch (err) {
    console.error('[OAuth Callback] Unexpected error:', err)
    const friendlyError = getFriendlyAuthError(err instanceof Error ? err.message : 'Unknown error')
    const msg = encodeURIComponent(`${friendlyError.title}\n\n${friendlyError.description}`)
    return NextResponse.redirect(`${origin}/login?error=auth_failed&message=${msg}`)
  }
}

// Helper to redirect while preserving cookies
function redirect(origin: string, path: string, request: NextRequest, cookieResponse: NextResponse) {
  const res = NextResponse.redirect(`${origin}${path}`)
  cookieResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    res.cookies.set(name, value, options)
  })
  console.log('[OAuth Callback] Redirecting to:', path)
  return res
}