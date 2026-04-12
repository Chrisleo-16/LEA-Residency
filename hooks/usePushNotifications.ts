import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function usePushNotifications() {
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // ✅ Check support on mount
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setIsSupported(supported)

    if (!supported) return

    setNotificationPermission(Notification.permission)

    // Check existing subscription
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    })

    // Listen for SW messages
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        console.log('[Push] Notification received:', event.data.payload)
      }
    })
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission === 'granted'
    } catch (error) {
      console.error('[Push] Permission error:', error)
      return false
    }
  }, [isSupported])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    setIsLoading(true)
    try {
      const granted = notificationPermission === 'granted'
        ? true
        : await requestPermission()

      if (!granted) return false

      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        setIsSubscribed(true)
        return true
      }

      // ✅ VAPID key must be set in .env as NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidKey) {
        console.warn('[Push] VAPID key missing — using local notifications only')
        setIsSubscribed(true)
        return true
      }

      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      console.log('[Push] Subscribed:', JSON.stringify(newSub))

      // ✅ Send subscription to backend for server-side push
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('[Push] No auth session - subscription not saved to backend')
        setIsSubscribed(true)
        return true
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(newSub.toJSON()),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[Push] Failed to save subscription:', error)
        // Still mark as subscribed for local notifications
      } else {
        console.log('[Push] Subscription saved to backend')
      }

      setIsSubscribed(true)
      return true
    } catch (error) {
      console.error('[Push] Subscribe error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, notificationPermission, requestPermission])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        setIsSubscribed(false)
        return true
      }
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error)
    } finally {
      setIsLoading(false)
    }
    return false
  }, [isSupported])

  // ✅ Show notification directly via service worker
  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ) => {
    if (!isSupported) return

    const granted = notificationPermission === 'granted'
      ? true
      : await requestPermission()

    if (!granted) return

    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    })
  }, [isSupported, notificationPermission, requestPermission])

  // ✅ Test notification function
  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('[Push] No auth session for test notification')
        return false
      }

      const response = await fetch('/api/push/send', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      return result.success || false
    } catch (error) {
      console.error('[Push] Test notification error:', error)
      return false
    }
  }, [isSupported])

  return {
    notificationPermission,
    isSubscribed,
    isSupported,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    testNotification,
  }
}