import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function authenticate(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { supabase, user: null, error: 'Unauthorized' }
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
    console.warn('[Announcements API] landlord_block_id column not found, fetching profile without it')
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()
    profile = profileData
  }

  return { supabase, user: data.user, profile, error: null }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!profile?.landlord_block_id) {
      return NextResponse.json({ success: true, announcements: [] })
    }

    // Try with landlord_id filter first (after migration)
    let query = supabase
      .from('policies')
      .select('id, title, content, created_at, landlord_id')
      .eq('category', 'announcement')
      .order('created_at', { ascending: false })

    // Add landlord_id filter if available
    query = query.eq('landlord_id', profile.landlord_block_id)

    const { data, error: fetchError } = await query

    // If landlord_id column doesn't exist (migration not run yet), fallback to no filter
    if (fetchError && fetchError.message?.includes('landlord_id')) {
      console.warn('[Announcements API] landlord_id column not found, using fallback without landlord filter')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('policies')
        .select('id, title, content, created_at')
        .eq('category', 'announcement')
        .order('created_at', { ascending: false })

      if (fallbackError) {
        console.error('[Announcements API] Fallback fetch error:', fallbackError)
        return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
      }

      const announcements = (fallbackData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        created_at: item.created_at,
      }))

      return NextResponse.json({ success: true, announcements })
    }

    if (fetchError) {
      console.error('[Announcements API] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
    }

    const announcements = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      created_at: item.created_at,
    }))

    return NextResponse.json({ success: true, announcements })
  } catch (err: any) {
    console.error('[Announcements API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, content } = body
    if (!id || !title || !content) {
      return NextResponse.json({ error: 'Missing id, title, or content' }, { status: 400 })
    }

    let query = supabase
      .from('policies')
      .update({ title, content })
      .eq('id', id)
      .eq('category', 'announcement')

    if (profile?.landlord_block_id) {
      query = query.eq('landlord_id', profile.landlord_block_id)
    }

    const { data, error: updateError } = await query.select('id')

    if (updateError && updateError.message?.includes('landlord_id')) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('policies')
        .update({ title, content })
        .eq('id', id)
        .eq('category', 'announcement')
        .select('id')

      if (fallbackError) {
        console.error('[Announcements API] Fallback update error:', fallbackError)
        return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
      }

      if (!fallbackData?.length) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    if (updateError) {
      console.error('[Announcements API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
    }

    if (!data?.length) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Announcements API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing announcement id' }, { status: 400 })
    }

    let query = supabase
      .from('policies')
      .delete()
      .eq('id', id)
      .eq('category', 'announcement')

    if (profile?.landlord_block_id) {
      query = query.eq('landlord_id', profile.landlord_block_id)
    }

    const { data, error: deleteError } = await query.select('id')

    if (deleteError && deleteError.message?.includes('landlord_id')) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('policies')
        .delete()
        .eq('id', id)
        .eq('category', 'announcement')
        .select('id')

      if (fallbackError) {
        console.error('[Announcements API] Fallback delete error:', fallbackError)
        return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
      }

      if (!fallbackData?.length) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    if (deleteError) {
      console.error('[Announcements API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
    }

    if (!data?.length) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Announcements API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, profile, error } = await authenticate(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!profile?.landlord_block_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content } = body
    if (!title || !content) {
      return NextResponse.json({ error: 'Missing title or content' }, { status: 400 })
    }

    const insertData: any = {
      title,
      content,
      category: 'announcement',
      created_by: user.id,
      created_at: new Date().toISOString(),
    }

    try {
      insertData.landlord_id = profile.landlord_block_id
    } catch (err) {
      // Column doesn't exist yet, skip it
    }

    const { error: insertError } = await supabase.from('policies').insert(insertData)

    if (insertError) {
      console.error('[Announcements API] Insert error:', insertError)
      if (insertError.message?.includes('landlord_id')) {
        console.warn('[Announcements API] landlord_id column not found, inserting without it')
        const { error: fallbackError } = await supabase.from('policies').insert({
          title,
          content,
          category: 'announcement',
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        if (fallbackError) {
          console.error('[Announcements API] Fallback insert error:', fallbackError)
          return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Announcements API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
