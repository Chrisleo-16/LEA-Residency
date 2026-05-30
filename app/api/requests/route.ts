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
    console.error('[Requests API] Failed to fetch tenant ids for landlord:', error)
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
      .from('requests')
      .select('*, profiles!requests_tenant_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })

    if (profile?.role === 'tenant') {
      query = query.eq('tenant_id', user.id)
    } else if (profile?.role === 'landlord') {
      const tenantIds = await getTenantIdsForLandlord(supabase, profile.landlord_block_id)
      if (tenantIds.length === 0) {
        return NextResponse.json({ success: true, requests: [], role: profile.role })
      }
      query = query.in('tenant_id', tenantIds)
    }

    const { data, error: fetchError } = await query
    if (fetchError) {
      console.error('[Requests API] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json({ success: true, requests: data || [], role: profile?.role || 'tenant' })
  } catch (err: any) {
    console.error('[Requests API] Error:', err)
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
    const { title, description, category } = body
    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: countData, error: countError } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.id)
      .in('status', ['pending', 'in_progress'])

    if (countError) {
      console.error('[Requests API] Count error:', countError)
      return NextResponse.json({ error: 'Failed to validate request limits' }, { status: 500 })
    }
    if ((countData as any)?.count >= 5) {
      return NextResponse.json({ error: 'Maximum 5 active requests allowed' }, { status: 403 })
    }

    const { error: insertError } = await supabase.from('requests').insert({
      tenant_id: user.id,
      title,
      description,
      category,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[Requests API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Requests API] Error:', err)
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
    const { requestId, status } = body
    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing requestId or status' }, { status: 400 })
    }

    const { data: currentRequest, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (profile?.role === 'tenant' && currentRequest.tenant_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (profile?.role === 'landlord') {
      const tenantIds = await getTenantIdsForLandlord(supabase, profile.landlord_block_id)
      if (!tenantIds.includes(currentRequest.tenant_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { error: updateError } = await supabase
      .from('requests')
      .update({ status })
      .eq('id', requestId)

    if (updateError) {
      console.error('[Requests API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Requests API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
