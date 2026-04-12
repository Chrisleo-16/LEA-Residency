import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendContactConfirmationSMS, sendContactNotificationSMS, validatePhoneNumber, formatPhoneNumber } from '@/lib/sms'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  subject: string
  message: string
  inquiryType: string
  preferredContact: string
  agreeToTerms: boolean
}

/**
 * POST /api/contact
 * Handles contact form submissions and saves them to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json()

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'subject', 'message', 'inquiryType']
    const missingFields = requiredFields.filter(field => !body[field as keyof ContactFormData])
    
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

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create contact submission record
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone || null,
        subject: body.subject,
        message: body.message,
        inquiry_type: body.inquiryType,
        preferred_contact: body.preferredContact,
        agreed_to_terms: body.agreeToTerms,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'new', // new, in_progress, resolved, closed
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[Contact] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save contact submission' },
        { status: 500 }
      )
    }

    // Send SMS notifications
    try {
      // Format phone number for SMS
      const formattedPhone = formatPhoneNumber(body.phone)
      const userName = `${body.firstName} ${body.lastName}`
      
      // Send confirmation SMS to user
      const userSMSResult = await sendContactConfirmationSMS(formattedPhone, userName)
      
      // Send notification SMS to landlord
      const landlordSMSResult = await sendContactNotificationSMS({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        subject: body.subject,
        inquiryType: body.inquiryType
      })
      
      console.log('[Contact] SMS notifications sent:', {
        userSMS: userSMSResult.success,
        landlordSMS: landlordSMSResult.success
      })
    } catch (smsError) {
      console.error('[Contact] SMS notification failed:', smsError)
      // Continue even if SMS fails - the submission is saved
    }

    console.log('[Contact] New submission received:', data.id)

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      submissionId: data.id
    })

  } catch (error) {
    console.error('[Contact] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Send notification email to admin about new contact submission
 */
async function sendNotificationEmail(formData: ContactFormData, submissionId: string) {
  // This is where you would integrate with your email service
  // Examples: SendGrid, AWS SES, Resend, etc.
  
  const emailContent = {
    to: 'admin@lea-executive.com',
    subject: `New Contact Form Submission: ${formData.subject}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Submission ID:</strong> ${submissionId}</p>
      <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone || 'Not provided'}</p>
      <p><strong>Inquiry Type:</strong> ${formData.inquiryType}</p>
      <p><strong>Preferred Contact:</strong> ${formData.preferredContact}</p>
      <h3>Message:</h3>
      <p>${formData.message}</p>
      <hr>
      <p><small>This message was sent from the LEA Executive contact form.</small></p>
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
  console.log('[Contact] Email notification content:', emailContent)
}
