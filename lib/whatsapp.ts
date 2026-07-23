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
//   lea_viewing_notification  — "Hi! You have a new viewing request from {{1}} for your listing \"{{2}}\". They'd like to view it on {{3}}. Reply CONFIRM to accept or CANCEL to decline this request."
//     (originally 5 placeholders — Meta rejected it as too many variables for
//     the message length, so name+phone and date+time are each sent as one
//     combined param instead; see app/api/viewing/route.ts)
//
// Unverified WhatsApp Business Accounts are capped by Meta at a number of
// unique NEW conversations (a business-initiated template send to a customer
// with no message exchanged in the trailing 24h) per rolling 24-hour window.
// whatsapp_conversation_log + WHATSAPP_CONVERSATION_QUOTA below track that
// ourselves so we can fall back to SMS *before* Meta rejects the call, and so
// usage can be reported to the dashboard. Raise WHATSAPP_CONVERSATION_QUOTA
// once Meta grants a higher tier after business verification — no code
// change needed.

import { createClient as createServiceClient } from '@supabase/supabase-js'

const WHATSAPP_API_VERSION = 'v20.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const DEFAULT_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
const CONVERSATION_QUOTA = Number(process.env.WHATSAPP_CONVERSATION_QUOTA) || 250
const ROLLING_WINDOW_HOURS = 24

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

// Exported so the inbound webhook can normalize `from` the same way when
// matching a reply to a profile/phone number on file.
export { toWhatsAppNumber }

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
  quotaExceeded?: boolean
}

interface ConversationReservation {
  allowed: boolean
  isNewConversation: boolean
}

/**
 * Checks whether sending to `phone` right now would open a NEW conversation
 * window, and if so, whether there's still room under the rolling-24h cap.
 * Continuing an already-open window (a prior send to this same recipient in
 * the last 24h) is always allowed — it never counts against the cap, per
 * WhatsApp's own rules.
 */
async function reserveConversationSlot(phone: string): Promise<ConversationReservation> {
  const recipient = toWhatsAppNumber(phone)
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data: existingWindow } = await supabase
    .from('whatsapp_conversation_log')
    .select('id')
    .eq('recipient_phone', recipient)
    .gte('created_at', windowStart)
    .limit(1)
    .maybeSingle()

  if (existingWindow) {
    return { allowed: true, isNewConversation: false }
  }

  const { count } = await supabase
    .from('whatsapp_conversation_log')
    .select('id', { count: 'exact', head: true })
    .eq('is_new_conversation', true)
    .gte('created_at', windowStart)

  return { allowed: (count || 0) < CONVERSATION_QUOTA, isNewConversation: true }
}

async function logConversationAttempt(params: {
  phone: string
  templateName: string
  isNewConversation: boolean
  status: 'sent' | 'failed' | 'skipped_quota'
  messageId?: string
}) {
  try {
    await supabase.from('whatsapp_conversation_log').insert({
      recipient_phone: toWhatsAppNumber(params.phone),
      template_name: params.templateName,
      is_new_conversation: params.isNewConversation,
      status: params.status,
      message_id: params.messageId || null,
    })
  } catch (error) {
    console.error('[WhatsApp] Failed to log conversation attempt:', error)
  }
}

/**
 * Current usage against the rolling-24h cap, for the dashboard.
 */
export async function getWhatsAppQuotaStatus() {
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('whatsapp_conversation_log')
    .select('id', { count: 'exact', head: true })
    .eq('is_new_conversation', true)
    .gte('created_at', windowStart)

  const used = count || 0
  return {
    limit: CONVERSATION_QUOTA,
    used,
    remaining: Math.max(CONVERSATION_QUOTA - used, 0),
    windowHours: ROLLING_WINDOW_HOURS,
    configured: isWhatsAppConfigured(),
  }
}

/**
 * Raw call to the Meta Graph API — no quota accounting. Use sendWhatsAppTemplate
 * below instead; it wraps this with the rolling-24h conversation cap.
 */
async function callWhatsAppApi({
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

/**
 * Sends a WhatsApp template message, enforcing the rolling-24h unique-new-
 * conversation cap first. If sending would exceed the cap, the Meta API is
 * never called — this returns { success: false, quotaExceeded: true } so the
 * caller (see lib/notify.ts) can fall back to SMS immediately instead of
 * waiting on a rejection from Meta.
 */
export async function sendWhatsAppTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured' }
  }

  const reservation = await reserveConversationSlot(message.to)

  if (!reservation.allowed) {
    await logConversationAttempt({
      phone: message.to,
      templateName: message.templateName,
      isNewConversation: true,
      status: 'skipped_quota',
    })
    return { success: false, quotaExceeded: true, error: `Rolling-24h conversation quota (${CONVERSATION_QUOTA}) reached` }
  }

  const result = await callWhatsAppApi(message)

  await logConversationAttempt({
    phone: message.to,
    templateName: message.templateName,
    isNewConversation: reservation.isNewConversation,
    status: result.success ? 'sent' : 'failed',
    messageId: result.messageId,
  })

  return result
}

/**
 * Sends a free-form text reply. Only valid within an open 24h "session" —
 * i.e. in reply to a message the recipient just sent us (see the inbound
 * webhook at app/api/webhooks/whatsapp/route.ts). Meta rejects free-form
 * text outside that window, so this deliberately does NOT go through the
 * conversation-quota machinery above: that quota only governs
 * business-initiated template sends, and a session reply never opens (or
 * counts against) a new-conversation window.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppSendResult> {
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
          type: 'text',
          text: { body },
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('[WhatsApp] Text send error:', result?.error || result)
      return { success: false, error: result?.error?.message || 'WhatsApp send failed' }
    }

    return { success: true, messageId: result?.messages?.[0]?.id }
  } catch (error) {
    console.error('[WhatsApp] Error sending text message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
