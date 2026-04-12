/**
 * M-Pesa Payment Webhook Handler
 * Handles payment confirmation callbacks from M-Pesa
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

/**
 * POST /api/webhooks/payment
 * M-Pesa callback endpoint
 * 
 * Expected payload:
 * {
 *   transactionId: "MPESA...",
 *   phoneNumber: "+254...",
 *   amount: 50000,
 *   reference: "PAY-...",
 *   timestamp: "2026-04-07T10:30:00Z",
 *   status: "success" | "failed"
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const body = await req.json();

      // Validate required fields
      if (!body.transactionId || !body.amount || !body.reference) {
        throw new APIError(
          ErrorCode.VALIDATION_ERROR,
          'Missing required fields: transactionId, amount, reference',
          400
        );
      }

      // Validate webhook signature (in production, verify signature from M-Pesa)
      // const signature = req.headers.get('x-signature');
      // if (!verifySignature(body, signature)) {
      //   throw new APIError(
      //     ErrorCode.AUTHENTICATION_ERROR,
      //     'Invalid webhook signature',
      //     401
      //   );
      // }

      const db = getDatabase();

      // Check if payment exists
      const { data: payment, error } = await db.getClient()
        .from('payments')
        .select('*')
        .eq('reference_number', body.reference)
        .single();

      if (error || !payment) {
        // Payment not found - could be legitimate if reference format changed
        console.warn(`Payment not found for reference: ${body.reference}`);
        return successResponse({
          status: 'warning',
          message: 'Payment not found, but webhook received',
          reference: body.reference
        });
      }

      // Check if already processed
      if (payment.status !== 'pending') {
        return successResponse({
          status: 'already_processed',
          paymentId: payment.id,
          existingStatus: payment.status
        });
      }

      // Process payment based on status
      if (body.status === 'success' || body.status === 'completed') {
        // Confirm payment using database directly
        const { data: confirmed, error: updateError } = await db.getClient()
          .from('payments')
          .update({
            status: 'completed',
            transaction_id: body.transactionId,
            completed_at: new Date().toISOString()
          })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateError || !confirmed) {
          throw new APIError(
            ErrorCode.DATABASE_ERROR,
            'Failed to update payment status',
            500
          );
        }

        // Log the success
        await db.auditLog({
          actorType: 'system',
          action: 'payment_confirmed_via_webhook',
          resourceType: 'payment',
          resourceId: payment.id,
          changes: {
            status: 'completed',
            transactionId: body.transactionId
          }
        });

        return successResponse({
          status: 'ok',
          paymentId: confirmed.id,
          amount: confirmed.amount,
          transactionId: body.transactionId
        });
      } else {
        // Mark as failed
        const failed = await db.updatePaymentStatus(
          payment.id,
          'failed',
          body.transactionId
        );

        await db.auditLog({
          actorType: 'system',
          action: 'payment_failed_via_webhook',
          resourceType: 'payment',
          resourceId: payment.id,
          changes: {
            status: 'failed',
            reason: body.status,
            transactionId: body.transactionId
          }
        });

        return successResponse({
          status: 'payment_failed',
          paymentId: failed.id,
          reason: body.status
        });
      }
    } catch (error) {
      return errorResponse(error);
    }
  }, request);
}

/**
 * GET /api/webhooks/payment
 * Health check endpoint for webhook configuration
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return successResponse({
    status: 'ok',
    endpoint: '/api/webhooks/payment',
    method: 'POST',
    description: 'M-Pesa payment confirmation webhook',
    expectedFields: ['transactionId', 'phoneNumber', 'amount', 'reference', 'status']
  });
}

export default { POST, GET };
