import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  'mailto:cbempirefx@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url: string = '/dashboard'
) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, auth_key, p256dh_key')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!subscriptions?.length) {
    console.log(`[Push] No active subscriptions for user ${userId}`)
    return false
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url,
    timestamp: Date.now(),
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth_key,
              p256dh: sub.p256dh_key,
            },
          },
          payload
        )
        return true
      } catch (error: any) {
        console.error('[Push] Send error:', error.message)
        if (error.statusCode === 410 || error.statusCode === 400) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('endpoint', sub.endpoint)
        }
        return false
      }
    })
  )

  const sent = results.filter(
    r => r.status === 'fulfilled' && r.value
  ).length

  console.log(`[Push] Sent ${sent}/${subscriptions.length} to user ${userId}`)
  return sent > 0
}