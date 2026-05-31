import { NextResponse } from 'next/server'
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [] // Not needed for the code exchange inbound request
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
  }

  // Fallback if no code or exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}