/**
 * Payment API Routes
 * Next.js API handlers for payment operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getDatabase } from '@/lib/database/client';
import MpesaPaymentEngine from '@/lib/engines/mpesa_engine';
import SMSDispatcher from '@/attalking_integration/sms_dispatcher/dispatcher';
import OTPAuthService, { getAuthService } from '@/lib/engines/otp_auth';
import { createMessage } from '@/attalking_integration/sms_dispatcher/message_templates';
import { getOfflineQueue } from '@/lib/engines/offline_queue';
import { Country } from '@/lib/types';

// Lazy initialization functions
let mpesaEngine: MpesaPaymentEngine | null = null;
let smsDispatcher: SMSDispatcher | null = null;

function getMpesaEngine(): MpesaPaymentEngine {
  if (!mpesaEngine) {
    mpesaEngine = new MpesaPaymentEngine({
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      shortCode: process.env.MPESA_SHORT_CODE || '',
      passthroughKey: process.env.MPESA_PASSTHROUGH_KEY || '',
      sandbox: process.env.NODE_ENV !== 'production'
    });
  }
  return mpesaEngine;
}

function getSmsDispatcher(): SMSDispatcher {
  if (!smsDispatcher) {
    smsDispatcher = new SMSDispatcher({
      apiKey: process.env.AFRICASTALKING_API_KEY || '',
      username: process.env.AFRICASTALKING_USERNAME || ''
    });
  }
  return smsDispatcher;
}

/**
 * POST /api/payments/request-payment
 * Initiate payment request (STK push)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      leaseId,
      amount,
      phoneNumber,
      propertyRef,
      paymentType = 'rent'
    } = body;

    // Validate input
    if (!tenantId || !leaseId || !amount || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0 || amount > 10000000) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    const db = initializeDatabase({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      maxRetries: 3,
      retryDelay: 1000
    });

    // Get tenant and lease info
    const tenant = await db.getClient()
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenant.error || !tenant.data) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const lease = await db.getLease(leaseId);
    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Generate payment ID
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Request payment with M-Pesa
    const result = await getMpesaEngine().requestPayment(
      phoneNumber,
      {
        paymentId,
        tenantId,
        landlordId: lease.landlord_id,
        amount,
        propertyRef: propertyRef || 'Your Unit',
        paymentType,
        leaseId
      },
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`
    );

    if (!result.success) {
      // Add to offline queue for retry
      const queue = await getOfflineQueue();
      const queueId = await queue.enqueue('payment', tenantId, {
        amount,
        phoneNumber,
        leaseId,
        paymentType,
        paymentId
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          queuedOffline: true,
          queueId
        },
        { status: 202 } // Accepted - queued for retry
      );
    }

    return NextResponse.json({
      success: true,
      paymentId,
      checkoutRequestID: result.checkoutRequestID,
      displayMessage: `M-Pesa prompt sent to ${phoneNumber}`
    });
  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment request failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/confirm
 * Confirm payment (called by polling or webhook)
 */
export async function confirmPayment(
  paymentId: string,
  mpesaTransactionId: string,
  amount: number
) {
  const db = getDatabase();

  try {
    // Update payment status
    const payment = await db.updatePaymentStatus(paymentId, 'completed', mpesaTransactionId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Get lease details for SMS
    const lease = await db.getLease(payment.lease_id);

    // Send confirmation SMS
    const tenantCountry = lease?.landlords?.country || 'KE';
    const messageContent = createMessage(
      'PAYMENT_CONFIRMATION',
      {
        amount: amount.toString(),
        propertyRef: lease?.units?.unit_number || 'Your Unit',
        date: new Date().toLocaleDateString(),
        deepLink: `${process.env.NEXT_PUBLIC_APP_URL}/payment/${mpesaTransactionId}`
      },
      tenantCountry as Country
    );

    const tenant = lease?.tenants;
    if (tenant?.phone_number) {
      await getSmsDispatcher().sendSMS([tenant.phone_number], messageContent);
    }

    // Log transaction
    await db.auditLog({
      actorType: 'system',
      action: 'payment_confirmed',
      resourceType: 'payment',
      resourceId: payment.id,
      changes: {
        status: 'completed',
        mpesaTransactionId,
        confirmedAmount: amount
      }
    });

    return payment;
  } catch (error) {
    console.error('Payment confirmation error:', error);
    throw error;
  }
}

/**
 * GET /api/payments/status
 * Get payment status
 */
export async function getPaymentStatus(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const { data: payment, error } = await db.getClient()
      .from('payments')
      .select('*')
      .eq('reference_number', paymentId)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      mpesaTransactionId: payment.mpesa_transaction_id,
      dueDate: payment.due_date,
      paidDate: payment.paid_date
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/retry
 * Manually retry offline payments
 */
export async function retryPayment(request: NextRequest) {
  try {
    const queue = await getOfflineQueue();
    const results = await queue.syncQueue(async (item) => {
      if (item.transactionType !== 'payment') return;

      const { amount, phoneNumber, leaseId, paymentType, paymentId } = item.data;

      // Get tenant and lease
      const db = getDatabase();
      const lease = await db.getLease(leaseId);

      if (!lease) {
        throw new Error('Lease not found');
      }

      // Retry STK push
      const result = await getMpesaEngine().requestPayment(
        phoneNumber,
        {
          paymentId,
          tenantId: item.entityId,
          landlordId: lease.landlord_id,
          amount,
          propertyRef: 'Your Unit',
          paymentType,
          leaseId
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`
      );

      if (!result.success) {
        throw new Error(result.error);
      }
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Retry payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Retry failed' },
      { status: 500 }
    );
  }
}

export default { POST, getPaymentStatus, retryPayment };
