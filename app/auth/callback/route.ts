import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (!code) {
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=no_authorization_code`
      )
    }

    // Create a Supabase server client for the code exchange
    // This client doesn't need incoming cookies since OAuth code is fresh
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Empty for OAuth code exchange (no session cookies yet)
            return []
          },
          setAll(cookiesToSet) {
            // Set the fresh session cookies on the redirect response
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Exchange the authorization code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[OAuth Callback] Exchange error:', error.message)
      const errorMsg = encodeURIComponent(error.message || 'Authentication failed')
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=${errorMsg}`
      )
    }

    // Success: return redirect with session cookies
    return response
  } catch (err) {
    console.error('[OAuth Callback] Unexpected error:', err)
    const origin = new URL(request.url).origin
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&message=callback_error`
    )
  }
}

