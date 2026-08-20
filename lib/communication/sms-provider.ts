import { sendSMS, formatPhoneNumber } from '../sms'
import { CommunicationProvider, SendResult, TemplateMessage } from './provider'

export class SMSProvider implements CommunicationProvider {
  readonly name = 'sms'
  private username = process.env.AFRICAS_TALKING_USERNAME
  private apiKey = process.env.AFRICAS_TALKING_API_KEY

  isConfigured(): boolean {
    return !!(this.username && this.apiKey)
  }

  normalizeNumber(phone: string): string {
    return formatPhoneNumber(phone)
  }

  async sendMessage(to: string, content: string): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SMS Provider not configured' }
    }
    const result = await sendSMS({ to, message: content })
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    }
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    // SMS doesn't support cloud templates natively. 
    // We render a simple representation or join the variables.
    // Standard notifyByWhatsAppOrSMS in lib/notify.ts already bypasses this 
    // by using sendMessage directly for the SMS fallback.
    const body = `Notification template [${message.templateName}]: ${message.params.join(', ')}`
    return this.sendMessage(message.to, body)
  }
}
