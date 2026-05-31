// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from "@/lib/supabase/server"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isProtectedRoute = path.startsWith('/dashboard') ||
                           path.startsWith('/developer-dashboard') ||
                           path.startsWith('/landlord')

  const isAuthPage = path === '/login'
  const isOnboardingPage = path === '/onboarding'

  // 1. Initialize the base response
  const initialResponse = NextResponse.next({ request })

  // 2. Initialize Supabase and pull out the actively tracked response object
  const { client: supabase, supabaseResponse } = createMiddlewareClient(request, initialResponse)

  // 3. Authenticate user server-side (Refreshes tokens if expired via supabaseResponse)
  const { data: { user } } = await supabase.auth.getUser()

  // --- ROUTE GUARDING BLOCK ---

  // Helper function to cleanly forward Supabase's fresh cookies to any redirect
  // Helper function to cleanly forward Supabase's fresh cookies to any redirect
  const redirectWithCookies = (url: string) => {
    const redirectRes = NextResponse.redirect(new URL(url, request.url))
    
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      // Destructure name and value, and gather the remaining properties into an 'options' object
      const { name, value, ...options } = cookie
      redirectRes.cookies.set(name, value, options)
    })
    
    return redirectRes
  }
  // User is trying to access a protected dashboard route, but is not logged in
  if (isProtectedRoute && !user) {
    return redirectWithCookies('/login')
  }

  // User is logged in but trying to visit the login page
  if (isAuthPage && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'landlord' && !profile?.onboarding_completed) {
      return redirectWithCookies('/onboarding')
    }
    
    return redirectWithCookies('/dashboard')
  }

  // Protecting uncompleted onboarding flows
  if (isProtectedRoute && user && !isOnboardingPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'landlord' && !profile?.onboarding_completed) {
      return redirectWithCookies('/onboarding')
    }
  }

  // If no redirect is needed, return the base response containing the updated session cookies
  return supabaseResponse
}

export const config = {
  matcher: [
    // This optimized regex protects matching dashboards but excludes static assets/images
    '/dashboard/:path*',
    '/developer-dashboard/:path*',
    '/landlord/:path*',
    '/login',
    '/onboarding',
  ],
}