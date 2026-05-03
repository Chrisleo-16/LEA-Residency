'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AuthErrorHandlerProps {
  error?: string
  onRetry?: () => void
}

export default function AuthErrorHandler({ error, onRetry }: AuthErrorHandlerProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('supabase.auth.refreshToken')
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/login')
    }
  }

  const handleRetry = () => {
    // Clear local storage and retry
    localStorage.removeItem('supabase.auth.token')
    localStorage.removeItem('supabase.auth.refreshToken')
    window.location.reload()
  }

  if (!error) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-lg">Authentication Error</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Session Expired</p>
                <p className="text-sm">
                  Your authentication session has expired or become invalid. 
                  This can happen when tokens expire or are cleared.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-mono text-muted-foreground">
              Error: {error}
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out & Login Again
            </Button>
            
            <Button 
              onClick={handleRetry}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Session
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Try signing out and logging back in</p>
            <p>• Clear browser cache and cookies</p>
            <p>• Check your internet connection</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
