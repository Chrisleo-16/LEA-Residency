import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface StaffData {
  first_name: string
  last_name: string
  email: string
  phone: string
  specialty: string
  company_name?: string
  experience_years?: number
  hourly_rate?: number
  availability?: string
  notes?: string
}

/**
 * GET /api/staff
 * Retrieves staff members (for landlords/admins)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const specialty = searchParams.get('specialty')
    const availability = searchParams.get('availability')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('staff')
      .select('*')
      .eq('is_active', isActive !== 'false')
      .order('created_at', { ascending: false })

    // Apply filters
    if (specialty) {
      query = query.eq('specialty', specialty)
    }
    if (availability) {
      query = query.eq('availability', availability)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Staff] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch staff members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: data || []
    })

  } catch (error) {
    console.error('[Staff] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff
 * Adds a new staff member (for landlords/admins)
 */
export async function POST(request: NextRequest) {
  try {
    const body: StaffData = await request.json()

    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'specialty']
    const missingFields = requiredFields.filter(field => !body[field as keyof StaffData])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', body.email)
      .single()

    if (existingStaff) {
      return NextResponse.json(
        { error: 'Staff member with this email already exists' },
        { status: 400 }
      )
    }

    // Create staff member
    const { data, error } = await supabase
      .from('staff')
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        specialty: body.specialty,
        company_name: body.company_name || null,
        experience_years: body.experience_years || null,
        hourly_rate: body.hourly_rate || null,
        availability: body.availability || 'available',
        notes: body.notes || null,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[Staff] Create error:', error)
      return NextResponse.json(
        { error: 'Failed to create staff member' },
        { status: 500 }
      )
    }

    console.log('[Staff] New staff member added:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Staff member added successfully',
      staff: data
    })

  } catch (error) {
    console.error('[Staff] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/staff
 * Updates staff member information (for landlords/admins)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, ...updateData } = body

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Validate email format if being updated
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updateData.email)) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        )
      }
    }

    // Update staff member
    const { data, error } = await supabase
      .from('staff')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)
      .select()
      .single()

    if (error) {
      console.error('[Staff] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update staff member' },
        { status: 500 }
      )
    }

    console.log('[Staff] Staff member updated:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: data
    })

  } catch (error) {
    console.error('[Staff] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/staff
 * Deactivates a staff member (for landlords/admins)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('staff')
      .update({
        is_active: false,
        availability: 'unavailable',
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)
      .select()
      .single()

    if (error) {
      console.error('[Staff] Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to remove staff member' },
        { status: 500 }
      )
    }

    console.log('[Staff] Staff member deactivated:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully',
      staff: data
    })

  } catch (error) {
    console.error('[Staff] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
