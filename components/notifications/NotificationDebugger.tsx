'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bell, 
  BellOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Smartphone,
  Settings,
  RefreshCw
} from 'lucide-react'
import { messageHandler } from '@/lib/message-handler'

export default function NotificationDebugger() {
  const [status, setStatus] = useState({
    serviceWorker: 'checking' as 'checking' | 'active' | 'inactive' | 'error',
    permission: 'checking' as 'checking' | 'granted' | 'denied' | 'default' | 'error',
    subscription: 'checking' as 'checking' | 'active' | 'inactive' | 'error'
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setTestResults(prev => [...prev, `${type.toUpperCase()}: ${message}`])
  }

  const checkServiceWorkerStatus = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if (registration.active) {
          setStatus(prev => ({ ...prev, serviceWorker: 'active' }))
          addResult('Service Worker is active and running', 'success')
          return true
        } else {
          setStatus(prev => ({ ...prev, serviceWorker: 'inactive' }))
          addResult('Service Worker is registered but not active', 'error')
          return false
        }
      } else {
        setStatus(prev => ({ ...prev, serviceWorker: 'error' }))
        addResult('Service Worker is not supported in this browser', 'error')
        return false
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, serviceWorker: 'error' }))
      addResult(`Service Worker error: ${error}`, 'error')
      return false
    }
  }

  const checkNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission()
      setStatus(prev => ({ ...prev, permission: permission as any }))
      
      if (permission === 'granted') {
        addResult('Notification permission granted', 'success')
        return true
      } else if (permission === 'denied') {
        addResult('Notification permission denied - check browser settings', 'error')
        return false
      } else {
        addResult('Notification permission not requested yet', 'info')
        return false
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, permission: 'error' }))
      addResult(`Permission error: ${error}`, 'error')
      return false
    }
  }

  const checkPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        setStatus(prev => ({ ...prev, subscription: 'active' }))
        addResult(`Push subscription active: ${subscription.endpoint.substring(0, 50)}...`, 'success')
        return true
      } else {
        setStatus(prev => ({ ...prev, subscription: 'inactive' }))
        addResult('No push subscription found', 'error')
        return false
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, subscription: 'error' }))
      addResult(`Subscription error: ${error}`, 'error')
      return false
    }
  }

  const runFullDiagnostic = async () => {
    setTestResults([])
    addResult('Starting notification diagnostic...', 'info')
    
    const swOk = await checkServiceWorkerStatus()
    const permOk = await checkNotificationPermission()
    const subOk = await checkPushSubscription()
    
    if (swOk && permOk && subOk) {
      addResult('✅ All systems ready for notifications!', 'success')
    } else {
      addResult('❌ Some issues found - see above', 'error')
    }
  }

  const testLocalNotification = async () => {
    setIsTesting(true)
    try {
      addResult('Testing local notification...', 'info')
      
      await messageHandler.showTestNotification({
        messageId: 'test-msg-123',
        senderId: 'test-sender',
        chatId: 'test-chat',
        senderName: 'Test User',
        message: 'This is a test notification from LEA Executive!',
        timestamp: new Date().toISOString()
      })
      
      addResult('✅ Local notification sent successfully', 'success')
    } catch (error) {
      addResult(`❌ Local notification failed: ${error}`, 'error')
    } finally {
      setIsTesting(false)
    }
  }

  const testServiceWorkerDirectly = async () => {
    setIsTesting(true)
    try {
      addResult('Testing service worker directly...', 'info')
      
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('Direct SW Test', {
        body: 'This notification was sent directly to the service worker',
        icon: '/placeholder-logo.png',
        tag: 'direct-test'
      })
      
      addResult('✅ Direct service worker notification sent', 'success')
    } catch (error) {
      addResult(`❌ Direct SW notification failed: ${error}`, 'error')
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusIcon = (statusType: string, status: string) => {
    if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin" />
    if (status === 'active' || status === 'granted') return <CheckCircle2 className="w-4 h-4 text-green-600" />
    if (status === 'inactive' || status === 'default') return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    if (status === 'denied' || status === 'error') return <XCircle className="w-4 h-4 text-red-600" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'granted') return 'bg-green-100 text-green-800 border-green-200'
    if (status === 'inactive' || status === 'default') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (status === 'denied' || status === 'error') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  useEffect(() => {
    runFullDiagnostic()
  }, [])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Notification Debugger</CardTitle>
        <CardDescription>
          Diagnose and test your notification system
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg border ${getStatusColor(status.serviceWorker)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon('serviceWorker', status.serviceWorker)}
              <span className="font-medium text-sm">Service Worker</span>
            </div>
            <p className="text-xs capitalize">{status.serviceWorker}</p>
          </div>

          <div className={`p-3 rounded-lg border ${getStatusColor(status.permission)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon('permission', status.permission)}
              <span className="font-medium text-sm">Permission</span>
            </div>
            <p className="text-xs capitalize">{status.permission}</p>
          </div>

          <div className={`p-3 rounded-lg border ${getStatusColor(status.subscription)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon('subscription', status.subscription)}
              <span className="font-medium text-sm">Push Subscription</span>
            </div>
            <p className="text-xs capitalize">{status.subscription}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={runFullDiagnostic}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Full Diagnostic
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button 
              onClick={testLocalNotification}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Test Local Notification
            </Button>

            <Button 
              onClick={testServiceWorkerDirectly}
              disabled={isTesting}
              className="w-full"
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4 mr-2" />
              )}
              Test Service Worker
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Diagnostic Results:</h3>
            <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs font-mono mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting Tips */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">If notifications aren't working:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Ensure you're in production or have enabled SW in development</li>
                <li>• Check browser notification permissions in settings</li>
                <li>• Make sure the tab is not closed (service workers need active registration)</li>
                <li>• Try refreshing the page and running diagnostic again</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
