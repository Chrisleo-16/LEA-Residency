/**
 * SMS Webhook Handler for Africa's Talking
 * Processes inbound SMS and delivery status updates
 */

import crypto from 'crypto';

/**
 * Validate webhook signature from Africa's Talking
 * Uses HMAC-SHA256 with API key
 */
export function validateWebhookSignature(
  body: string,
  signature: string,
  apiKey: string
): boolean {
  const hash = crypto
    .createHmac('sha256', apiKey)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

/**
 * Process inbound SMS from users
 * Routes by content: RATE=review, PAY=payment, BREAK=maintenance
 */
export function processSMSInbound(
  phoneNumber: string,
  smsContent: string
): {
  type: 'review' | 'payment' | 'maintenance' | 'unknown';
  data: Record<string, any>;
} {
  const content = smsContent.trim().toUpperCase();

  // Check for review submission: "RATE [1-5] [comment]"
  if (content.startsWith('RATE ')) {
    const parts = content.slice(5).split(' ');
    const rating = parseInt(parts[0], 10);
    const comment = parts.slice(1).join(' ');

    if (rating >= 1 && rating <= 5) {
      return {
        type: 'review',
        data: {
          phoneNumber,
          rating,
          comment: comment || '',
          submittedAt: new Date().toISOString()
        }
      };
    }
  }

  // Check for payment request: "PAY [amount]"
  if (content.startsWith('PAY ')) {
    const amount = parseInt(content.slice(4).trim(), 10);
    if (!isNaN(amount) && amount > 0) {
      return {
        type: 'payment',
        data: {
          phoneNumber,
          requestedAmount: amount,
          currency: 'KES',
          requestedAt: new Date().toISOString()
        }
      };
    }
  }

  // Check for maintenance request: "BREAK [description]"
  if (content.startsWith('BREAK ')) {
    const description = content.slice(6).trim();
    return {
      type: 'maintenance',
      data: {
        phoneNumber,
        issueDescription: description || 'Maintenance needed',
        category: 'other',
        reportedAt: new Date().toISOString()
      }
    };
  }

  return {
    type: 'unknown',
    data: {
      phoneNumber,
      originalMessage: smsContent,
      receivedAt: new Date().toISOString()
    }
  };
}

/**
 * Update SMS delivery status based on Africa's Talking callback
 * Maps AT status codes to delivery status
 */
export function updateSMSDeliveryStatus(
  statusCode: string | number
): 'delivered' | 'failed' | 'bounced' | 'pending' {
  const code = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;

  switch (code) {
    case 101:
      return 'delivered';
    case 402:
      return 'bounced';
    default:
      return code >= 0 && code < 100 ? 'pending' : 'failed';
  }
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneE164(phone: string, defaultCountry = 'KE'): string {
  let cleaned = phone.replace(/\D/g, '');

  // Handle country codes
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1); // Kenya by default
  } else if (cleaned.length === 10) {
    cleaned = '254' + cleaned; // Kenya
  } else if (!cleaned.startsWith('1') && cleaned.length === 9) {
    // Assume local without country code
    const countryCode = defaultCountry === 'KE' ? '254' : defaultCountry === 'NG' ? '234' : '256';
    cleaned = countryCode + cleaned;
  }

  return '+' + cleaned;
}
