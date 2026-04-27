// lib/notifications.ts
// Notification permission and subscription management for LEA Executive Residency

export interface NotificationPermissionStatus {
  permission: NotificationPermission
  canRequest: boolean
  isGranted: boolean
  isDenied: boolean
  isDefault: boolean
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class NotificationManager {
  private static instance: NotificationManager
  private vapidPublicKey: string = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  // Check current notification permission status
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (!('Notification' in window)) {
      return {
        permission: 'denied',
        canRequest: false,
        isGranted: false,
        isDenied: true,
        isDefault: false
      }
    }

    const permission = await Notification.requestPermission()
    
    return {
      permission,
      canRequest: permission === 'default',
      isGranted: permission === 'granted',
      isDenied: permission === 'denied',
      isDefault: permission === 'default'
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications')
    }

    const permission = await Notification.requestPermission()
    
    return {
      permission,
      canRequest: permission === 'default',
      isGranted: permission === 'granted',
      isDenied: permission === 'denied',
      isDefault: permission === 'default'
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported')
    }

    const registration = await navigator.serviceWorker.ready
    const existingSubscription = await registration.pushManager.getSubscription()

    if (existingSubscription) {
      return existingSubscription.toJSON() as PushSubscription
    }

    if (!this.vapidPublicKey) {
      throw new Error('VAPID public key is not configured')
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as any
      })

      return subscription.toJSON() as PushSubscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      try {
        await subscription.unsubscribe()
        return true
      } catch (error) {
        console.error('Failed to unsubscribe from push notifications:', error)
        return false
      }
    }

    return true
  }

  // Show a local notification (for testing)
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    const status = await this.getPermissionStatus()
    
    if (!status.isGranted) {
      throw new Error('Notification permission not granted')
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        icon: '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
        ...options
      })
    } else {
      new Notification(title, {
        icon: '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
        ...options
      })
    }
  }

  // Get current push subscription
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    return subscription ? subscription.toJSON() as PushSubscription : null
  }

  // Helper method to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  // Check if notifications are supported
  static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  }

  // Get browser-specific instructions for enabling notifications
  getBrowserInstructions(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('chrome')) {
      return 'Click the lock icon in the address bar, then set Notifications to "Allow"'
    } else if (userAgent.includes('firefox')) {
      return 'Click the lock icon in the address bar, then set Notifications to "Allow"'
    } else if (userAgent.includes('safari')) {
      return 'Go to Safari > Preferences > Websites > Notifications and allow this site'
    } else if (userAgent.includes('edge')) {
      return 'Click the lock icon in the address bar, then set Notifications to "Allow"'
    }
    
    return 'Check your browser settings to enable notifications for this site'
  }
}

export const notificationManager = NotificationManager.getInstance()
