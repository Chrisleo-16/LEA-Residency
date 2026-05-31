import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CRITICAL FOR VERCEL: Never cache this route
export const dynamic = 'force-dynamic' 

export async function GET(request: NextRequest) {
  // request.nextUrl perfectly handles Vercel's HTTPS proxy headers
  const nextUrl = request.nextUrl.clone()
  
  const code = nextUrl.searchParams.get('code')
  const next = nextUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Success! Send them to the dashboard cleanly
      nextUrl.pathname = next
      nextUrl.searchParams.delete('code')
      nextUrl.searchParams.delete('next')
      return NextResponse.redirect(nextUrl)
    } else {
      // IF IT FAILS: We attach the exact Supabase error to the URL so we can read it!
      nextUrl.pathname = '/login'
      nextUrl.searchParams.set('error', 'auth_failed')
      nextUrl.searchParams.set('reason', error.message)
      return NextResponse.redirect(nextUrl)
    }
  }

  // Fallback if no code is present
  nextUrl.pathname = '/login'
  nextUrl.searchParams.set('error', 'no_code')
  return NextResponse.redirect(nextUrl)
}