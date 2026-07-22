import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePhoneNumber, formatPhoneNumber } from '@/lib/sms'
import { notifyByWhatsAppOrSMS } from '@/lib/notify'
import { WHATSAPP_TEMPLATES } from '@/lib/whatsapp'

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
  listingId?: string
  tenantId?: string
}

// The wizard shows human-readable urgency copy, but viewing_requests.urgency
// has a CHECK constraint restricted to ('immediate', 'soon', 'flexible').
// These have never matched — every real submission was failing the CHECK
// constraint at insert time. Map the UI copy to the stored enum here.
const URGENCY_DB_VALUES = ['immediate', 'soon', 'flexible'] as const
const URGENCY_MAP: Record<string, (typeof URGENCY_DB_VALUES)[number]> = {
  'Within 1 week': 'immediate',
  'Within 1 month': 'soon',
  'No rush — just looking': 'flexible',
  'No rush - just looking': 'flexible',
}

function toDbUrgency(urgency: string): (typeof URGENCY_DB_VALUES)[number] {
  if ((URGENCY_DB_VALUES as readonly string[]).includes(urgency)) {
    return urgency as (typeof URGENCY_DB_VALUES)[number]
  }
  return URGENCY_MAP[urgency] || 'flexible'
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

    const supabase = await createClient()

    // Resolve the real listing owner (if this request is tied to a listing)
    // instead of falling back to a single site-wide hardcoded phone number.
    let ownerPhone: string | null = null
    let listingTitle = 'the property'
    if (body.listingId) {
      const { data: listingRow } = await supabase
        .from('listings')
        .select('title, created_by')
        .eq('id', body.listingId)
        .maybeSingle()

      if (listingRow?.title) listingTitle = listingRow.title

      if (listingRow?.created_by) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', listingRow.created_by)
          .maybeSingle()
        ownerPhone = ownerProfile?.phone_number || null
      }
    }

    // Create viewing request record.
    // Deliberately not using .select() here: an anonymous submitter has no
    // RLS SELECT policy granting them read-back on viewing_requests (the
    // SELECT policies are scoped to the listing owner, the tenant_id, and
    // developers), and Postgres requires a passing SELECT policy to satisfy
    // RETURNING — even on an otherwise-valid INSERT. Generating the id
    // ourselves avoids needing it (same pattern as /api/wishlist).
    const requestId = randomUUID()
    const { error } = await supabase
      .from('viewing_requests')
      .insert({
        id: requestId,
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
        urgency: toDbUrgency(body.urgency),
        agreed_to_terms: body.agreeToTerms,
        listing_id: body.listingId || null,
        tenant_id: body.tenantId || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending', // pending, confirmed, completed, cancelled
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('[Viewing] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save viewing request' },
        { status: 500 }
      )
    }

    // Send notifications — WhatsApp first (once configured), SMS fallback
    try {
      const userName = `${body.firstName} ${body.lastName}`

      const userNotifyResult = await notifyByWhatsAppOrSMS({
        phone: body.phone,
        whatsappTemplate: WHATSAPP_TEMPLATES.VIEWING_CONFIRMATION,
        whatsappParams: [userName, body.preferredDate, body.preferredTime],
        smsMessage: `Dear ${userName},\n\nThank you for scheduling a property viewing with LEA.\n\nDate: ${body.preferredDate}\nTime: ${body.preferredTime}\n\nWe will confirm your appointment within 24 hours.\n\nFor changes, call: +254 799 956574\n\nLEA`,
      })

      // Notify the real listing owner if we resolved one; otherwise there's
      // no site-wide fallback number to notify, so skip silently.
      let landlordNotifyResult: { success: boolean } = { success: false }
      if (ownerPhone) {
        landlordNotifyResult = await notifyByWhatsAppOrSMS({
          phone: ownerPhone,
          whatsappTemplate: WHATSAPP_TEMPLATES.VIEWING_NOTIFICATION,
          whatsappParams: [userName, formatPhoneNumber(body.phone), listingTitle, body.preferredDate, body.preferredTime],
          smsMessage: `NEW VIEWING REQUEST\n\nName: ${body.firstName} ${body.lastName}\nPhone: ${body.phone}\nEmail: ${body.email}\n\nProperty: ${listingTitle}\nDate: ${body.preferredDate}\nTime: ${body.preferredTime}\nGroup: ${body.groupSize} people\nUrgency: ${body.urgency}\n\nPlease confirm within 24 hours.\n\nLEA`,
        })
      }

      console.log('[Viewing] Notifications sent:', {
        user: userNotifyResult,
        landlord: landlordNotifyResult,
      })
    } catch (notifyError) {
      console.error('[Viewing] Notification failed:', notifyError)
      // Continue even if notification fails - the request is saved
    }

    console.log('[Viewing] New viewing request received:', requestId)

    return NextResponse.json({
      success: true,
      message: 'Viewing request submitted successfully',
      requestId
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
