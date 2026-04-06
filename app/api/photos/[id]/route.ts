import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get photo details
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Check if user owns the photo or is landlord
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (photo.user_id !== userId && profile?.role !== 'landlord') {
      return NextResponse.json({ error: 'Not authorized to delete this photo' }, { status: 403 })
    }

    // Extract file path from URL
    const urlParts = photo.file_url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `${userId}/${fileName}`

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([filePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete photo API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id
    const userId = request.headers.get('x-user-id')
    const updates = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get photo to check ownership
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Check if user owns the photo or is landlord
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (photo.user_id !== userId && profile?.role !== 'landlord') {
      return NextResponse.json({ error: 'Not authorized to update this photo' }, { status: 403 })
    }

    // Update photo metadata
    const { data: updatedPhoto, error: updateError } = await supabase
      .from('photos')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', photoId)
      .select()
      .single()

    if (updateError) {
      console.error('Update photo error:', updateError)
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
    }

    return NextResponse.json({ photo: updatedPhoto })

  } catch (error) {
    console.error('Update photo API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
