/**
 * SMS Message Templates & Template Engine
 * Production-ready localized message generation
 */

interface MessageContext {
  [key: string]: string | number | Date;
}

/**
 * Message template with interpolation support
 */
class MessageTemplate {
  private template: string;
  private country: 'KE' | 'NG' | 'UG' | 'TZ' | 'GH';

  constructor(template: string, country: 'KE' | 'NG' | 'UG' | 'TZ' | 'GH' = 'KE') {
    this.template = template;
    this.country = country;
  }

  /**
   * Render template with context
   */
  render(context: MessageContext): string {
    let message = this.template;

    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`;
      const stringValue = this.formatValue(value);
      message = message.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return message;
  }

  private formatValue(value: string | number | Date): string {
    if (value instanceof Date) {
      return value.toLocaleDateString(this.country === 'KE' ? 'en-KE' : 'en-NG');
    }
    if (typeof value === 'number') {
      if (value > 100) {
        // Likely currency
        return this.formatCurrency(value);
      }
      return value.toString();
    }
    return String(value);
  }

  private formatCurrency(amount: number): string {
    const currencyCode = {
      KE: 'KES',
      NG: 'NGN',
      UG: 'UGX',
      TZ: 'TZS',
      GH: 'GHS'
    }[this.country] || 'KES';

    return `${amount.toLocaleString()} ${currencyCode}`;
  }
}

/**
 * SMS Message Templates Library
 */
export const SMS_TEMPLATES = {
  // PAYMENT NOTIFICATIONS
  PAYMENT_CONFIRMATION: {
    KE: new MessageTemplate(
      'LEA: Payment of {{amount}} received for {{propertyRef}}, {{date}}. Receipt: {{deepLink}}'
    ),
    NG: new MessageTemplate(
      'LEA: Received {{amount}} payment for {{propertyRef}} on {{date}}. View receipt: {{deepLink}}'
    ),
    UG: new MessageTemplate(
      'LEA: {{amount}} payment recorded for {{propertyRef}}, {{date}}. Receipt: {{deepLink}}'
    )
  },

  PAYMENT_OVERDUE_ALERT: {
    KE: new MessageTemplate(
      '⚠️ Rent reminder: {{amount}} for {{propertyRef}} was due {{daysOverdue}} days ago. Pay now: {{deepLink}}'
    ),
    NG: new MessageTemplate(
      '⚠️ Your rent of {{amount}} for {{propertyRef}} is {{daysOverdue}} days overdue. Reply HELP for assistance.'
    ),
    UG: new MessageTemplate(
      '⚠️ Payment overdue: {{amount}} for {{propertyRef}}. Please pay immediately to avoid penalties.'
    )
  },

  PAYMENT_REMINDER: {
    KE: new MessageTemplate(
      'Reminder: {{amount}} rent due on {{dueDate}} for {{propertyRef}}. Pay via: {{deepLink}}'
    ),
    NG: new MessageTemplate(
      'Rent due: {{amount}} for {{propertyRef}} on {{dueDate}}. Pay here: {{deepLink}}'
    ),
    UG: new MessageTemplate(
      'Your rent of {{amount}} is due {{dueDate}}. {{propertyRef}}. Reply HELP for support.'
    )
  },

  PAYMENT_FAILURE: {
    KE: new MessageTemplate(
      'Payment failed: {{amount}} for {{propertyRef}}. Try again: {{deepLink}} or contact support.'
    ),
    NG: new MessageTemplate(
      'Payment error for {{propertyRef}}. Amount: {{amount}}. Try again: {{deepLink}}'
    ),
    UG: new MessageTemplate(
      'Payment unsuccessful for {{propertyRef}}. Please retry: {{deepLink}}'
    )
  },

  // MAINTENANCE NOTIFICATIONS
  MAINTENANCE_CONFIRMATION: {
    KE: new MessageTemplate(
      'LEA: Maintenance request for {{issueTitle}} received. Ref: {{ticketId}}. Updates via {{deepLink}}'
    ),
    NG: new MessageTemplate(
      'Your maintenance request ({{issueTitle}}) has been received. Ticket: {{ticketId}}'
    ),
    UG: new MessageTemplate(
      'Maintenance reported: {{issueTitle}}. Ticket: {{ticketId}}. You will be updated at {{deepLink}}'
    )
  },

  MAINTENANCE_ASSIGNED: {
    KE: new MessageTemplate(
      '🔧 Contractor assigned to {{issueTitle}}. Expected: {{expectedDate}}. Ref: {{ticketId}}'
    ),
    NG: new MessageTemplate(
      'Contractor assigned to fix {{issueTitle}}. Expected completion: {{expectedDate}}'
    ),
    UG: new MessageTemplate(
      'Contractor assigned - {{issueTitle}}. Expected: {{expectedDate}}. Ticket: {{ticketId}}'
    )
  },

  MAINTENANCE_COMPLETE: {
    KE: new MessageTemplate(
      '✓ {{issueTitle}} completed. Cost: {{actualCost}}. Rate contractor: {{deepLink}}'
    ),
    NG: new MessageTemplate(
      'Maintenance completed for {{issueTitle}}. Cost: {{actualCost}}. Thank you!'
    ),
    UG: new MessageTemplate(
      'Issue fixed: {{issueTitle}}. Cost: {{actualCost}}. Give feedback: {{deepLink}}'
    )
  },

  // BOOKING NOTIFICATIONS
  BOOKING_CONFIRMATION: {
    KE: new MessageTemplate(
      'LEA Booking: {{guestName}} checking in {{checkInDate}}. {{nightsCount}} nights at {{propertyRef}}. Ref: {{bookingRef}}'
    ),
    NG: new MessageTemplate(
      'Booking confirmed: {{guestName}}, {{nightsCount}} nights starting {{checkInDate}}. Booking: {{bookingRef}}'
    ),
    UG: new MessageTemplate(
      'Guest {{guestName}} booked {{nightsCount}} nights from {{checkInDate}}. Ref: {{bookingRef}}'
    )
  },

  BOOKING_CANCELLED: {
    KE: new MessageTemplate(
      'Booking cancelled: {{guestName}}, {{checkInDate}}. Refund: {{refundAmount}}. Ref: {{bookingRef}}'
    ),
    NG: new MessageTemplate(
      'Booking cancellation: {{guestName}} cancelled for {{checkInDate}}. Refund: {{refundAmount}}'
    ),
    UG: new MessageTemplate(
      '❌ Booking cancelled - {{guestName}}, {{checkInDate}}. Refund: {{refundAmount}}'
    )
  },

  GUEST_CHECKIN_REMINDER: {
    KE: new MessageTemplate(
      'Checking in today? {{propertyRef}}, {{checkInDate}}. Check-in code: {{checkinCode}}'
    ),
    NG: new MessageTemplate(
      'Check-in reminder for {{propertyRef}} today. Your code: {{checkinCode}}'
    ),
    UG: new MessageTemplate(
      'Today is check-in day for {{propertyRef}}. Code: {{checkinCode}}'
    )
  },

  // REVIEW REQUESTS
  REVIEW_REQUEST: {
    KE: new MessageTemplate(
      'How was your stay at {{propertyRef}}? Reply RATE [1-5] [comment] or {{deepLink}}'
    ),
    NG: new MessageTemplate(
      'Rate your stay at {{propertyRef}}: RATE [1-5] or visit {{deepLink}}'
    ),
    UG: new MessageTemplate(
      'Please review {{propertyRef}}. Text RATE [score] or visit {{deepLink}}'
    )
  },

  // MOVE-IN/OUT INSPECTIONS
  INSPECTION_SCHEDULED: {
    KE: new MessageTemplate(
      'Move-in inspection scheduled {{inspectionDate}} at {{propertyRef}}. Contact: {{inspectorPhone}}'
    ),
    NG: new MessageTemplate(
      'Inspection on {{inspectionDate}} for {{propertyRef}}. Inspector: {{inspectorName}}'
    ),
    UG: new MessageTemplate(
      'Inspection: {{inspectionDate}} at {{propertyRef}}. Inspector will call {{inspectorPhone}}'
    )
  },

  INSPECTION_REPORT_READY: {
    KE: new MessageTemplate(
      'Inspection report ready: {{propertyRef}}. View report: {{deepLink}}'
    ),
    NG: new MessageTemplate(
      'Your inspection report is ready for {{propertyRef}}: {{deepLink}}'
    ),
    UG: new MessageTemplate(
      '📄 Inspection report complete: {{propertyRef}}. Download: {{deepLink}}'
    )
  },

  // VERIFICATION
  VERIFICATION_OTP: {
    KE: new MessageTemplate(
      'LEA verification code: {{otp}}. Valid for 10 minutes. Do not share!'
    ),
    NG: new MessageTemplate(
      'LEA: Your verification code is {{otp}} (10 min expiry). Keep it secret!'
    ),
    UG: new MessageTemplate(
      'Verification: {{otp}} (expires in 10 mins). Don\'t share this code.'
    )
  },

  VERIFICATION_FAILED: {
    KE: new MessageTemplate(
      'Verification failed. Try again at {{deepLink}} or contact support.'
    ),
    NG: new MessageTemplate(
      'Verification unsuccessful. Retry: {{deepLink}}'
    ),
    UG: new MessageTemplate(
      'Verification failed. Please try again: {{deepLink}}'
    )
  }
};

/**
 * Message builder with context validation
 */
export class MessageBuilder {
  private templateKey: string;
  private country: 'KE' | 'NG' | 'UG' | 'TZ' | 'GH';
  private context: MessageContext = {};
  private templateMap: Record<string, any> = SMS_TEMPLATES;

  constructor(templateKey: string, country: 'KE' | 'NG' | 'UG' | 'TZ' | 'GH' = 'KE') {
    this.templateKey = templateKey;
    this.country = country;
  }

  /**
   * Add context variable
   */
  with(key: string, value: string | number | Date): this {
    this.context[key] = value;
    return this;
  }

  /**
   * Build final message
   */
  build(): string {
    const templateGroup = this.templateMap[this.templateKey];
    if (!templateGroup) {
      throw new Error(`Template not found: ${this.templateKey}`);
    }

    const template = templateGroup[this.country] || Object.values(templateGroup)[0];
    if (!template) {
      throw new Error(`No template available for ${this.templateKey}`);
    }

    return template.render(this.context);
  }

  /**
   * Build and validate character count (SMS limit is 160)
   */
  buildValidated(): { message: string; characterCount: number; segments: number } {
    const message = this.build();
    const characterCount = message.length;
    const segments = Math.ceil(characterCount / 160);

    if (characterCount > 459) {
      // Max concatenated SMS is 3 * 160 - 7 (for header) = 473, but use 459 for safety
      console.warn(
        `Message exceeds SMS limit (${characterCount} chars, ${segments} segments). Consider shortening.`
      );
    }

    return { message, characterCount, segments };
  }
}

/**
 * Create message from shorthand
 */
export function createMessage(
  templateKey: string,
  context: MessageContext,
  country: 'KE' | 'NG' | 'UG' | 'TZ' | 'GH' = 'KE'
): string {
  const builder = new MessageBuilder(templateKey, country);
  for (const [key, value] of Object.entries(context)) {
    builder.with(key, value);
  }
  return builder.build();
}

export default SMS_TEMPLATES;
