import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getFriendlyAuthError } from '@/lib/auth-errors'
import { createClient } from '@supabase/supabase-js'

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

    // ref IS the landlord_block_id (landlord_blocks.id)
    const ref = searchParams.get('ref') ?? searchParams.get('state')

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[OAuth Callback] ref from URL:', ref)
console.log('[OAuth Callback] user id:', data.session?.user?.id)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    // ref IS already the landlord_block_id — verify it exists and is active
    // before writing to the tenant's profile
    if (ref && data.session?.user) {
      const { data: block, error: blockError } = await supabaseAdmin
        .from('landlord_blocks')
        .select('id')
        .eq('id', ref)
        .eq('is_active', true)
        .single()

      if (blockError || !block) {
        // Invalid or inactive block — log and skip, don't write bad data
        console.error('[OAuth Callback] Invalid or inactive landlord_block_id:', ref)
      } else {
        // Valid block — write landlord_block_id and role to the tenant's profile
        await supabaseAdmin
          .from('profiles')
          .update({
            landlord_block_id: ref,
            role: 'tenant',
          })
          .eq('id', data.session.user.id)
      }
    }

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