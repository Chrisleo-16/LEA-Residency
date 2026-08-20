// WhatsApp Business Platform Integration - Refactored to Provider Interface
// Wraps the active provider (defaults to MetaWhatsAppProvider or SMSProvider based on config).

import { MetaWhatsAppProvider } from './communication/meta-whatsapp'
import { SMSProvider } from './communication/sms-provider'
import { CommunicationProvider } from './communication/provider'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const CONVERSATION_QUOTA = Number(process.env.WHATSAPP_CONVERSATION_QUOTA) || 250
const ROLLING_WINDOW_HOURS = 24

// Provider Registry
const providers: Record<string, CommunicationProvider> = {
  meta_whatsapp: new MetaWhatsAppProvider(),
  sms: new SMSProvider()
}

// Default active provider based on environment variable
const providerKey = process.env.COMMUNICATION_PROVIDER || 'meta_whatsapp'
let activeProvider: CommunicationProvider = providers[providerKey] || providers.meta_whatsapp

export function setCommunicationProvider(provider: CommunicationProvider) {
  activeProvider = provider
}

export function getCommunicationProvider(name?: string): CommunicationProvider {
  if (name && providers[name]) {
    return providers[name]
  }
  return activeProvider
}

export const WHATSAPP_TEMPLATES = {
  LISTING_INTEREST: process.env.WHATSAPP_TEMPLATE_LISTING_INTEREST || 'lea_listing_interest',
  VIEWING_CONFIRMATION: process.env.WHATSAPP_TEMPLATE_VIEWING_CONFIRMATION || 'lea_viewing_confirmation',
  VIEWING_NOTIFICATION: process.env.WHATSAPP_TEMPLATE_VIEWING_NOTIFICATION || 'lea_viewing_notification',
} as const

export function isWhatsAppConfigured(): boolean {
  return activeProvider.isConfigured()
}

export function toWhatsAppNumber(phone: string): string {
  return activeProvider.normalizeNumber(phone)
}

export async function sendWhatsAppTemplate(message: {
  to: string
  templateName: string
  params: string[]
  languageCode?: string
}) {
  return activeProvider.sendTemplate(message)
}

export async function sendWhatsAppText(to: string, body: string) {
  return activeProvider.sendMessage(to, body)
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
