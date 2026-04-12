import { useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, TestTube, Send } from 'lucide-react'

export function PushNotificationTest() {
  const {
    notificationPermission,
    isSubscribed,
    isSupported,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
  } = usePushNotifications()

  const [testResult, setTestResult] = useState<string>('')

  const handleTestNotification = async () => {
    setTestResult('Sending test notification...')
    const success = await testNotification()
    setTestResult(success ? '✅ Test notification sent!' : '❌ Failed to send test notification')
  }

  const handleSendNotification = async () => {
    if (!isSubscribed) return

    setTestResult('Sending notification via API...')
    try {
      const { data: { session } } = await import('@supabase/supabase-js').then(
        ({ createClient }) => createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ).auth.getSession()
      )

      if (!session?.access_token) {
        setTestResult('❌ Not authenticated')
        return
      }

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: 'Test from LEA',
          body: 'This is a test push notification sent via API!',
          url: '/dashboard',
        }),
      })

      const result = await response.json()
      setTestResult(result.success ? `✅ Sent to ${result.sent} device(s)!` : '❌ Failed to send')
    } catch (error) {
      setTestResult('❌ Error sending notification')
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications Test
        </CardTitle>
        <CardDescription>
          Test push notification functionality for LEA Executive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span>Permission:</span>
          <Badge variant={
            notificationPermission === 'granted' ? 'default' :
            notificationPermission === 'denied' ? 'destructive' : 'secondary'
          }>
            {notificationPermission}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span>Subscription:</span>
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          {notificationPermission !== 'granted' && (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              variant="outline"
            >
              Request Permission
            </Button>
          )}

          {!isSubscribed && notificationPermission === 'granted' && (
            <Button
              onClick={subscribe}
              disabled={isLoading}
            >
              Subscribe to Push
            </Button>
          )}

          {isSubscribed && (
            <Button
              onClick={unsubscribe}
              disabled={isLoading}
              variant="outline"
            >
              Unsubscribe
            </Button>
          )}

          <Button
            onClick={handleTestNotification}
            disabled={!isSubscribed || isLoading}
            variant="secondary"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Local Notification
          </Button>

          <Button
            onClick={handleSendNotification}
            disabled={!isSubscribed || isLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Test Push via API
          </Button>
        </div>

        {testResult && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">{testResult}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>How it works:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Request notification permission from browser</li>
            <li>Subscribe to push service with VAPID keys</li>
            <li>Save subscription to database via API</li>
            <li>Send push notifications from server using web-push library</li>
            <li>Service worker handles incoming push messages</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

