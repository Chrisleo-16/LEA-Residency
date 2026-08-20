// Generic Communication Interface
// Allows swapping between Meta, Twilio, or other local providers seamlessly.

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  quotaExceeded?: boolean;
}

export interface TemplateMessage {
  to: string;
  templateName: string;
  params: string[];
  languageCode?: string;
}

export interface CommunicationProvider {
  name: string;
  isConfigured(): boolean;
  normalizeNumber(phone: string): string;
  sendMessage(to: string, content: string): Promise<SendResult>;
  sendTemplate(message: TemplateMessage): Promise<SendResult>;
}
