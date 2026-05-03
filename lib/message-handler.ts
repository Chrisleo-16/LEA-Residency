// lib/message-handler.ts
// Client-side message handler for service worker communication

export interface MessageNotification {
  messageId: string
  senderId: string
  chatId: string
  senderName: string
  message: string
  timestamp: string
}

export interface ReplyDialogData {
  messageId: string
  senderId: string
  chatId: string
  notificationTitle: string
  notificationBody: string
}

export class MessageHandler {
  private static instance: MessageHandler
  private onReplyDialogOpen?: (data: ReplyDialogData) => void
  private onNavigateToChat?: (chatId: string, messageId?: string) => void

  static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler()
    }
    return MessageHandler.instance
  }

  // Set up service worker message listener
  setupMessageListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[MessageHandler] Received message from SW:', event.data)
        
        switch (event.data.type) {
          case 'OPEN_REPLY_DIALOG':
            this.handleOpenReplyDialog(event.data)
            break
          case 'NAVIGATE_TO_CHAT':
            this.handleNavigateToChat(event.data)
            break
        }
      })
    }
  }

  // Handle reply dialog opening
  private handleOpenReplyDialog(data: ReplyDialogData) {
    console.log('[MessageHandler] Opening reply dialog:', data)
    this.onReplyDialogOpen?.(data)
  }

  // Handle navigation to chat
  private handleNavigateToChat(data: { chatId: string; messageId?: string }) {
    console.log('[MessageHandler] Navigating to chat:', data)
    this.onNavigateToChat?.(data.chatId, data.messageId)
  }

  // Register callbacks
  onReplyDialog(callback: (data: ReplyDialogData) => void) {
    this.onReplyDialogOpen = callback
  }

  onNavigate(callback: (chatId: string, messageId?: string) => void) {
    this.onNavigateToChat = callback
  }

  // Send message to service worker
  sendMessageToSW(message: any) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage(message)
      })
    }
  }

  // Show a test notification (for development)
  async showTestNotification(notification: MessageNotification) {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      
      await registration.showNotification(`New message from ${notification.senderName}`, {
        body: notification.message,
        icon: '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
        tag: `message-${notification.chatId}`,
        requireInteraction: true,
        data: {
          messageId: notification.messageId,
          senderId: notification.senderId,
          chatId: notification.chatId,
          type: 'message',
          url: `/dashboard?tab=chat&chatId=${notification.chatId}`
        }
      } as NotificationOptions & {
        actions: Array<{ action: string; title: string }>
      })
    }
  }

  // Send a push notification (backend simulation)
  async simulatePushNotification(notification: MessageNotification) {
    // In a real app, this would be sent from your backend
    // For development, we'll trigger it locally
    console.log('[MessageHandler] Simulating push notification:', notification)
    
    // Check if we have permission
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      await this.showTestNotification(notification)
    } else {
      console.warn('[MessageHandler] Notification permission not granted')
    }
  }
}

export const messageHandler = MessageHandler.getInstance()
