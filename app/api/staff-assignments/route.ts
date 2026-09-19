import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** GET /api/staff-assignments?staff_id= */
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

    const sb = service()
    const staffId = new URL(request.url).searchParams.get('staff_id')

    let q = sb
      .from('staff_assignments')
      .select('*')
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })

    if (staffId) q = q.eq('staff_id', staffId)

    const { data, error } = await q
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, assignments: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** POST /api/staff-assignments — assign staff to tenant/property */
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

    if (profile?.role !== 'landlord') {
      return NextResponse.json({ error: 'Landlords only' }, { status: 403 })
    }

    const body = await request.json()
    const { staff_id, tenant_id, property_id, unit_id, notes } = body
    if (!staff_id || !tenant_id) {
      return NextResponse.json(
        { error: 'staff_id and tenant_id required' },
        { status: 400 }
      )
    }

    // Verify staff owned by landlord
    const { data: staff } = await sb
      .from('staff')
      .select('id, created_by')
      .eq('id', staff_id)
      .eq('created_by', user.id)
      .maybeSingle()
    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    const { data, error } = await sb
      .from('staff_assignments')
      .insert({
        staff_id,
        tenant_id,
        property_id: property_id || null,
        unit_id: unit_id || null,
        landlord_block_id: profile.landlord_block_id,
        assigned_by: user.id,
        notes: notes || null,
        status: 'active',
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Tag staff with block for smarter routing
    if (profile.landlord_block_id) {
      await sb
        .from('staff')
        .update({ landlord_block_id: profile.landlord_block_id })
        .eq('id', staff_id)
    }

    return NextResponse.json({ success: true, assignment: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** DELETE /api/staff-assignments — soft-cancel */
export async function DELETE(request: NextRequest) {
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
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await sb
      .from('staff_assignments')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
