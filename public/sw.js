// sw.js
// Enhanced service worker with push notifications and caching for LEA Executive Residency
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

// Enhanced push notification event listener
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)

  if (!event.data) {
    console.log('[SW] Push event but no data')
    return
  }

  try {
    const data = event.data.json()
    console.log('[SW] Push data:', data)

    // Enhanced notification options based on message type
    const isMessage = data.type === 'message' || data.senderName
    const options = {
      body: data.body || 'You have a new message',
      icon: '/placeholder-logo.png',
      badge: '/placeholder-logo.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
        timestamp: Date.now(),
        messageId: data.messageId || null,
        senderId: data.senderId || null,
        chatId: data.chatId || null,
        type: data.type || 'general'
      },
      actions: isMessage ? [
        { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
        { action: 'mark-read', title: 'Mark as read', icon: '/icons/check.png' },
        { action: 'open', title: 'Open Chat', icon: '/icons/chat.png' }
      ] : [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      // Enhanced notification options
      requireInteraction: isMessage, // Keep message notifications visible
      silent: false,
      tag: data.tag || (isMessage ? `message-${data.chatId}` : 'lea-notification'),
      renotify: true, // Renotify if tag is same
      timestamp: Date.now(),
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'LEA Executive', options)
    )
  } catch (error) {
    console.error('[SW] Error processing push data:', error)
    // Fallback notification with error handling
    event.waitUntil(
      self.registration.showNotification('LEA Executive', {
        body: 'You have a new notification',
        icon: '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
        tag: 'lea-fallback',
      })
    )
  }
})

// Enhanced notification click event listener with reply support
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event)
  const notification = event.notification
  const data = notification.data || {}
  
  notification.close()

  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed')
    return
  }

  // Handle reply action
  if (event.action === 'reply') {
    console.log('[SW] Reply action triggered')
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is open, focus and trigger reply mode
        for (const client of clientList) {
          if (client.url.includes('/dashboard') || client.url.includes('/chat')) {
            console.log('[SW] Focusing existing chat window')
            return client.focus().then(() => {
              // Send message to client to open reply dialog
              client.postMessage({
                type: 'OPEN_REPLY_DIALOG',
                messageId: data.messageId,
                senderId: data.senderId,
                chatId: data.chatId,
                notificationTitle: notification.title,
                notificationBody: notification.body
              })
            })
          }
        }
        
        // If app is closed, open with reply mode
        if (clients.openWindow) {
          const replyUrl = `/dashboard?tab=chat&reply=true&messageId=${data.messageId}&chatId=${data.chatId}&senderId=${data.senderId}`
          console.log('[SW] Opening chat with reply mode:', replyUrl)
          return clients.openWindow(replyUrl)
        }
      })
    )
    return
  }

  // Handle mark as read action
  if (event.action === 'mark-read') {
    console.log('[SW] Mark as read action triggered')
    event.waitUntil(
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: data.messageId,
          chatId: data.chatId
        })
      }).then(response => {
        if (response.ok) {
          console.log('[SW] Message marked as read')
        } else {
          console.error('[SW] Failed to mark message as read')
        }
      }).catch(error => {
        console.error('[SW] Error marking message as read:', error)
      })
    )
    return
  }

  // Handle open chat action
  if (event.action === 'open' && data.type === 'message') {
    console.log('[SW] Open chat action triggered')
    const chatUrl = `/dashboard?tab=chat&chatId=${data.chatId}`
    console.log('[SW] Opening chat:', chatUrl)
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is open, navigate to chat
        for (const client of clientList) {
          if (client.url.includes('/dashboard')) {
            console.log('[SW] Navigating existing window to chat')
            return client.focus().then(() => {
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                chatId: data.chatId,
                messageId: data.messageId
              })
            })
          }
        }
        
        // If app is closed, open to chat
        if (clients.openWindow) {
          return clients.openWindow(chatUrl)
        }
      })
    )
    return
  }

  // Default open action
  const url = data.url || '/dashboard'
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

// Notification close event listener (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event)
  // You can add analytics here if needed
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any offline actions here
      Promise.resolve()
    )
  }
})

// Enhanced message event listener for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  // Handle custom messages
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' })
  }
})

// Install event listener
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing')
  event.waitUntil(self.skipWaiting())
})

// Activate event listener
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating')
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[SW] Clients claimed')
    })
  )
})
