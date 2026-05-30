import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function authenticate(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { supabase, user: null, profile: null, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, landlord_block_id')
    .eq('id', data.user.id)
    .maybeSingle()

  return { supabase, user: data.user, profile, error: null }
}

async function fetchRequestWithTenantBlock(supabase: any, requestId: string) {
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('id, user_id, status, profiles!account_deletion_requests_user_id_fkey(id, landlord_block_id)')
    .eq('id', requestId)
    .maybeSingle()

  return { data, error }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile?.role === 'tenant') {
      const { data, error: fetchError } = await supabase
        .from('account_deletion_requests')
        .select('id, user_id, reason, status, created_at, reviewed_at, reviewed_by')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) {
        console.error('[Deletion Requests API] Tenant fetch error:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch deletion request' }, { status: 500 })
      }

      return NextResponse.json({ success: true, request: data || null })
    }

    if (profile?.role === 'landlord') {
      if (!profile.landlord_block_id) {
        return NextResponse.json({ success: true, requests: [] })
      }

      const { data, error: fetchError } = await supabase
        .from('account_deletion_requests')
        .select('id, user_id, reason, status, created_at, reviewed_at, reviewed_by, profiles!account_deletion_requests_user_id_fkey(full_name, email, landlord_block_id)')
        .eq('status', 'pending')
        .eq('profiles.landlord_block_id', profile.landlord_block_id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('[Deletion Requests API] Landlord fetch error:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch deletion requests' }, { status: 500 })
      }

      const requests = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        reason: item.reason,
        status: item.status,
        created_at: item.created_at,
        reviewed_at: item.reviewed_at,
        reviewed_by: item.reviewed_by,
        profiles: item.profiles,
      }))

      return NextResponse.json({ success: true, requests })
    }

    return NextResponse.json({ success: true, requests: [] })
  } catch (err: any) {
    console.error('[Deletion Requests API] Error:', err)
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
    const { reason } = body
    if (!reason) {
      return NextResponse.json({ error: 'Missing reason' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('account_deletion_requests').insert({
      user_id: user.id,
      reason: reason.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[Deletion Requests API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit deletion request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Deletion Requests API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const { data: requestRow, error: requestError } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (profile?.role === 'tenant') {
      if (requestRow.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (profile?.role === 'landlord') {
      if (!profile.landlord_block_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { data: tenantProfile, error: tenantError } = await supabase
        .from('profiles')
        .select('landlord_block_id')
        .eq('id', requestRow.user_id)
        .maybeSingle()

      if (tenantError || !tenantProfile) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }
      if (tenantProfile.landlord_block_id !== profile.landlord_block_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { error: deleteError } = await supabase
      .from('account_deletion_requests')
      .delete()
      .eq('id', requestId)

    if (deleteError) {
      console.error('[Deletion Requests API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Deletion Requests API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (profile?.role !== 'landlord' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, action, targetUserId } = body
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 })
    }

    const { data: requestRow, error: requestError } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id, profiles!account_deletion_requests_user_id_fkey(id, landlord_block_id)')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (profile?.role === 'landlord') {
      if (!profile.landlord_block_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const requestLandlordBlockId = Array.isArray(requestRow.profiles)
        ? requestRow.profiles[0]?.landlord_block_id
        : requestRow.profiles?.landlord_block_id

      if (requestLandlordBlockId !== profile.landlord_block_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (action === 'approve') {
      const targetId = targetUserId || requestRow.user_id
      if (!targetId) {
        return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('account_deletion_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
        .eq('id', requestId)

      if (updateError) {
        console.error('[Deletion Requests API] Approve update error:', updateError)
        return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 })
      }

      const deletions = [
        supabase.from('message_reads').delete().eq('user_id', targetId),
        supabase.from('message_reactions').delete().eq('user_id', targetId),
        supabase.from('messages').delete().eq('sender_id', targetId),
        supabase.from('conversation_participants').delete().eq('user_id', targetId),
        supabase.from('complaints').delete().eq('tenant_id', targetId),
        supabase.from('requests').delete().eq('tenant_id', targetId),
        supabase.from('account_deletion_requests').delete().eq('user_id', targetId),
        supabase.from('profiles').delete().eq('id', targetId),
      ]

      for (const deletion of deletions) {
        const { error: deletionError } = await deletion
        if (deletionError) {
          console.error('[Deletion Requests API] Cleanup delete error:', deletionError)
          return NextResponse.json({ error: 'Failed to remove user records' }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('account_deletion_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
        .eq('id', requestId)

      if (updateError) {
        console.error('[Deletion Requests API] Reject update error:', updateError)
        return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Deletion Requests API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
