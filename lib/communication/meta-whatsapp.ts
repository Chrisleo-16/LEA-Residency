import { createClient as createServiceClient } from '@supabase/supabase-js'
import { CommunicationProvider, SendResult, TemplateMessage } from './provider'

const WHATSAPP_API_VERSION = 'v20.0'
const ROLLING_WINDOW_HOURS = 24

export class MetaWhatsAppProvider implements CommunicationProvider {
  readonly name = 'meta_whatsapp'
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  private accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  private defaultLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
  private conversationQuota = Number(process.env.WHATSAPP_CONVERSATION_QUOTA) || 250

  private supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken)
  }

  normalizeNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = '254' + clean.substring(1)
    if (!clean.startsWith('254')) clean = '254' + clean
    return clean
  }

  async sendMessage(to: string, content: string): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Meta WhatsApp Provider not configured' }
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.normalizeNumber(to),
            type: 'text',
            text: { body: content },
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error('[MetaWhatsAppProvider] Text send error:', result?.error || result)
        return { success: false, error: result?.error?.message || 'WhatsApp send failed' }
      }

      return { success: true, messageId: result?.messages?.[0]?.id }
    } catch (error) {
      console.error('[MetaWhatsAppProvider] Error sending text message:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Meta WhatsApp Provider not configured' }
    }

    const reservation = await this.reserveConversationSlot(message.to)

    if (!reservation.allowed) {
      await this.logConversationAttempt({
        phone: message.to,
        templateName: message.templateName,
        isNewConversation: true,
        status: 'skipped_quota',
      })
      return {
        success: false,
        quotaExceeded: true,
        error: `Rolling-24h conversation quota (${this.conversationQuota}) reached`,
      }
    }

    const result = await this.callWhatsAppApi(message)

    await this.logConversationAttempt({
      phone: message.to,
      templateName: message.templateName,
      isNewConversation: reservation.isNewConversation,
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId,
    })

    return result
  }

  /**
   * Checks whether sending to `phone` right now would open a NEW conversation
   * window, and if so, whether there's still room under the rolling-24h cap.
   */
  private async reserveConversationSlot(phone: string): Promise<{ allowed: boolean; isNewConversation: boolean }> {
    const recipient = this.normalizeNumber(phone)
    const windowStart = new Date(Date.now() - ROLLING_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

    const { data: existingWindow } = await this.supabase
      .from('whatsapp_conversation_log')
      .select('id')
      .eq('recipient_phone', recipient)
      .gte('created_at', windowStart)
      .limit(1)
      .maybeSingle()

    if (existingWindow) {
      return { allowed: true, isNewConversation: false }
    }

    const { count } = await this.supabase
      .from('whatsapp_conversation_log')
      .select('id', { count: 'exact', head: true })
      .eq('is_new_conversation', true)
      .gte('created_at', windowStart)

    return { allowed: (count || 0) < this.conversationQuota, isNewConversation: true }
  }

  private async logConversationAttempt(params: {
    phone: string
    templateName: string
    isNewConversation: boolean
    status: 'sent' | 'failed' | 'skipped_quota'
    messageId?: string
  }) {
    try {
      await this.supabase.from('whatsapp_conversation_log').insert({
        recipient_phone: this.normalizeNumber(params.phone),
        template_name: params.templateName,
        is_new_conversation: params.isNewConversation,
        status: params.status,
        message_id: params.messageId || null,
      })
    } catch (error) {
      console.error('[MetaWhatsAppProvider] Failed to log conversation attempt:', error)
    }
  }

  private async callWhatsAppApi(message: TemplateMessage): Promise<SendResult> {
    const languageCode = message.languageCode || this.defaultLanguage

    try {
      const response = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.normalizeNumber(message.to),
            type: 'template',
            template: {
              name: message.templateName,
              language: { code: languageCode },
              components: message.params.length
                ? [{ type: 'body', parameters: message.params.map((text) => ({ type: 'text', text })) }]
                : [],
            },
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error('[MetaWhatsAppProvider] Template send error:', result?.error || result)
        return { success: false, error: result?.error?.message || 'WhatsApp template send failed' }
      }

      const messageId = result?.messages?.[0]?.id
      return { success: true, messageId }
    } catch (error) {
      console.error('[MetaWhatsAppProvider] Error sending template message:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
