'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bug, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Terminal,
  Smartphone,
  Wifi,
  Battery,
  Settings,
  RefreshCw,
  Info
} from 'lucide-react'

export default function AdvancedDebugger() {
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [systemInfo, setSystemInfo] = useState<any>({})

  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${message}`])
  }

  const checkSystemInfo = async () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      isPWA: (navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
      serviceWorkerSupport: 'serviceWorker' in navigator,
      notificationSupport: 'Notification' in window,
      pushManagerSupport: 'PushManager' in window,
      permissionsSupport: 'permissions' in navigator
    }
    
    setSystemInfo(info)
    addLog(`System info collected: ${JSON.stringify(info, null, 2)}`, 'info')
    return info
  }

  const checkServiceWorkerDetailed = async () => {
    try {
      addLog('Checking service worker registration...', 'info')
      
      const registrations = await navigator.serviceWorker.getRegistrations()
      addLog(`Found ${registrations.length} service worker registrations`, 'info')
      
      for (const registration of registrations) {
        addLog(`SW Scope: ${registration.scope}`, 'info')
        addLog(`SW Script URL: ${registration.active?.scriptURL || 'N/A'}`, 'info')
        addLog(`SW State: ${registration.active?.state || 'N/A'}`, 'info')
        
        if (registration.active) {
          addLog('Service worker is active', 'success')
          
          // Test communication with SW
          registration.active.postMessage({ type: 'PING' })
          addLog('Sent PING message to service worker', 'info')
        }
      }
      
      if (registrations.length === 0) {
        addLog('No service workers found - trying to register...', 'warning')
        
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          addLog(`Service worker registered: ${registration.scope}`, 'success')
        } catch (error) {
          addLog(`Failed to register SW: ${error}`, 'error')
        }
      }
      
    } catch (error) {
      addLog(`Service worker check failed: ${error}`, 'error')
    }
  }

  const checkNotificationPermissionsDetailed = async () => {
    try {
      addLog('Checking notification permissions...', 'info')
      
      const permission = await Notification.requestPermission()
      addLog(`Notification permission: ${permission}`, permission === 'granted' ? 'success' : 'error')
      
      if ('permissions' in navigator) {
        const notificationPermission = await navigator.permissions.query({ name: 'notifications' })
        addLog(`Permissions API result: ${notificationPermission.state}`, 'info')
        addLog(`Permissions API onchange: ${notificationPermission.onchange ? 'supported' : 'not supported'}`, 'info')
      }
      
      // Test creating a notification
      try {
        const testNotification = new Notification('LEA Test', {
          body: 'This is a test notification',
          icon: '/placeholder-logo.png',
          tag: 'advanced-test'
        })
        
        addLog('Local notification created successfully', 'success')
        
        setTimeout(() => {
          testNotification.close()
          addLog('Test notification closed', 'info')
        }, 3000)
        
      } catch (error) {
        addLog(`Failed to create local notification: ${error}`, 'error')
      }
      
    } catch (error) {
      addLog(`Permission check failed: ${error}`, 'error')
    }
  }

  const checkPushSubscription = async () => {
    try {
      addLog('Checking push subscription...', 'info')
      
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        addLog(`Push subscription found: ${subscription.endpoint.substring(0, 50)}...`, 'success')
        addLog(`Subscription keys: ${JSON.stringify(subscription.toJSON().keys, null, 2)}`, 'info')
        
        // Test subscription validity
        const isValid = await subscription.getKey('p256dh') && await subscription.getKey('auth')
        addLog(`Subscription keys valid: ${isValid ? 'YES' : 'NO'}`, isValid ? 'success' : 'error')
        
      } else {
        addLog('No push subscription found - trying to subscribe...', 'warning')
        
        try {
          // This will fail without VAPID keys, but let's try
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: null // This will fail without VAPID
          })
          
          addLog('Push subscription created (unexpected)', 'success')
          
        } catch (error) {
          addLog(`Push subscription failed (expected without VAPID): ${error}`, 'warning')
          addLog('This is normal - VAPID keys are needed for real push subscriptions', 'info')
        }
      }
      
    } catch (error) {
      addLog(`Push subscription check failed: ${error}`, 'error')
    }
  }

  const testServiceWorkerCommunication = async () => {
    try {
      addLog('Testing service worker communication...', 'info')
      
      const registration = await navigator.serviceWorker.ready
      
      if (!registration.active) {
        addLog('No active service worker found', 'error')
        return
      }
      
      // Create a message channel for two-way communication
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        addLog(`SW Response: ${JSON.stringify(event.data)}`, 'success')
      }
      
      // Send message to SW
      registration.active.postMessage({
        type: 'ADVANCED_TEST',
        data: { timestamp: Date.now() }
      }, [channel.port2])
      
      addLog('Sent advanced test message to SW', 'info')
      
      // Test notification via SW
      await registration.showNotification('SW Communication Test', {
        body: 'This notification was sent directly to the service worker',
        icon: '/placeholder-logo.png',
        tag: 'sw-comm-test'
      })
      
      addLog('SW notification test sent', 'success')
      
    } catch (error) {
      addLog(`SW communication test failed: ${error}`, 'error')
    }
  }

  const runFullDiagnostic = async () => {
    setIsRunning(true)
    setLogs([])
    
    try {
      addLog('=== STARTING ADVANCED DIAGNOSTIC ===', 'info')
      
      await checkSystemInfo()
      await checkServiceWorkerDetailed()
      await checkNotificationPermissionsDetailed()
      await checkPushSubscription()
      await testServiceWorkerCommunication()
      
      addLog('=== DIAGNOSTIC COMPLETE ===', 'success')
      
    } catch (error) {
      addLog(`Diagnostic failed: ${error}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const copyLogs = () => {
    const logText = logs.join('\n')
    navigator.clipboard.writeText(logText)
  }

  useEffect(() => {
    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        addLog(`SW Message: ${JSON.stringify(event.data)}`, 'info')
      })
    }
  }, [])

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <Bug className="w-8 h-8 text-red-600" />
        </div>
        <CardTitle className="text-xl">Advanced Notification Debugger</CardTitle>
        <CardDescription>
          Deep dive into notification system issues
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={runFullDiagnostic}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnostic...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Run Full Diagnostic
              </>
            )}
          </Button>
          
          <Button 
            onClick={clearLogs}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
          
          <Button 
            onClick={copyLogs}
            variant="outline"
            size="sm"
          >
            Copy Logs
          </Button>
        </div>

        {/* System Info */}
        {Object.keys(systemInfo).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">System Information:</h3>
            <div className="bg-muted rounded-lg p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(systemInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Diagnostic Logs:</h3>
            <div className="bg-black text-green-400 rounded-lg p-3 max-h-96 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting Guide */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">If you're still having issues:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Check if your phone's battery saver is on (it can kill notifications)</li>
                <li>• Verify the app has notification permissions in phone settings</li>
                <li>• Make sure you're using the installed PWA, not the browser</li>
                <li>• Try force-closing and reopening the PWA</li>
                <li>• Check if the service worker is actually running (see logs above)</li>
                <li>• Test with a different browser/device to isolate the issue</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
