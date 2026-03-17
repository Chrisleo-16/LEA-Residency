import { useEffect, useState } from 'react'

export function usePushNotifications() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('[v0] Notifications not supported')
      return
    }

    setNotificationPermission(Notification.permission)

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'NOTIFICATION_RECEIVED') {
          console.log('[v0] Notification received:', event.data.payload)
        }
      })
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.error('[v0] Notifications not supported')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission === 'granted'
    } catch (error) {
      console.error('[v0] Error requesting notification permission:', error)
      return false
    }
  }

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('[v0] Push notifications not supported')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        setIsSubscribed(true)
        return true
      }

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // In production, send subscription to backend
      console.log('[v0] Push subscription created:', newSubscription)
      setIsSubscribed(true)
      return true
    } catch (error) {
      console.error('[v0] Error subscribing to push notifications:', error)
      return false
    }
  }

  const unsubscribe = async () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        setIsSubscribed(false)
        return true
      }
    } catch (error) {
      console.error('[v0] Error unsubscribing from push notifications:', error)
    }
    return false
  }

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (notificationPermission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
    } else {
      new Notification(title, options)
    }
  }

  return {
    notificationPermission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  }
}
