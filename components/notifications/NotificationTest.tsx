'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, TestTube, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function NotificationTest() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null)

  const checkServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      return registration.active !== null
    }
    return false
  }

  const registerServiceWorker = async () => {
    setIsRegistering(true)
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      console.log('[LEA] Service Worker registered:', registration)
      setIsRegistered(true)
      setLastResult('success')
    } catch (error) {
      console.error('[LEA] Service Worker failed:', error)
      setLastResult('error')
    } finally {
      setIsRegistering(false)
    }
  }

  const testNotification = async () => {
    setIsTesting(true)
    try {
      // Request permission first
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted')
      }

      // Test notification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('LEA Executive Test', {
          body: 'This is a test notification from your app! 🎉',
          icon: '/placeholder-logo.png',
          badge: '/placeholder-logo.png',
          tag: 'test-notification',
          requireInteraction: false
        })
      } else {
        new Notification('LEA Executive Test', {
          body: 'This is a test notification from your app! 🎉',
          icon: '/placeholder-logo.png'
        })
      }
      
      setLastResult('success')
    } catch (error) {
      console.error('[LEA] Test notification failed:', error)
      setLastResult('error')
    } finally {
      setIsTesting(false)
    }
  }

  const checkStatus = async () => {
    const hasSW = await checkServiceWorker()
    setIsRegistered(hasSW)
  }

  useState(() => {
    checkStatus()
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <TestTube className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-lg">Notification Test</CardTitle>
        <CardDescription>
          Test your notification system in development
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex justify-center">
          <Badge 
            variant={isRegistered ? "default" : "secondary"}
            className="px-3 py-1"
          >
            {isRegistered ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                SW Active
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                SW Inactive
              </>
            )}
          </Badge>
        </div>

        {/* Test Result */}
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
                {lastResult === 'success' ? 'Test successful!' : 'Test failed!'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {!isRegistered && (
            <Button 
              onClick={registerServiceWorker}
              disabled={isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Register Service Worker
                </>
              )}
            </Button>
          )}

          <Button 
            onClick={testNotification}
            disabled={isTesting}
            variant={isRegistered ? "default" : "outline"}
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Test Notification
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Development Testing:</p>
          <ul className="space-y-1 ml-4">
            <li>• Click "Register Service Worker" first</li>
            <li>• Then click "Test Notification"</li>
            <li>• Check browser console for logs</li>
            <li>• Allow notifications when prompted</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
