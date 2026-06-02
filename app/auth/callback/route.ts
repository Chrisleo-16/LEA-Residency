import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // 1. Create the redirect response to the absolute origin
    const response = NextResponse.redirect(`${origin}${next}`)

    // 2. Initialize a standalone client tied directly to this response
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
          },
          setAll(cookiesToSet) {
            // Force cookies directly onto the redirect response object
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // 3. Run the exchange (this automatically triggers setAll above)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return response
    }

    const errorMessage = encodeURIComponent(error.message || 'Unable to complete authentication.')
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&message=${errorMessage}`
    )
  }

  // Fallback if no code or exchange fails
  return NextResponse.redirect(
    `${origin}/login?error=auth_failed&message=missing_code`
  )
}
