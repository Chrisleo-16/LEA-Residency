import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Africa's Talking configuration
const AFRICAS_TALKING = {
  username: process.env.AFRICAS_TALKING_USERNAME!,
  apiKey: process.env.AFRICAS_TALKING_API_KEY!,
  senderId: process.env.AFRICAS_TALKING_SENDER_ID || 'LEAExecutive',
  landlordPhone: process.env.LANDLORD_PHONE_NUMBER!, // e.g., '+254700123456'
  // Use sandbox for testing, live for production
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.africastalking.com/version1/messaging'
    : 'https://api.sandbox.africastalking.com/version1/messaging'
}

interface SMSMessage {
  to: string
  message: string
  from?: string
}

interface SMSResponse {
  SMSMessageData: {
    Recipients: Array<{
      statusCode: number
      messageId: string
      number: string
      status: string
      cost: string
    }>
    Message: string
  }
}

/**
 * Send SMS via Africa's Talking API
 */
export async function sendSMS({ to, message, from = AFRICAS_TALKING.senderId }: SMSMessage) {
  try {
    // Format phone number for Africa's Talking (remove +, ensure proper format)
    const formattedPhone = formatPhoneNumber(to)
    
    console.log('[SMS] Sending SMS:', {
      to: formattedPhone,
      message: message.substring(0, 50) + '...',
      from: from,
      endpoint: AFRICAS_TALKING.baseUrl,
      username: AFRICAS_TALKING.username
    })
    
    const response = await fetch(AFRICAS_TALKING.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'apiKey': AFRICAS_TALKING.apiKey
      },
      body: new URLSearchParams({
        username: AFRICAS_TALKING.username,
        to: formattedPhone,
        message: message,
        from: from
      })
    })

    // Get response text first to handle potential HTML errors
    const responseText = await response.text()
    console.log('[SMS] Raw response:', responseText.substring(0, 200))
    
    // Check if response is HTML (error page)
    if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
      console.error('[SMS] Received HTML response instead of JSON - likely authentication error')
      return { 
        success: false, 
        error: 'Authentication failed - check API credentials and endpoint',
        statusCode: 401
      }
    }
    
    // Parse JSON response
    let result: SMSResponse
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[SMS] Failed to parse JSON response:', parseError)
      return { 
        success: false, 
        error: 'Invalid API response format',
        statusCode: 500
      }
    }
    
    if (result.SMSMessageData?.Recipients?.[0]?.statusCode === 101) {
      const recipient = result.SMSMessageData.Recipients[0]
      console.log(`[SMS] Successfully sent to ${to}:`, recipient.messageId, `Cost: ${recipient.cost}`)
      return { 
        success: true, 
        messageId: recipient.messageId,
        cost: recipient.cost,
        status: recipient.status
      }
    } else {
      console.error('[SMS] Failed to send:', result)
      return { 
        success: false, 
        error: result.SMSMessageData?.Message || 'Unknown error',
        statusCode: result.SMSMessageData?.Recipients?.[0]?.statusCode
      }
    }
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send contact form confirmation SMS to user
 */
export async function sendContactConfirmationSMS(userPhone: string, userName: string) {
  const message = `Dear ${userName},\n\nThank you for contacting LEA Executive Residency. We have received your message and will get back to you within 24 hours.\n\nFor urgent inquiries, call us at +254 700 000 000.\n\nBest regards,\nLEA Executive Management`
  
  return await sendSMS({
    to: userPhone,
    message: message
  })
}

/**
 * Send contact form notification SMS to landlord
 */
export async function sendContactNotificationSMS(contactData: {
  firstName: string
  lastName: string
  email: string
  phone: string
  subject: string
  inquiryType: string
}) {
  const message = `NEW CONTACT INQUIRY\n\nName: ${contactData.firstName} ${contactData.lastName}\nEmail: ${contactData.email}\nPhone: ${contactData.phone}\nType: ${contactData.inquiryType}\nSubject: ${contactData.subject}\n\nPlease respond within 24 hours.\n\nLEA Executive System`
  
  return await sendSMS({
    to: AFRICAS_TALKING.landlordPhone,
    message: message
  })
}

/**
 * Send viewing request confirmation SMS to user
 */
export async function sendViewingConfirmationSMS(userPhone: string, userName: string, preferredDate: string, preferredTime: string) {
  const message = `Dear ${userName},\n\nThank you for scheduling a property viewing with LEA Executive Residency.\n\nDate: ${preferredDate}\nTime: ${preferredTime}\n\nWe will confirm your appointment within 24 hours. You will receive a confirmation call or SMS.\n\nFor changes, call: +254 700 000 000\n\nBest regards,\nLEA Executive Management`
  
  return await sendSMS({
    to: userPhone,
    message: message
  })
}

/**
 * Send viewing request notification SMS to landlord
 */
export async function sendViewingNotificationSMS(viewingData: {
  firstName: string
  lastName: string
  email: string
  phone: string
  propertyType: string
  preferredDate: string
  preferredTime: string
  groupSize: string
  urgency: string
}) {
  const message = `NEW VIEWING REQUEST\n\nName: ${viewingData.firstName} ${viewingData.lastName}\nPhone: ${viewingData.phone}\nEmail: ${viewingData.email}\n\nProperty: ${viewingData.propertyType}\nDate: ${viewingData.preferredDate}\nTime: ${viewingData.preferredTime}\nGroup: ${viewingData.groupSize} people\nUrgency: ${viewingData.urgency}\n\nPlease confirm within 24 hours.\n\nLEA Executive System`
  
  return await sendSMS({
    to: AFRICAS_TALKING.landlordPhone,
    message: message
  })
}

/**
 * Validate phone number for Africa's Talking format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Check if it's a valid Kenyan number (starts with 7 or 1 and has 9 digits after 254)
  if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
    return true
  }
  
  // Check if it's a valid number without country code (starts with 7 or 1 and has 9 digits)
  if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) && cleanPhone.length === 9) {
    return true
  }
  
  return false
}

/**
 * Format phone number for Africa's Talking
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleanPhone = phone.replace(/\D/g, '')
  
  // If number starts with 0, replace with 254
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '254' + cleanPhone.substring(1)
  }
  
  // If number doesn't start with 254, add it
  if (!cleanPhone.startsWith('254')) {
    cleanPhone = '254' + cleanPhone
  }
  
  return cleanPhone
}

/**
 * Validate Africa's Talking credentials
 */
export async function validateAfricasTalkingCredentials(): Promise<boolean> {
  try {
    const response = await fetch(AFRICAS_TALKING.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'apiKey': AFRICAS_TALKING.apiKey
      },
      body: new URLSearchParams({
        username: AFRICAS_TALKING.username,
        to: formatPhoneNumber(AFRICAS_TALKING.landlordPhone), // Test with landlord phone
        message: 'LEA Executive SMS system test - credentials validation',
        from: AFRICAS_TALKING.senderId
      })
    })

    const result: SMSResponse = await response.json()
    
    // Check if credentials are valid (even if SMS fails due to other reasons)
    if (result.SMSMessageData?.Recipients?.[0]) {
      console.log('[SMS] Credentials validated successfully')
      return true
    } else {
      console.error('[SMS] Invalid credentials:', result)
      return false
    }
  } catch (error) {
    console.error('[SMS] Credential validation failed:', error)
    return false
  }
}

/**
 * Get SMS balance from Africa's Talking
 */
export async function getSMSBalance(): Promise<{ balance: string; currency: string } | null> {
  try {
    const response = await fetch(`${AFRICAS_TALKING.baseUrl.replace('/messaging', '/user')}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'apiKey': AFRICAS_TALKING.apiKey
      }
    })

    const result = await response.json()
    
    if (result.userData) {
      return {
        balance: result.userData.balance || '0',
        currency: result.userData.currency || 'KES'
      }
    }
    
    return null
  } catch (error) {
    console.error('[SMS] Failed to get balance:', error)
    return null
  }
}
