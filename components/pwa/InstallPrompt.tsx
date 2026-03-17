'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) { setIsInstalled(true); return }

    // Check if dismissed before
    const dismissed = localStorage.getItem('pwa-dismissed')
    if (dismissed) return

    // Check iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)
    if (ios) { setShowBanner(true); return }

    // Listen for install prompt (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setIsInstalled(true)
    }
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  if (!showBanner || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-accent-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              Install LEA Executive
            </p>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Tap <span className="font-medium">Share</span> then{' '}
                <span className="font-medium">"Add to Home Screen"</span> to install
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for the best experience
              </p>
            )}

            {!isIOS && (
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex-1 border-border text-foreground h-8 text-xs"
                >
                  Not now
                </Button>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}