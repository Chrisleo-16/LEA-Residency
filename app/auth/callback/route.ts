import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic' 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Default to the dashboard if no 'next' parameter is provided
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // --- THE VERCEL PROXY FIX ---
      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // Localhost behavior
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // Vercel Production behavior: Force HTTPS and use the true browser domain
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        // Fallback
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Fallback if no code is present or token exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}