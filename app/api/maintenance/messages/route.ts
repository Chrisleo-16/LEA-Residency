import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** GET /api/maintenance/messages?request_id= */
export async function GET(request: NextRequest) {
  try {
    const auth = await createClient()
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = new URL(request.url).searchParams.get('request_id')
    if (!requestId) {
      return NextResponse.json({ error: 'request_id required' }, { status: 400 })
    }

    const sb = service()
    const { data: profile } = await sb
      .from('profiles')
      .select('role, landlord_block_id')
      .eq('id', user.id)
      .maybeSingle()

    const { data: req } = await sb
      .from('maintenance_requests')
      .select('tenant_id, landlord_block_id')
      .eq('id', requestId)
      .maybeSingle()

    if (!req) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const allowed =
      req.tenant_id === user.id ||
      (profile?.role === 'landlord' &&
        req.landlord_block_id === profile.landlord_block_id)

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await sb
      .from('maintenance_messages')
      .select('*, sender:sender_id(id, full_name, role)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, messages: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** POST /api/maintenance/messages */
export async function POST(request: NextRequest) {
  try {
    const auth = await createClient()
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = service()
    const { data: profile } = await sb
      .from('profiles')
      .select('role, landlord_block_id')
      .eq('id', user.id)
      .maybeSingle()

    const body = await request.json()
    const { request_id, body: messageBody } = body
    if (!request_id || !messageBody?.trim()) {
      return NextResponse.json(
        { error: 'request_id and body required' },
        { status: 400 }
      )
    }

    const { data: req } = await sb
      .from('maintenance_requests')
      .select('tenant_id, landlord_block_id, assigned_staff_id, status')
      .eq('id', request_id)
      .maybeSingle()

    if (!req) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const allowed =
      req.tenant_id === user.id ||
      (profile?.role === 'landlord' &&
        req.landlord_block_id === profile.landlord_block_id)

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const senderRole =
      profile?.role === 'landlord'
        ? 'landlord'
        : profile?.role === 'tenant'
          ? 'tenant'
          : 'staff'

    const { data, error } = await sb
      .from('maintenance_messages')
      .insert({
        request_id,
        sender_id: user.id,
        sender_role: senderRole,
        body: messageBody.trim(),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
