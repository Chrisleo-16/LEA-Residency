import { CommunicationProvider, SendResult, TemplateMessage } from './provider'

// Template mapping for in-app rendering (OpenWA does not enforce Meta's templates,
// so we render them locally and send them as standard free-form text messages).
const TEMPLATE_MAPPINGS: Record<string, string> = {
  lea_listing_interest: 'New lead: {{0}} ({{1}}) is interested in your listing "{{2}}".',
  lea_viewing_confirmation: 'Hi {{0}}, your viewing request for {{1}} at {{2}} is received. We\'ll confirm within 24 hours.',
  lea_viewing_notification: 'Hi! You have a new viewing request from {{0}} for your listing "{{1}}". They\'d like to view it on {{2}}. Reply CONFIRM to accept or CANCEL to decline this request.'
}

export class OpenWAProvider implements CommunicationProvider {
  readonly name = 'open_wa'
  private apiUrl = process.env.OPEN_WA_API_URL || 'http://localhost:8080'
  private apiKey = process.env.OPEN_WA_API_KEY

  isConfigured(): boolean {
    // OpenWA is active if a gateway URL is provided
    return !!this.apiUrl
  }

  normalizeNumber(phone: string): string {
    // OpenWA wants subscriber format with @c.us or just digits with country code.
    // We normalize to digits only with country code first (e.g. 254700123456).
    let clean = phone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = '254' + clean.substring(1)
    if (!clean.startsWith('254')) clean = '254' + clean
    return clean
  }

  async sendMessage(to: string, content: string): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OpenWA Provider not configured' }
    }

    const formattedTo = this.normalizeNumber(to)

    try {
      // Standard open-wa gateway HTTP POST request
      const response = await fetch(`${this.apiUrl}/api/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          to: `${formattedTo}@c.us`,
          content: content
        })
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error('[OpenWAProvider] Send error:', result)
        return { success: false, error: result?.message || 'OpenWA send failed' }
      }

      return { success: true, messageId: result?.response || result?.messageId }
    } catch (error) {
      console.error('[OpenWAProvider] Error sending message:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    // Render the template locally to text
    const textBody = this.renderTemplateLocal(message.templateName, message.params)
    return this.sendMessage(message.to, textBody)
  }

  private renderTemplateLocal(templateName: string, params: string[]): string {
    const template = TEMPLATE_MAPPINGS[templateName]
    if (!template) {
      return `Notification [${templateName}]: ${params.join(', ')}`
    }
    
    let rendered = template
    params.forEach((param, index) => {
      rendered = rendered.replace(`{{${index}}}`, param)
    })
    return rendered
  }
}
