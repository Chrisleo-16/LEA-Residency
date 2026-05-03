'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Info,
  Globe,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow
} from 'lucide-react'

export default function MobileTestHelper() {
  const [isMobile, setIsMobile] = useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('unknown')
  const [batteryLevel, setBatteryLevel] = useState('unknown')

  useState(() => {
    // Check if mobile
    const userAgent = navigator.userAgent.toLowerCase()
    setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent))
    
    // Check if PWA installed
    setIsPWAInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    )
    
    // Check connection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionStatus(connection.effectiveType || 'unknown')
    }
    
    // Check battery
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(`${Math.round(battery.level * 100)}%`)
      })
    }
  })

  const generateTestURL = () => {
    const baseURL = window.location.origin
    return `${baseURL}/api/notifications/test`
  }

  const copyTestCommand = () => {
    const command = `curl -X POST ${generateTestURL()} \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipientId": "test-user-123",
    "message": "Test notification from mobile",
    "senderName": "Mobile Test"
  }'`
    
    navigator.clipboard.writeText(command)
  }

  const getMobileStatus = () => {
    if (!isMobile) return 'desktop'
    if (isPWAInstalled) return 'pwa-installed'
    return 'browser-only'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pwa-installed': return 'bg-green-100 text-green-800 border-green-200'
      case 'browser-only': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'desktop': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pwa-installed': return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'browser-only': return <XCircle className="w-4 h-4 text-yellow-600" />
      case 'desktop': return <Globe className="w-4 h-4 text-blue-600" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const mobileStatus = getMobileStatus()

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <Smartphone className="w-8 h-8 text-purple-600" />
        </div>
        <CardTitle className="text-xl">Mobile Notification Test</CardTitle>
        <CardDescription>
          Test and troubleshoot mobile notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Device Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg border ${getStatusColor(mobileStatus)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(mobileStatus)}
              <span className="font-medium text-sm">Device Type</span>
            </div>
            <p className="text-xs capitalize">{mobileStatus.replace('-', ' ')}</p>
          </div>

          <div className={`p-3 rounded-lg border ${getStatusColor(isPWAInstalled ? 'pwa-installed' : 'browser-only')}`}>
            <div className="flex items-center gap-2 mb-1">
              {isPWAInstalled ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-yellow-600" />}
              <span className="font-medium text-sm">PWA Status</span>
            </div>
            <p className="text-xs">{isPWAInstalled ? 'Installed' : 'Not Installed'}</p>
          </div>
        </div>

        {/* Mobile Specific Info */}
        {isMobile && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Mobile Device Info:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                {connectionStatus !== 'unknown' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>Connection: {connectionStatus}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {batteryLevel !== 'unknown' ? <Battery className="w-4 h-4" /> : <BatteryLow className="w-4 h-4" />}
                <span>Battery: {batteryLevel}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Issues */}
        {!isPWAInstalled && isMobile && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">PWA Not Installed - This is likely why notifications aren't working!</p>
                <p className="text-sm">Mobile browsers only show notifications when the PWA is installed.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Test Commands */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Test via Terminal:</h3>
          
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-mono mb-2">Test API Endpoint:</p>
            <code className="text-xs bg-background p-2 rounded block break-all">
              {generateTestURL()}
            </code>
          </div>

          <Button onClick={copyTestCommand} className="w-full" variant="outline">
            Copy cURL Command
          </Button>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-mono mb-2">cURL Command:</p>
            <code className="text-xs bg-background p-2 rounded block break-all whitespace-pre-wrap">
{`curl -X POST ${generateTestURL()} \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipientId": "test-user-123",
    "message": "Test notification from terminal",
    "senderName": "Terminal Test"
  }'`}
            </code>
          </div>
        </div>

        {/* Mobile Installation Guide */}
        {!isPWAInstalled && isMobile && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">How to Install PWA:</h3>
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Chrome (Android):</span>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Tap menu (⋮) → "Add to Home screen" → "Install"
              </p>
              
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Safari (iOS):</span>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Tap Share → "Add to Home Screen" → "Add"
              </p>
            </div>
          </div>
        )}

        {/* Troubleshooting Steps */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Mobile Troubleshooting:</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-xs">Install the PWA on your mobile device</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-xs">Open the installed PWA (not the browser)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-xs">Enable notifications when prompted</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center flex-shrink-0">4</span>
              <p className="text-xs">Test with the terminal command above</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center flex-shrink-0">5</span>
              <p className="text-xs">Check phone settings → Notifications → Allow your app</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
