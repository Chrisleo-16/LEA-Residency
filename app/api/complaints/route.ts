import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function authenticate(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { supabase, user: null, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, landlord_block_id')
    .eq('id', data.user.id)
    .maybeSingle()

  return { supabase, user: data.user, profile, error: null }
}

async function getTenantIdsForLandlord(supabase: any, landlordBlockId: string | null) {
  if (!landlordBlockId) return []
  const { data, error } = await supabase
    .from('tenant_slots')
    .select('tenant_id')
    .eq('landlord_block_id', landlordBlockId)
    .not('tenant_id', 'is', null)

  if (error) {
    console.error('[Complaints API] Failed to fetch tenant ids for landlord:', error)
    return []
  }

  return (data || []).map((row: any) => row.tenant_id).filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('complaints')
      .select('*, profiles!complaints_tenant_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })

    if (profile?.role === 'tenant') {
      query = query.eq('tenant_id', user.id)
    } else if (profile?.role === 'landlord') {
      const tenantIds = await getTenantIdsForLandlord(supabase, profile.landlord_block_id)
      if (tenantIds.length === 0) {
        return NextResponse.json({ success: true, complaints: [], role: profile.role })
      }
      query = query.in('tenant_id', tenantIds)
    }

    const { data, error: fetchError } = await query
    if (fetchError) {
      console.error('[Complaints API] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 })
    }

    return NextResponse.json({ success: true, complaints: data || [], role: profile?.role || 'tenant' })
  } catch (err: any) {
    console.error('[Complaints API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (profile?.role !== 'tenant') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description } = body
    if (!title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: countData, error: countError } = await supabase
      .from('complaints')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.id)
      .in('status', ['pending', 'in_progress'])

    if (countError) {
      console.error('[Complaints API] Count error:', countError)
      return NextResponse.json({ error: 'Failed to validate complaint limits' }, { status: 500 })
    }
    if ((countData as any)?.count >= 3) {
      return NextResponse.json({ error: 'Maximum 3 active complaints allowed' }, { status: 403 })
    }

    const { error: insertError } = await supabase.from('complaints').insert({
      tenant_id: user.id,
      title,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[Complaints API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Complaints API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { complaintId, status } = body
    if (!complaintId || !status) {
      return NextResponse.json({ error: 'Missing complaintId or status' }, { status: 400 })
    }

    const { data: currentComplaint, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single()

    if (fetchError || !currentComplaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    if (profile?.role === 'tenant' && currentComplaint.tenant_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (profile?.role === 'landlord') {
      const tenantIds = await getTenantIdsForLandlord(supabase, profile.landlord_block_id)
      if (!tenantIds.includes(currentComplaint.tenant_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { error: updateError } = await supabase
      .from('complaints')
      .update({ status })
      .eq('id', complaintId)

    if (updateError) {
      console.error('[Complaints API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Complaints API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
