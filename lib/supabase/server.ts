// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// 1. Client for Server Components, Server Actions, & Route Handlers
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Safe to ignore if called from static server components
          }
        },
      },
    }
  )
}

// 2. Client for Middleware (Handles cookie proxying safely)
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  // We create a mutable reference to track the active response object
  let supabaseResponse = response

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Sync with the request object so subsequent middleware blocks read the fresh state
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // Re-instantiate the response object with the request context to preserve the cookie mutation
          supabaseResponse = NextResponse.next({ request })
          
          // Write the updated tokens to the final output response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { client, supabaseResponse }
}