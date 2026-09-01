import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from "@/lib/supabase/server"

type ProfileGate = {
  role?: string | null
  landlord_code?: string | null
  landlord_block_id?: string | null
  property_setup_complete?: boolean | null
}

function needsLandlordSetup(profile: ProfileGate | null | undefined) {
  return (
    profile?.role === 'landlord' &&
    (!profile.landlord_code ||
      !profile.landlord_block_id ||
      !profile.property_setup_complete)
  )
}

function needsRoleSelection(profile: ProfileGate | null | undefined) {
  return !profile?.role
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/developer-dashboard') ||
    path.startsWith('/landlord')

  const isAuthPage = path === '/login'
  const isSetupPage = path === '/complete-setup' || path === '/select-role'

  const initialResponse = NextResponse.next({ request })
  const { client: supabase, supabaseResponse } = createMiddlewareClient(request, initialResponse)
  const { data: { user } } = await supabase.auth.getUser()

  const copyCookies = (redirectRes: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectRes.cookies.set(name, value, options)
    })
    return redirectRes
  }

  if (isProtectedRoute && !user) {
    return copyCookies(NextResponse.redirect(new URL('/login', request.url)))
  }

  if ((isProtectedRoute || isSetupPage || isAuthPage) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, landlord_code, landlord_block_id, property_setup_complete')
      .eq('id', user.id)
      .single()

    const resolvePostAuthTarget = () => {
      if (profile?.role === 'developer') return '/developer-dashboard'
      if (needsRoleSelection(profile)) return '/select-role'
      if (needsLandlordSetup(profile)) return '/complete-setup'
      return '/dashboard'
    }

    if (isAuthPage) {
      return copyCookies(NextResponse.redirect(new URL(resolvePostAuthTarget(), request.url)))
    }

    if (isProtectedRoute) {
      if (needsRoleSelection(profile)) {
        return copyCookies(NextResponse.redirect(new URL('/select-role', request.url)))
      }
      if (needsLandlordSetup(profile)) {
        return copyCookies(NextResponse.redirect(new URL('/complete-setup', request.url)))
      }
    }

    if (isSetupPage) {
      if (path === '/select-role' && profile?.role && profile.role !== 'landlord') {
        return copyCookies(NextResponse.redirect(new URL('/dashboard', request.url)))
      }
      if (path === '/complete-setup' && profile?.role === 'landlord' && !needsLandlordSetup(profile)) {
        return copyCookies(NextResponse.redirect(new URL('/dashboard', request.url)))
      }
      if (path === '/select-role' && profile?.role === 'landlord' && needsLandlordSetup(profile)) {
        return copyCookies(NextResponse.redirect(new URL('/complete-setup', request.url)))
      }
      if (path === '/select-role' && profile?.role === 'landlord' && !needsLandlordSetup(profile)) {
        return copyCookies(NextResponse.redirect(new URL('/dashboard', request.url)))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/developer-dashboard/:path*',
    '/landlord/:path*',
    '/login',
    '/complete-setup',
    '/select-role',
  ],
}
