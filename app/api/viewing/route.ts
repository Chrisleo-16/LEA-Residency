import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendViewingConfirmationSMS, sendViewingNotificationSMS, validatePhoneNumber, formatPhoneNumber } from '@/lib/sms'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ViewingFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  propertyType: string
  preferredDate: string
  preferredTime: string
  message: string
  groupSize: string
  budget: string
  urgency: string
  agreeToTerms: boolean
}

/**
 * POST /api/viewing
 * Handles property viewing scheduling requests and saves them to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body: ViewingFormData = await request.json()

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'propertyType', 'preferredDate', 'preferredTime', 'groupSize', 'urgency']
    const missingFields = requiredFields.filter(field => !body[field as keyof ViewingFormData])
    
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

    // Validate phone number for SMS
    if (!validatePhoneNumber(body.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please use a valid Kenyan phone number.' },
        { status: 400 }
      )
    }

    // Validate date (should be in the future)
    const preferredDate = new Date(body.preferredDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (preferredDate <= today) {
      return NextResponse.json(
        { error: 'Preferred date must be in the future' },
        { status: 400 }
      )
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create viewing request record
    const { data, error } = await supabase
      .from('viewing_requests')
      .insert({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        property_type: body.propertyType,
        preferred_date: body.preferredDate,
        preferred_time: body.preferredTime,
        message: body.message || null,
        group_size: body.groupSize,
        budget: body.budget || null,
        urgency: body.urgency,
        agreed_to_terms: body.agreeToTerms,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending', // pending, confirmed, completed, cancelled
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[Viewing] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save viewing request' },
        { status: 500 }
      )
    }

    // Send SMS notifications
    try {
      // Format phone number for SMS
      const formattedPhone = formatPhoneNumber(body.phone)
      const userName = `${body.firstName} ${body.lastName}`
      
      // Send confirmation SMS to user
      const userSMSResult = await sendViewingConfirmationSMS(
        formattedPhone, 
        userName, 
        body.preferredDate, 
        body.preferredTime
      )
      
      // Send notification SMS to landlord
      const landlordSMSResult = await sendViewingNotificationSMS({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        propertyType: body.propertyType,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        groupSize: body.groupSize,
        urgency: body.urgency
      })
      
      console.log('[Viewing] SMS notifications sent:', {
        userSMS: userSMSResult.success,
        landlordSMS: landlordSMSResult.success
      })
    } catch (smsError) {
      console.error('[Viewing] SMS notification failed:', smsError)
      // Continue even if SMS fails - the request is saved
    }

    console.log('[Viewing] New viewing request received:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Viewing request submitted successfully',
      requestId: data.id
    })

  } catch (error) {
    console.error('[Viewing] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Send notification email to admin about new viewing request
 */
async function sendViewingNotificationEmail(formData: ViewingFormData, requestId: string) {
  // This is where you would integrate with your email service
  // Examples: SendGrid, AWS SES, Resend, etc.
  
  const emailContent = {
    to: 'admin@lea-executive.com',
    subject: `New Property Viewing Request: ${formData.firstName} ${formData.lastName}`,
    html: `
      <h2>New Property Viewing Request</h2>
      <p><strong>Request ID:</strong> ${requestId}</p>
      <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Property Type:</strong> ${formData.propertyType}</p>
      <p><strong>Preferred Date:</strong> ${formData.preferredDate}</p>
      <p><strong>Preferred Time:</strong> ${formData.preferredTime}</p>
      <p><strong>Group Size:</strong> ${formData.groupSize}</p>
      <p><strong>Budget:</strong> ${formData.budget || 'Not specified'}</p>
      <p><strong>Urgency:</strong> ${formData.urgency}</p>
      
      ${formData.message ? `
      <h3>Additional Information:</h3>
      <p>${formData.message}</p>
      ` : ''}
      
      <hr>
      <p><small>This viewing request was submitted from the LEA Executive website.</small></p>
    `
  }

  // Example with Resend (you would need to install and configure):
  // const { data, error } = await resend.emails.send({
  //   from: 'noreply@lea-executive.com',
  //   to: ['admin@lea-executive.com'],
  //   subject: emailContent.subject,
  //   html: emailContent.html
  // })

  // For now, just log the email content
  console.log('[Viewing] Email notification content:', emailContent)
}
