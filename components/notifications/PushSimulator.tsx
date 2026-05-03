'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  MessageSquare,
  Smartphone,
  Settings
} from 'lucide-react'
import { messageHandler } from '@/lib/message-handler'

export default function PushSimulator() {
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null)
  const [testMessage, setTestMessage] = useState({
    senderName: 'John Doe',
    message: 'Hey, can we discuss the rent payment?',
    chatId: 'chat-123',
    messageId: 'msg-' + Date.now()
  })

  const sendTestNotification = async () => {
    setIsSending(true)
    setLastResult(null)
    
    try {
      console.log('[PushSimulator] Sending test notification:', testMessage)
      
      // Test 1: Direct notification (simulates push)
      await messageHandler.showTestNotification({
        messageId: testMessage.messageId,
        senderId: 'sender-123',
        chatId: testMessage.chatId,
        senderName: testMessage.senderName,
        message: testMessage.message,
        timestamp: new Date().toISOString()
      })
      
      // Test 2: Service worker direct notification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(`New message from ${testMessage.senderName}`, {
          body: testMessage.message,
          icon: '/placeholder-logo.png',
          badge: '/placeholder-logo.png',
          tag: `message-${testMessage.chatId}`,
          requireInteraction: true,
          data: {
            messageId: testMessage.messageId,
            senderId: 'sender-123',
            chatId: testMessage.chatId,
            type: 'message',
            url: `/dashboard?tab=chat&chatId=${testMessage.chatId}`
          },
          actions: [
            { action: 'reply', title: 'Reply' },
            { action: 'mark-read', title: 'Mark as read' },
            { action: 'open', title: 'Open Chat' }
          ]
        } as NotificationOptions & {
          actions: Array<{ action: string; title: string }>
        })
      }
      
      setLastResult('success')
      console.log('[PushSimulator] Test notification sent successfully')
      
    } catch (error) {
      console.error('[PushSimulator] Failed to send test notification:', error)
      setLastResult('error')
    } finally {
      setIsSending(false)
    }
  }

  const sendMultipleNotifications = async () => {
    setIsSending(true)
    
    try {
      const notifications = [
        { senderName: 'Alice', message: 'Payment received, thank you!', delay: 0 },
        { senderName: 'Bob', message: 'When is the next rent due?', delay: 2000 },
        { senderName: 'Carol', message: 'Can we schedule a viewing?', delay: 4000 },
        { senderName: 'David', message: 'The water leak is fixed now', delay: 6000 }
      ]
      
      for (const notification of notifications) {
        await new Promise(resolve => setTimeout(resolve, notification.delay))
        
        await messageHandler.showTestNotification({
          messageId: 'msg-' + Date.now() + '-' + Math.random(),
          senderId: 'sender-' + Math.random(),
          chatId: 'chat-' + Math.random(),
          senderName: notification.senderName,
          message: notification.message,
          timestamp: new Date().toISOString()
        })
      }
      
      setLastResult('success')
    } catch (error) {
      console.error('[PushSimulator] Failed to send multiple notifications:', error)
      setLastResult('error')
    } finally {
      setIsSending(false)
    }
  }

  const testReplyFlow = async () => {
    setIsSending(true)
    
    try {
      // Send initial notification
      await messageHandler.showTestNotification({
        messageId: 'reply-test-' + Date.now(),
        senderId: 'sender-123',
        chatId: 'chat-123',
        senderName: 'Test Sender',
        message: 'This is a test message. Try replying to it!',
        timestamp: new Date().toISOString()
      })
      
      setLastResult('success')
    } catch (error) {
      console.error('[PushSimulator] Failed to test reply flow:', error)
      setLastResult('error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-xl">Push Notification Simulator</CardTitle>
        <CardDescription>
          Test notifications like they would come from your backend
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Result Status */}
        {lastResult && (
          <div className={`p-3 rounded-lg text-sm ${
            lastResult === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {lastResult === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>
                {lastResult === 'success' ? 'Notification sent successfully!' : 'Failed to send notification'}
              </span>
            </div>
          </div>
        )}

        {/* Test Message Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Test Message:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                value={testMessage.senderName}
                onChange={(e) => setTestMessage(prev => ({ ...prev, senderName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                value={testMessage.message}
                onChange={(e) => setTestMessage(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Type your message..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={sendTestNotification}
            disabled={isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Test Notification...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button 
              onClick={sendMultipleNotifications}
              disabled={isSending}
              variant="outline"
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Multiple...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Multiple (4 msgs)
                </>
              )}
            </Button>

            <Button 
              onClick={testReplyFlow}
              disabled={isSending}
              variant="outline"
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Reply...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Test Reply Flow
                </>
              )}
            </Button>
          </div>
        </div>

        {/* What This Tests */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">What This Tests:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Service Worker Communication</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Notification Display</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Interactive Actions</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Reply Dialog Trigger</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Message Grouping</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Background Handling</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">If this works, your notification system is ready!</p>
              <p className="text-sm">The next step is to integrate with a real push service (Firebase, OneSignal, or VAPID) to send notifications from your backend when messages are actually sent.</p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
