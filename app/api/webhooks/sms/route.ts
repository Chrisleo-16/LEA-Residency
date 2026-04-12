/**
 * SMS Webhook Handler
 * Handles inbound SMS and delivery status updates from Africa's Talking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  errorResponse,
  APIError,
  ErrorCode
} from '@/lib/middleware/api';
import { getDatabase } from '@/lib/database/client';
import { processSMSInbound, updateSMSDeliveryStatus } from '@/attalking_integration/sms_dispatcher/webhook_handler';

/**
 * POST /api/webhooks/sms
 * Africa's Talking inbound SMS and delivery status webhook
 * 
 * Inbound message format:
 * {
 *   messageId: "123",
 *   phoneNumber: "+254...",
 *   text: "RATE 5 Great service",
 *   timestamp: "2026-04-07T10:30:00Z",
 *   networkOperatorId: "63902"
 * }
 *  
 * Delivery status format:
 * {
 *   messageId: "123",
 *   status: "success|failed|pending",
 *   timestamp: "2026-04-07T10:30:00Z",
 *   phoneNumber: "+254..."
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const body = await req.json();
      const db = getDatabase();

      // Validate webhook signature (in production)
      // const signature = req.headers.get('x-signature');
      // if (!verifyAfricasTalkingSignature(body, signature)) {
      //   throw new APIError(ErrorCode.AUTHENTICATION_ERROR, 'Invalid signature', 401);
      // }

      // Route based on webhook type
      if (body.text && body.phoneNumber) {
        // Inbound message
        return await handleInboundSMS(body, db);
      } else if (body.status && body.phoneNumber) {
        // Delivery status update
        return await handleDeliveryStatus(body, db);
      } else {
        throw new APIError(
          ErrorCode.VALIDATION_ERROR,
          'Unknown webhook type',
          400
        );
      }
    } catch (error) {
      return errorResponse(error);
    }
  }, request);
}

/**
 * Handle inbound SMS message
 * Routes to appropriate handler (OTP, rating, maintenance, etc.)
 */
async function handleInboundSMS(payload: any, db: any): Promise<NextResponse> {
  try {
    const { phoneNumber, text, messageId, timestamp } = payload;

    // Log inbound SMS
    await db.getClient()
      .from('sms_logs')
      .insert({
        phone_number: phoneNumber,
        message_content: text,
        message_type: 'inbound',
        delivery_status: 'received',
        africa_talking_message_id: messageId,
        created_at: timestamp || new Date().toISOString()
      });

    // Process message with business logic
    const result = await processSMSInbound(phoneNumber, text, db);

    // Send response SMS if needed
    if (result.responseMessage) {
      // Send via dispatcher
      console.log(`Sending response to ${phoneNumber}: ${result.responseMessage}`);
    }

    // Audit log
    await db.auditLog({
      actorType: 'customer_sms',
      action: 'sms_received',
      resourceType: 'sms',
      resourceId: messageId,
      changes: {
        phoneNumber,
        messageContent: text,
        processingResult: result.type
      }
    });

    return successResponse({
      status: 'ok',
      messageId,
      processed: true,
      messageType: result.type
    });
  } catch (error) {
    console.error('Error processing inbound SMS:', error);
    return errorResponse(error);
  }
}

/**
 * Handle delivery status update
 * Updates SMS log with delivery confirmation
 */
async function handleDeliveryStatus(payload: any, db: any): Promise<NextResponse> {
  try {
    const { messageId, status, phoneNumber, timestamp } = payload;

    // Update SMS delivery status
    const { data, error } = await db.getClient()
      .from('sms_logs')
      .update({
        delivery_status: status,
        updated_at: timestamp || new Date().toISOString()
      })
      .eq('africa_talking_message_id', messageId)
      .select()
      .single();

    if (error) {
      console.warn(`SMS delivery update failed for ${messageId}: ${error.message}`);
      return successResponse({
        status: 'warning',
        messageId,
        message: 'SMS log not found, but status received'
      });
    }

    // If delivery failed, potentially retry
    if (status === 'failed') {
      const retryNeeded = await updateSMSDeliveryStatus(
        messageId,
        status,
        db
      );

      if (retryNeeded) {
        console.log(`Queued SMS ${messageId} for retry`);
      }
    }

    // Audit log
    await db.auditLog({
      actorType: 'africa_talking',
      action: 'sms_delivery_status_update',
      resourceType: 'sms',
      resourceId: messageId,
      changes: {
        status,
        phoneNumber
      }
    });

    return successResponse({
      status: 'ok',
      messageId,
      deliveryStatus: status
    });
  } catch (error) {
    console.error('Error updating SMS delivery status:', error);
    return errorResponse(error);
  }
}

/**
 * GET /api/webhooks/sms
 * Health check and status page
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return successResponse({
    status: 'ok',
    endpoint: '/api/webhooks/sms',
    method: 'POST',
    description: 'Africa\'s Talking SMS inbound & delivery status webhook',
    supportedTypes: ['inbound_sms', 'delivery_status'],
    inboundFormat: {
      messageId: 'string',
      phoneNumber: 'string',
      text: 'string',
      timestamp: 'iso8601'
    },
    deliveryFormat: {
      messageId: 'string',
      phoneNumber: 'string',
      status: 'success|failed|pending',
      timestamp: 'iso8601'
    }
  });
}

export default { POST, GET };
