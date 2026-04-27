'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  BellOff, 
  Settings, 
  AlertCircle, 
  CheckCircle2,
  Info,
  Loader2
} from 'lucide-react'
import { notificationManager, NotificationPermissionStatus } from '@/lib/notifications'

interface NotificationPermissionProps {
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
  showInstructions?: boolean
}

export default function NotificationPermission({
  onPermissionGranted,
  onPermissionDenied,
  showInstructions = true
}: NotificationPermissionProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  const checkPermissionStatus = async () => {
    try {
      setIsLoading(true)
      const status = await notificationManager.getPermissionStatus()
      setPermissionStatus(status)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check notification permission')
    } finally {
      setIsLoading(false)
    }
  }

  const requestPermission = async () => {
    try {
      setIsRequesting(true)
      setError(null)
      
      const status = await notificationManager.requestPermission()
      setPermissionStatus(status)

      if (status.isGranted) {
        onPermissionGranted?.()
        // Try to subscribe to push notifications
        try {
          await notificationManager.subscribeToPush()
        } catch (subError) {
          console.warn('Failed to subscribe to push notifications:', subError)
        }
      } else {
        onPermissionDenied?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request notification permission')
    } finally {
      setIsRequesting(false)
    }
  }

  const testNotification = async () => {
    try {
      await notificationManager.showLocalNotification('LEA Executive', {
        body: 'This is a test notification from LEA Executive Residency!',
        icon: '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
        tag: 'test-notification'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to show test notification')
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Checking notification permissions...</span>
        </CardContent>
      </Card>
    )
  }

  if (!permissionStatus) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are not supported in this browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          {permissionStatus.isGranted ? (
            <Bell className="w-8 h-8 text-green-600" />
          ) : (
            <BellOff className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <CardTitle className="text-lg">Notification Permissions</CardTitle>
        <CardDescription>
          Stay updated with important messages and alerts
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={permissionStatus.isGranted ? "default" : permissionStatus.isDenied ? "destructive" : "secondary"}
            className="px-3 py-1"
          >
            {permissionStatus.isGranted ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Enabled
              </>
            ) : permissionStatus.isDenied ? (
              <>
                <BellOff className="w-3 h-3 mr-1" />
                Blocked
              </>
            ) : (
              <>
                <Info className="w-3 h-3 mr-1" />
                Not Requested
              </>
            )}
          </Badge>
        </div>

        {/* Error Message */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {permissionStatus.canRequest && (
            <Button 
              onClick={requestPermission}
              disabled={isRequesting}
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
          )}

          {permissionStatus.isGranted && (
            <Button 
              onClick={testNotification}
              variant="outline"
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Test Notification
            </Button>
          )}
        </div>

        {/* Instructions for blocked permissions */}
        {permissionStatus.isDenied && showInstructions && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Notifications are blocked</p>
                <p className="text-sm">{notificationManager.getBrowserInstructions()}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Benefits */}
        {permissionStatus.canRequest && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Why enable notifications?</p>
            <ul className="text-xs space-y-1 ml-4">
              <li>• Receive payment reminders</li>
              <li>• Get important updates</li>
              <li>• Stay connected with your landlord/tenant</li>
              <li>• Never miss critical messages</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
