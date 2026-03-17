import { useEffect, useState, useCallback } from 'react'

export function usePushNotifications() {
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

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
   function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer  // ✅ returns ArrayBuffer not Uint8Array
}
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const granted = notificationPermission === 'granted'
        ? true
        : await requestPermission()

      if (!granted) return false

      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      const existing = await registration.pushManager.getSubscription()
      if (existing) { setIsSubscribed(true); return true }

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
      // TODO: send newSub to your backend to store for server-side push
      setIsSubscribed(true)
      return true
    } catch (error) {
      console.error('[Push] Subscribe error:', error)
      return false
    }
  }, [isSupported, notificationPermission, requestPermission])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { await sub.unsubscribe(); setIsSubscribed(false); return true }
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error)
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

  return {
    notificationPermission,
    isSubscribed,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  }
}

// ✅ Required to convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}