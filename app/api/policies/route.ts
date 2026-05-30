import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function authenticate(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { supabase, user: null, profile: null, error: 'Unauthorized' }
  }

  let profile: any = null
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, landlord_block_id')
      .eq('id', data.user.id)
      .maybeSingle()
    profile = profileData
  } catch (err) {
    // If landlord_block_id column doesn't exist, fetch without it
    console.warn('[Policies API] landlord_block_id column not found, fetching profile without it')
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()
    profile = profileData
  }

  return { supabase, user: data.user, profile, error: null }
}

async function authorizePolicyAccess(supabase: any, policyId: string, profile: any) {
  const { data, error } = await supabase
    .from('policies')
    .select('id, created_by, landlord_id')
    .eq('id', policyId)
    .maybeSingle()

  if (error || !data) return { error: error || new Error('Policy not found'), policy: null }
  if (profile?.role === 'admin') return { error: null, policy: data }
  if (profile?.role === 'landlord') {
    if (!profile.landlord_block_id) {
      return { error: new Error('Forbidden'), policy: null }
    }
    if (data.landlord_id !== profile.landlord_block_id) {
      return { error: new Error('Forbidden'), policy: null }
    }
    return { error: null, policy: data }
  }

  return { error: new Error('Forbidden'), policy: null }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile, user, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let query = supabase
      .from('policies')
      .select('id, title, content, category, file_url, created_at, created_by, landlord_id')
      .neq('category', 'announcement')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (profile?.role === 'tenant' || profile?.role === 'landlord') {
      if (!profile.landlord_block_id) {
        return NextResponse.json({ success: true, policies: [] })
      }
      query = query.eq('landlord_id', profile.landlord_block_id)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error: fetchError } = await query

    // If landlord_id column doesn't exist (migration not run yet), fallback to no filter
    if (fetchError && fetchError.message?.includes('landlord_id')) {
      console.warn('[Policies API] landlord_id column not found, using fallback without landlord filter')
      let fallbackQuery = supabase
        .from('policies')
        .select('id, title, content, category, file_url, created_at, created_by')
        .neq('category', 'announcement')
        .order('created_at', { ascending: false })

      if (category) {
        fallbackQuery = fallbackQuery.eq('category', category)
      }

      if (search) {
        fallbackQuery = fallbackQuery.ilike('title', `%${search}%`)
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery
      if (fallbackError) {
        console.error('[Policies API] Fallback fetch error:', fallbackError)
        return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
      }

      return NextResponse.json({ success: true, policies: fallbackData || [] })
    }

    if (fetchError) {
      console.error('[Policies API] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
    }

    const policies = (data || []).map((policy: any) => ({
      id: policy.id,
      title: policy.title,
      content: policy.content,
      category: policy.category,
      file_url: policy.file_url,
      created_at: policy.created_at,
      created_by: policy.created_by,
    }))

    return NextResponse.json({ success: true, policies })
  } catch (err: any) {
    console.error('[Policies API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile, user, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (profile?.role !== 'landlord' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, category, file_url } = body
    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const insertData: any = {
      title,
      content,
      category,
      file_url: file_url || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }

    // Only add landlord_id if the column exists (after migration)
    if (profile?.landlord_block_id) {
      insertData.landlord_id = profile.landlord_block_id
    }

    const { error: insertError } = await supabase.from('policies').insert(insertData)

    if (insertError) {
      console.error('[Policies API] Insert error:', insertError)
      // If error is about landlord_id column, try without it
      if (insertError.message?.includes('landlord_id')) {
        console.warn('[Policies API] landlord_id column not found, inserting without it')
        const { error: fallbackError } = await supabase.from('policies').insert({
          title,
          content,
          category,
          file_url: file_url || null,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        if (fallbackError) {
          console.error('[Policies API] Fallback insert error:', fallbackError)
          return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Policies API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, profile, user, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (profile?.role !== 'landlord' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { policyId, title, content } = body
    if (!policyId || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error: authError, policy } = await authorizePolicyAccess(supabase, policyId, profile)
    if (authError || !policy) {
      return NextResponse.json({ error: authError?.message || 'Forbidden' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('policies')
      .update({ title, content })
      .eq('id', policyId)

    if (updateError) {
      console.error('[Policies API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Policies API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, profile, user, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (profile?.role !== 'landlord' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('policyId')
    if (!policyId) {
      return NextResponse.json({ error: 'Missing policyId' }, { status: 400 })
    }

    const { error: authError, policy } = await authorizePolicyAccess(supabase, policyId, profile)
    if (authError || !policy) {
      return NextResponse.json({ error: authError?.message || 'Forbidden' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('policies')
      .delete()
      .eq('id', policyId)

    if (deleteError) {
      console.error('[Policies API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Policies API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
