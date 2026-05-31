import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // 1. Determine the absolute correct URL domain for Vercel vs Localhost
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const redirectUrl = isLocal 
    ? `${origin}${next}` 
    : forwardedHost 
      ? `https://${forwardedHost}${next}` 
      : `${origin}${next}`

  if (code) {
    // 2. CRITICAL: Create the redirect response object FIRST
    const response = NextResponse.redirect(redirectUrl)

    // 3. Bypass the global server client and write cookies directly to our response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // 4. Fire the token exchange (this writes the cookies directly to the response object)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return response // Return the response containing the freshly set cookies
    }
  }

  // Fallback if things go sideways
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}