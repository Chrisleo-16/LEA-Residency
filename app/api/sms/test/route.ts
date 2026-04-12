import { NextRequest, NextResponse } from 'next/server'
import { validateAfricasTalkingCredentials, getSMSBalance, sendSMS } from '@/lib/sms'

/**
 * GET /api/sms/test
 * Test Africa's Talking SMS integration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug') === 'true'
    
    // Check environment variables
    const envCheck = {
      username: process.env.AFRICAS_TALKING_USERNAME ? 'Set' : 'Missing',
      apiKey: process.env.AFRICAS_TALKING_API_KEY ? 'Set' : 'Missing',
      senderId: process.env.AFRICAS_TALKING_SENDER_ID || 'LEAExecutive',
      landlordPhone: process.env.LANDLORD_PHONE_NUMBER || 'Missing',
      nodeEnv: process.env.NODE_ENV || 'development'
    }
    
    if (debug) {
      return NextResponse.json({
        success: true,
        environment: {
          node_env: process.env.NODE_ENV,
          api_endpoint: process.env.NODE_ENV === 'production' 
            ? 'https://api.africastalking.com/version1/messaging'
            : 'https://api.sandbox.africastalking.com/version1/messaging'
        },
        env_check: envCheck,
        credentials: {
          username: process.env.AFRICAS_TALKING_USERNAME,
          apiKey: process.env.AFRICAS_TALKING_API_KEY ? `${process.env.AFRICAS_TALKING_API_KEY?.substring(0, 8)}...` : null,
          senderId: process.env.AFRICAS_TALKING_SENDER_ID,
          landlordPhone: process.env.LANDLORD_PHONE_NUMBER
        }
      })
    }
    
    // Validate credentials
    const credentialsValid = await validateAfricasTalkingCredentials()
    
    // Get SMS balance
    const balance = await getSMSBalance()
    
    // Test sending a sample SMS (optional)
    const testSend = searchParams.get('send') === 'true'
    const testPhone = searchParams.get('phone') || process.env.LANDLORD_PHONE_NUMBER
    
    let testResult = null
    if (testSend && testPhone) {
      testResult = await sendSMS({
        to: testPhone,
        message: 'LEA Executive - SMS integration test successful! This is a test message.'
      })
    }

    return NextResponse.json({
      success: true,
      env_check: envCheck,
      credentials: {
        valid: credentialsValid,
        message: credentialsValid ? 'Credentials are valid' : 'Invalid credentials'
      },
      balance: balance,
      test: testResult,
      environment: {
        node_env: process.env.NODE_ENV,
        api_endpoint: process.env.NODE_ENV === 'production' 
          ? 'https://api.africastalking.com/version1/messaging'
          : 'https://api.sandbox.africastalking.com/version1/messaging'
      }
    })

  } catch (error) {
    console.error('[SMS Test] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sms/test
 * Send a test SMS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    const result = await sendSMS({ to, message })

    return NextResponse.json({
      success: result.success,
      result: result
    })

  } catch (error) {
    console.error('[SMS Test] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
