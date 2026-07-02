import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// POST /api/billing/confirm
// Records a manual "I've paid via Pochi la Biashara" confirmation from the
// user. This does NOT verify the payment or activate the subscription —
// it just logs that the user says they paid, so an admin can cross-check
// against the Pochi till and manually approve it.
export async function POST(req: Request) {
  const { amount, type } = await req.json()

  if (!amount || !type) {
    return NextResponse.json(
      { error: 'Missing amount or type in request body.' },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('payment_confirmations')
    .insert({
      user_id: user.id,
      amount,
      type, // 'setup' | 'subscription'
      method: 'pochi_la_biashara',
      status: 'pending_review',
    })
    .select()
    .single()

  if (error) {
    console.error('[api/billing/confirm] insert failed:', error)
    return NextResponse.json(
      { error: 'Failed to record your confirmation. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, confirmation: data })
}