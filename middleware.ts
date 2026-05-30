// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Import the middleware-specific initialization function cleanly
import { createMiddlewareClient } from "@/lib/supabase/server"

export async function middleware(request: NextRequest) {
  // Initialize the base response
  const response = NextResponse.next({ request })

  // Initialize Supabase with the request and response contexts
  const supabase = createMiddlewareClient(request, response)

  // Securely check token authenticity server-side (refreshes expired tokens automatically)
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isProtectedRoute = path.startsWith('/dashboard') ||
                          path.startsWith('/developer-dashboard') ||
                          path.startsWith('/landlord')

  const isAuthPage = path === '/login'
  const isOnboardingPage = path === '/onboarding'

  // Route guarding based on core authentication state
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && user) {
    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If accessing dashboard or protected routes without completing onboarding
  if (isProtectedRoute && user && !isOnboardingPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/developer-dashboard/:path*',
    '/landlord/:path*',
    '/login',
    '/onboarding',
  ],
}