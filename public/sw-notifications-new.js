// sw-notifications.js
// Custom service worker that combines next-pwa caching with push notifications
// Based on: https://medium.com/@vedantsaraswat_44942/configuring-push-notifications-in-a-pwa-part-1-1b8e9fe2954

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js')

// Workbox configuration for caching
workbox.setConfig({
  debug: false,
})

// Cache Supabase API responses
workbox.routing.registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new workbox.strategies.NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache Google Fonts
workbox.routing.registerRoute(
  /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache static images
workbox.routing.registerRoute(
  /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache JS and CSS
workbox.routing.registerRoute(
  /\.(?:js|css)$/i,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Push notification event listener
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)

  if (!event.data) {
    console.log('[SW] Push event but no data')
    return
  }

  try {
    const data = event.data.json()
    console.log('[SW] Push data:', data)

    const options = {
      body: data.body || 'You have a new message',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      // Add more notification options for better UX
      requireInteraction: false, // Auto-dismiss after a few seconds
      silent: false,
      tag: data.tag || 'lea-notification', // Group similar notifications
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'LEA Executive', options)
    )
  } catch (error) {
    console.error('[SW] Error processing push data:', error)
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('LEA Executive', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      })
    )
  }
})

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event)
  event.notification.close()

  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed')
    return
  }

  const url = event.notification.data?.url || '/dashboard'
  console.log('[SW] Opening URL:', url)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          console.log('[SW] Focusing existing window')
          return client.focus()
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        console.log('[SW] Opening new window')
        return clients.openWindow(url)
      }
    })
  )
})

// Background sync for offline actions (optional enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any offline actions here
      Promise.resolve()
    )
  }
})

// Message event listener for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})