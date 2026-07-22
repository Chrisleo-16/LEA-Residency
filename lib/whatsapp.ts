// WhatsApp Business Platform (Meta Cloud API) integration.
//
// Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to be set — see
// .env.example for setup notes. Until those are configured, isWhatsAppConfigured()
// returns false and callers should fall back to SMS (see notifyByWhatsAppOrSMS
// in lib/notify.ts).
//
// Business-initiated messages (i.e. anything sent outside a 24h window where
// the recipient messaged us first) MUST use a pre-approved message template —
// free-form text is not allowed by WhatsApp for these. The template names below
// must exist and be APPROVED in Meta Business Manager with a body matching the
// parameter count used at each call site:
//   lea_listing_interest      — "New lead: {{1}} ({{2}}) is interested in your listing \"{{3}}\"."
//   lea_viewing_confirmation  — "Hi {{1}}, your viewing request for {{2}} at {{3}} is received. We'll confirm within 24 hours."
//   lea_viewing_notification  — "New viewing request from {{1}} ({{2}}) for \"{{3}}\" — requested {{4}} at {{5}}."

const WHATSAPP_API_VERSION = 'v20.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const DEFAULT_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'

export const WHATSAPP_TEMPLATES = {
  LISTING_INTEREST: process.env.WHATSAPP_TEMPLATE_LISTING_INTEREST || 'lea_listing_interest',
  VIEWING_CONFIRMATION: process.env.WHATSAPP_TEMPLATE_VIEWING_CONFIRMATION || 'lea_viewing_confirmation',
  VIEWING_NOTIFICATION: process.env.WHATSAPP_TEMPLATE_VIEWING_NOTIFICATION || 'lea_viewing_notification',
} as const

export function isWhatsAppConfigured(): boolean {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN)
}

// Same normalization convention as lib/sms.ts formatPhoneNumber — Cloud API
// wants digits only with country code, no leading '+'.
function toWhatsAppNumber(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  if (clean.startsWith('0')) clean = '254' + clean.substring(1)
  if (!clean.startsWith('254')) clean = '254' + clean
  return clean
}

interface WhatsAppTemplateMessage {
  to: string
  templateName: string
  params: string[]
  languageCode?: string
}

interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  params,
  languageCode = DEFAULT_LANGUAGE,
}: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured' }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toWhatsAppNumber(to),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: params.length
              ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
              : [],
          },
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('[WhatsApp] Send error:', result?.error || result)
      return { success: false, error: result?.error?.message || 'WhatsApp send failed' }
    }

    const messageId = result?.messages?.[0]?.id
    console.log('[WhatsApp] Sent:', messageId)
    return { success: true, messageId }
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
