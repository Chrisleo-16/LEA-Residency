import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, validatePhoneNumber, formatPhoneNumber } from '@/lib/sms'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MaintenanceRequestData {
  tenant_id: string
  title: string
  description: string
  category: string
  priority: string
  tenant_notes?: string
}

/**
 * POST /api/maintenance
 * Handles maintenance request submissions from tenants
 */
export async function POST(request: NextRequest) {
  try {
    const body: MaintenanceRequestData = await request.json()

    // Validate required fields
    const requiredFields = ['tenant_id', 'title', 'description', 'category', 'priority']
    const missingFields = requiredFields.filter(field => !body[field as keyof MaintenanceRequestData])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create maintenance request record
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({
        tenant_id: body.tenant_id,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority,
        tenant_notes: body.tenant_notes || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        auth.users (
          email,
          phone,
          raw_user_meta_data
        )
      `)
      .single()

    if (error) {
      console.error('[Maintenance] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save maintenance request' },
        { status: 500 }
      )
    }

    // Send SMS notification to landlord about new request
    try {
      const tenantData = data.auth.users
      const tenantPhone = tenantData?.phone || tenantData?.raw_user_meta_data?.phone
      
      if (tenantPhone && validatePhoneNumber(tenantPhone)) {
        const landlordSMS = await sendSMS({
          to: process.env.LANDLORD_PHONE_NUMBER!,
          message: `NEW MAINTENANCE REQUEST

Title: ${body.title}
Category: ${body.category}
Priority: ${body.priority}
Tenant: ${tenantData?.raw_user_meta_data?.first_name || 'Unknown'} ${tenantData?.raw_user_meta_data?.last_name || ''}
Phone: ${tenantPhone}

Description: ${body.description.substring(0, 100)}${body.description.length > 100 ? '...' : ''}

Please review and assign appropriate staff.

LEA Executive System`
        })

        console.log('[Maintenance] Landlord notification sent:', landlordSMS.success)
      }
    } catch (smsError) {
      console.error('[Maintenance] SMS notification failed:', smsError)
      // Continue even if SMS fails - the request is saved
    }

    console.log('[Maintenance] New request received:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Maintenance request submitted successfully',
      requestId: data.id
    })

  } catch (error) {
    console.error('[Maintenance] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/maintenance
 * Retrieves maintenance requests (for landlords/admins)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        staff (
          first_name,
          last_name,
          phone,
          specialty,
          rating
        ),
        auth.users (
          email,
          phone,
          raw_user_meta_data
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Maintenance] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch maintenance requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requests: data || []
    })

  } catch (error) {
    console.error('[Maintenance] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/maintenance
 * Updates maintenance requests (for landlords/admins)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, status, assigned_staff_id, estimated_completion_date, cost_estimate, landlord_notes } = body

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Get current request details
    const { data: currentRequest, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        staff (
          first_name,
          last_name,
          phone,
          specialty
        ),
        auth.users (
          email,
          phone,
          raw_user_meta_data
        )
      `)
      .eq('id', requestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      )
    }

    // Update the request
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (assigned_staff_id) updateData.assigned_staff_id = assigned_staff_id
    if (estimated_completion_date) updateData.estimated_completion_date = estimated_completion_date
    if (cost_estimate) updateData.cost_estimate = cost_estimate
    if (landlord_notes) updateData.landlord_notes = landlord_notes

    // Set assigned_at if staff is being assigned
    if (assigned_staff_id && !currentRequest.assigned_staff_id) {
      updateData.assigned_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', requestId)
      .select(`
        *,
        staff (
          first_name,
          last_name,
          phone,
          specialty
        ),
        auth.users (
          email,
          phone,
          raw_user_meta_data
        )
      `)
      .single()

    if (error) {
      console.error('[Maintenance] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update maintenance request' },
        { status: 500 }
      )
    }

    // Send SMS notifications based on updates
    try {
      const tenantData = data.auth.users
      const tenantPhone = tenantData?.phone || tenantData?.raw_user_meta_data?.phone

      // If staff was assigned, notify both tenant and staff
      if (assigned_staff_id && data.staff) {
        // Notify tenant
        if (tenantPhone && validatePhoneNumber(tenantPhone)) {
          const tenantSMS = await sendSMS({
            to: tenantPhone,
            message: `MAINTENANCE REQUEST ASSIGNED

Your maintenance request "${currentRequest.title}" has been assigned to ${data.staff.first_name} ${data.staff.last_name} (${data.staff.specialty}).

Staff Phone: ${data.staff.phone}
Estimated Completion: ${estimated_completion_date ? new Date(estimated_completion_date).toLocaleDateString() : 'To be determined'}

They will contact you shortly to schedule the work.

LEA Executive Management`
          })

          console.log('[Maintenance] Tenant notification sent:', tenantSMS.success)
        }

        // Notify staff member
        if (data.staff.phone && validatePhoneNumber(data.staff.phone)) {
          const staffSMS = await sendSMS({
            to: data.staff.phone,
            message: `NEW MAINTENANCE ASSIGNMENT

Request: ${currentRequest.title}
Category: ${currentRequest.category}
Priority: ${currentRequest.priority}
Tenant: ${tenantData?.raw_user_meta_data?.first_name || 'Unknown'} ${tenantData?.raw_user_meta_data?.last_name || ''}
Tenant Phone: ${tenantPhone}

Description: ${currentRequest.description.substring(0, 150)}${currentRequest.description.length > 150 ? '...' : ''}

Please contact the tenant to schedule the work.

LEA Executive System`
          })

          console.log('[Maintenance] Staff notification sent:', staffSMS.success)
        }
      }

      // If status changed to completed, notify tenant
      if (status === 'completed' && currentRequest.status !== 'completed') {
        if (tenantPhone && validatePhoneNumber(tenantPhone)) {
          const completionSMS = await sendSMS({
            to: tenantPhone,
            message: `MAINTENANCE COMPLETED

Your maintenance request "${currentRequest.title}" has been marked as completed.

Please review the work and provide feedback through your dashboard.

Thank you for using LEA Executive!`
          })

          console.log('[Maintenance] Completion notification sent:', completionSMS.success)
        }
      }
    } catch (smsError) {
      console.error('[Maintenance] SMS notification failed:', smsError)
      // Continue even if SMS fails - the update is saved
    }

    console.log('[Maintenance] Request updated:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Maintenance request updated successfully',
      request: data
    })

  } catch (error) {
    console.error('[Maintenance] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
