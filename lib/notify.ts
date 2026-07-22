// Shared "try WhatsApp, fall back to SMS" helper for automated system
// notifications (as opposed to the tenant-initiated wa.me deep links, which
// need no backend integration at all). Until WHATSAPP_PHONE_NUMBER_ID /
// WHATSAPP_ACCESS_TOKEN are configured, this always falls straight through
// to SMS — see lib/whatsapp.ts for setup notes.

import { sendWhatsAppTemplate, isWhatsAppConfigured } from './whatsapp'
import { sendSMS, formatPhoneNumber } from './sms'

interface NotifyParams {
  phone: string
  whatsappTemplate: string
  whatsappParams: string[]
  smsMessage: string
}

interface NotifyResult {
  success: boolean
  channel: 'whatsapp' | 'sms'
  error?: string
}

export async function notifyByWhatsAppOrSMS({
  phone,
  whatsappTemplate,
  whatsappParams,
  smsMessage,
}: NotifyParams): Promise<NotifyResult> {
  if (isWhatsAppConfigured()) {
    const waResult = await sendWhatsAppTemplate({ to: phone, templateName: whatsappTemplate, params: whatsappParams })
    if (waResult.success) {
      return { success: true, channel: 'whatsapp' }
    }
    console.warn('[Notify] WhatsApp failed, falling back to SMS:', waResult.error)
  }

  const smsResult = await sendSMS({ to: formatPhoneNumber(phone), message: smsMessage })
  return { success: smsResult.success, channel: 'sms', error: smsResult.success ? undefined : smsResult.error }
}
