import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getFriendlyAuthError } from '@/lib/auth-errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const nextParam = searchParams.get('next') ?? '/dashboard'
    const next =
      nextParam.startsWith('/') && !nextParam.startsWith('//')
        ? nextParam
        : '/dashboard'

    if (!code) {
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=no_authorization_code`
      )
    }

    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // PKCE code verifier is stored in cookies when OAuth starts in the browser
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
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
      const friendlyError = getFriendlyAuthError(error.message)
      const errorMessage = encodeURIComponent(
        `${friendlyError.title}\n\n${friendlyError.description}\n\n${friendlyError.action}`
      )
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=${errorMessage}`
      )
    }

    // Success: return redirect with session cookies
    return response
  } catch (err) {
    console.error('[OAuth Callback] Unexpected error:', err)
    const origin = new URL(request.url).origin
    const friendlyError = getFriendlyAuthError(
      err instanceof Error ? err.message : 'Unknown error'
    )
    const errorMessage = encodeURIComponent(
      `${friendlyError.title}\n\n${friendlyError.description}\n\n${friendlyError.action}`
    )
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&message=${errorMessage}`
    )
  }
}

