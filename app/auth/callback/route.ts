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
  const mode = searchParams.get('mode') // 'login' | 'signup' | null — set by app/login/page.tsx

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
    console.log('[OAuth Callback] ref:', ref, '| user:', data.session?.user?.id)

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
      .select('role, landlord_block_id, property_setup_complete')
      .eq('id', userId)
      .maybeSingle()

    console.log('[OAuth Callback] profile:', profile)

    // Handle tenant joining via referral link
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
          .update({ landlord_block_id: ref, role: 'tenant', property_setup_complete: true })
          .eq('id', userId)

        return redirect(origin, '/dashboard', request, cookieResponse)
      }
    }

    // New user — no role or trigger-created tenant with no landlord
    const isNew =
      !profile?.role ||
      (profile.role === 'tenant' && !profile.landlord_block_id)

    // Keep "Sign in" and "Sign up" distinct: signing in must not silently
    // create an account, and signing up must not silently log into an
    // existing one. Sign out the just-created OAuth session in both cases
    // so the user isn't left in a half-authenticated state.
    if (mode === 'signup' && !isNew) {
      await supabase.auth.signOut()
      const msg = encodeURIComponent('An account with this Google email already exists. Please sign in instead.')
      return redirect(origin, `/login?error=auth_failed&message=${msg}`, request, cookieResponse)
    }

    if (mode === 'login' && isNew) {
      await supabase.auth.signOut()
      const msg = encodeURIComponent('No account found for this Google email. Please sign up first.')
      return redirect(origin, `/login?error=auth_failed&message=${msg}`, request, cookieResponse)
    }

    if (isNew) {
      console.log('[OAuth Callback] New user — setting landlord')
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: userEmail,
        full_name: userName,
        role: 'landlord',
        blockchain_verified: false,
        property_setup_complete: false,
        kyc_verified: false,
      })
      return redirect(origin, '/complete-setup', request, cookieResponse)
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