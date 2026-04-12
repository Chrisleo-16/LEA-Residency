/**
 * USSD Webhook Handler
 * Handles USSD callbacks from Africa's Talking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  errorResponse
} from '@/lib/middleware/api';
import { getDatabase } from '@/lib/database/client';
import UssdManager from '@/lib/engines/ussd_manager';

/**
 * POST /api/webhooks/ussd
 * Africa's Talking USSD callback endpoint
 * 
 * Expected payload:
 * {
 *   phoneNumber: "+254712345678",
 *   text: "1",           // User input
 *   sessionId: "session_123",
 *   serviceCode: "123"
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const body = await req.json();
      const { phoneNumber, text, sessionId } = body;

      if (!phoneNumber || text === undefined) {
        throw new Error('Missing required fields: phoneNumber, text');
      }

      const db = getDatabase();
      const ussdManager = new UssdManager(db);

      // Check if this is initial request or continuation
      let response;

      if (!text || text === '') {
        // Initial request
        response = await ussdManager.initializeSession(phoneNumber);
      } else {
        // Continuation - user provided input
        response = await ussdManager.processInput(phoneNumber, text);
      }

      // Format response for Africa's Talking
      const ussdResponse = formatUSSDResponse(response);

      // Log USSD interaction
      await db.getClient()
        .from('audit_logs')
        .insert({
          actor_type: 'customer_ussd',
          action: 'ussd_interaction',
          resource_type: 'ussd_session',
          resource_id: sessionId,
          changes: {
            phoneNumber,
            userInput: text,
            responseText: ussdResponse
          }
        });

      // Return response code + message to Africa's Talking
      if (response.endSession) {
        return NextResponse.json({
          ResponseString: `END ${ussdResponse}`
        });
      } else {
        return NextResponse.json({
          ResponseString: `CON ${ussdResponse}`
        });
      }
    } catch (error) {
      console.error('USSD processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Service error';

      return NextResponse.json({
        ResponseString: `END ${errorMessage}`
      });
    }
  }, request);
}

/**
 * Format menu response for Africa's Talking USSD
 */
function formatUSSDResponse(response: any): string {
  let text = response.text || '';

  // Add numbered options if available
  if (response.options && response.options.length > 0) {
    text += '\n\n';
    response.options.forEach((option: any, index: number) => {
      text += `${option.id}. ${option.label}\n`;
    });
  }

  return text;
}

/**
 * GET /api/webhooks/ussd
 * Health check endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return successResponse({
    status: 'ok',
    endpoint: '/api/webhooks/ussd',
    method: 'POST',
    description: 'Africa\'s Talking USSD webhook',
    expectedFields: ['phoneNumber', 'text', 'sessionId', 'serviceCode']
  });
}

export default { POST, GET };
