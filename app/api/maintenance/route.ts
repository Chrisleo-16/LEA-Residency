import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  pickBestStaff,
  suggestStaffForRequest,
  type AssignableStaff,
} from '@/lib/maintenance/assignment'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getTenantContext(sb: any, tenantId: string) {
  const { data: profile } = await sb
    .from('profiles')
    .select('id, full_name, phone_number, landlord_block_id')
    .eq('id', tenantId)
    .maybeSingle()

  const { data: slot } = await sb
    .from('tenant_slots')
    .select('landlord_block_id, unit_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const blockId = slot?.landlord_block_id || profile?.landlord_block_id

  let unitNumber: string | null = null
  let propertyId: string | null = null

  if (slot?.unit_id) {
    const { data: unit } = await sb
      .from('units')
      .select('unit_number, property_id')
      .eq('id', slot.unit_id)
      .maybeSingle()
    unitNumber = unit?.unit_number || null
    propertyId = unit?.property_id || null
  }

  if (!propertyId && blockId) {
    const { data: prop } = await sb
      .from('properties')
      .select('id')
      .eq('landlord_block_id', blockId)
      .limit(1)
      .maybeSingle()
    propertyId = prop?.id || null
  }

  const { data: rs } = await sb
    .from('rent_settings')
    .select('unit_number')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    blockId,
    unitNumber: unitNumber || rs?.unit_number || null,
    propertyId,
    profile,
  }
}

async function loadAssignableStaff(
  sb: any,
  landlordId: string,
  blockId: string | null,
  tenantId: string
): Promise<AssignableStaff[]> {
  let q = sb
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .eq('created_by', landlordId)

  const { data: staffRows } = await q

  const { data: assignments } = await sb
    .from('staff_assignments')
    .select('staff_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const assignedIds = new Set((assignments || []).map((a: any) => a.staff_id))

  return (staffRows || []).map((s: any) => ({
    ...s,
    propertyMatched:
      assignedIds.has(s.id) ||
      (!!blockId && s.landlord_block_id === blockId),
  }))
}

async function resolveLandlordId(sb: any, blockId: string | null) {
  if (!blockId) return null
  const { data } = await sb
    .from('profiles')
    .select('id')
    .eq('landlord_block_id', blockId)
    .eq('role', 'landlord')
    .maybeSingle()
  return data?.id || null
}

/**
 * GET /api/maintenance
 */
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
    const { data: profile } = await sb
      .from('profiles')
      .select('role, landlord_block_id')
      .eq('id', user.id)
      .maybeSingle()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const suggest = searchParams.get('suggest_for')

    // Suggestion endpoint for landlord assignment UI
    if (suggest && profile?.role === 'landlord') {
      const { data: req } = await sb
        .from('maintenance_requests')
        .select('*')
        .eq('id', suggest)
        .maybeSingle()
      if (!req) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      const staff = await loadAssignableStaff(
        sb,
        user.id,
        req.landlord_block_id,
        req.tenant_id
      )
      const suggestions = suggestStaffForRequest(req.category, staff, {
        landlordBlockId: req.landlord_block_id,
      })
      return NextResponse.json({
        success: true,
        suggestions,
        best: suggestions[0] || null,
      })
    }

    let query = sb
      .from('maintenance_requests')
      .select(
        `
        *,
        staff:assigned_staff_id (
          id, first_name, last_name, phone, whatsapp_number, specialty, availability
        )
      `
      )
      .order('created_at', { ascending: false })

    if (profile?.role === 'tenant') {
      query = query.eq('tenant_id', user.id)
    } else if (profile?.role === 'landlord') {
      query = query.eq('landlord_block_id', profile.landlord_block_id)
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) {
      console.error('[Maintenance GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Attach tenant profiles
    const tenantIds = [...new Set((data || []).map((r: any) => r.tenant_id))]
    let tenantsById: Record<string, any> = {}
    if (tenantIds.length) {
      const { data: tenants } = await sb
        .from('profiles')
        .select('id, full_name, email, phone_number')
        .in('id', tenantIds)
      for (const t of tenants || []) tenantsById[t.id] = t
    }

    const requests = (data || []).map((r: any) => ({
      ...r,
      tenant: tenantsById[r.tenant_id] || null,
    }))

    return NextResponse.json({ success: true, requests })
  } catch (err: any) {
    console.error('[Maintenance GET]', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/maintenance — tenant submits request; auto-suggest + optional auto-assign
 */
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
    const body = await request.json()
    const { title, description, category, priority, photos, tenant_notes } = body

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'title, description, and category are required' },
        { status: 400 }
      )
    }

    const ctx = await getTenantContext(sb, user.id)
    if (!ctx.blockId) {
      return NextResponse.json(
        { error: 'You must be linked to a property before submitting maintenance requests' },
        { status: 400 }
      )
    }

    const landlordId = await resolveLandlordId(sb, ctx.blockId)
    let assignedStaffId: string | null = null
    let status = 'pending'

    if (landlordId) {
      const staff = await loadAssignableStaff(sb, landlordId, ctx.blockId, user.id)
      const best = pickBestStaff(category, staff, { landlordBlockId: ctx.blockId })
      // Auto-assign only when there is a clear property-matched specialist
      if (best?.propertyMatched && best.specialty === category) {
        assignedStaffId = best.id
        status = 'assigned'
      }
    }

    const { data, error } = await sb
      .from('maintenance_requests')
      .insert({
        tenant_id: user.id,
        landlord_block_id: ctx.blockId,
        property_id: ctx.propertyId,
        unit_number: ctx.unitNumber,
        title,
        description,
        category,
        priority: priority || 'medium',
        photos: Array.isArray(photos) ? photos : null,
        tenant_notes: tenant_notes || null,
        status,
        assigned_staff_id: assignedStaffId,
        assigned_at: assignedStaffId ? new Date().toISOString() : null,
      })
      .select(
        `
        *,
        staff:assigned_staff_id (
          id, first_name, last_name, phone, whatsapp_number, specialty
        )
      `
      )
      .single()

    if (error) {
      console.error('[Maintenance POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await sb.from('maintenance_updates').insert({
      request_id: data.id,
      updated_by: user.id,
      update_type: 'created',
      new_status: status,
      notes: 'Request submitted by tenant',
    })

    if (assignedStaffId) {
      await sb.from('maintenance_updates').insert({
        request_id: data.id,
        updated_by: user.id,
        staff_id: assignedStaffId,
        update_type: 'assigned',
        previous_status: 'pending',
        new_status: 'assigned',
        notes: 'Auto-assigned by LEA based on category and property staff',
      })
    }

    // Suggestions for landlord (always return)
    let suggestions: AssignableStaff[] = []
    if (landlordId) {
      const staff = await loadAssignableStaff(sb, landlordId, ctx.blockId, user.id)
      suggestions = suggestStaffForRequest(category, staff, {
        landlordBlockId: ctx.blockId,
      })
    }

    return NextResponse.json({
      success: true,
      request: data,
      suggestions,
      autoAssigned: !!assignedStaffId,
    })
  } catch (err: any) {
    console.error('[Maintenance POST]', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/maintenance — assign / status updates
 */
export async function PUT(request: NextRequest) {
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
    const {
      requestId,
      status,
      assigned_staff_id,
      landlord_notes,
      staff_notes,
      estimated_completion_date,
    } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId required' }, { status: 400 })
    }

    const { data: current } = await sb
      .from('maintenance_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (profile?.role === 'tenant' && current.tenant_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (
      profile?.role === 'landlord' &&
      current.landlord_block_id !== profile.landlord_block_id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Tenants can only add notes or close their own resolved requests
    if (profile?.role === 'tenant') {
      const allowed =
        (status === 'closed' &&
          ['completed', 'resolved'].includes(current.status)) ||
        body.tenant_notes
      if (!allowed && (assigned_staff_id || (status && status !== 'closed'))) {
        return NextResponse.json(
          { error: 'Tenants cannot assign staff or change status except closing resolved requests' },
          { status: 403 }
        )
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (status) {
      updateData.status = status === 'resolved' ? 'completed' : status
      if (updateData.status === 'completed') {
        updateData.actual_completion_date = new Date().toISOString()
      }
      if (updateData.status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }
    }
    if (assigned_staff_id !== undefined) {
      updateData.assigned_staff_id = assigned_staff_id || null
      if (assigned_staff_id) {
        updateData.assigned_at = new Date().toISOString()
        if (!status && current.status === 'pending') {
          updateData.status = 'assigned'
        }
      }
    }
    if (landlord_notes !== undefined) updateData.landlord_notes = landlord_notes
    if (staff_notes !== undefined) updateData.staff_notes = staff_notes
    if (body.tenant_notes !== undefined) updateData.tenant_notes = body.tenant_notes
    if (estimated_completion_date) {
      updateData.estimated_completion_date = estimated_completion_date
    }

    const { data, error } = await sb
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', requestId)
      .select(
        `
        *,
        staff:assigned_staff_id (
          id, first_name, last_name, phone, whatsapp_number, specialty
        )
      `
      )
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const updateType = assigned_staff_id
      ? 'assigned'
      : status
        ? status === 'completed' || status === 'resolved'
          ? 'completed'
          : 'status_change'
        : 'note_added'

    await sb.from('maintenance_updates').insert({
      request_id: requestId,
      updated_by: user.id,
      staff_id: assigned_staff_id || current.assigned_staff_id,
      update_type: updateType,
      previous_status: current.status,
      new_status: data.status,
      notes: landlord_notes || staff_notes || body.tenant_notes || null,
    })

    return NextResponse.json({ success: true, request: data })
  } catch (err: any) {
    console.error('[Maintenance PUT]', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
