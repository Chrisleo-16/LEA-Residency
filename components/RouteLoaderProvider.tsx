'use client'

import { createContext, useContext, useEffect, useState, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Loader from './Loader'

interface RouteLoaderContextType {
  startLoading: () => void
  stopLoading: () => void
}

const RouteLoaderContext = createContext<RouteLoaderContextType | null>(null)

export function useRouteLoader() {
  const ctx = useContext(RouteLoaderContext)
  if (!ctx) {
    throw new Error('useRouteLoader() must be used inside <RouteLoaderProvider>')
  }
  return ctx
}

const MIN_DISPLAY_MS = 3000   // loader always shows for at least this long
const SLOW_CONNECTION_MS = 6000 // warn about connectivity if not landed

export default function RouteLoaderProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  
  const minTimeElapsed = useRef(false)
  const navigationLanded = useRef(false)
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slowConnectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (minTimer.current) clearTimeout(minTimer.current)
    if (slowConnectionTimer.current) clearTimeout(slowConnectionTimer.current)
  }

  const maybeStopLoading = () => {
    if (minTimeElapsed.current && navigationLanded.current) {
      setLoading(false)
    }
  }

  const stopLoading = () => {
    navigationLanded.current = true
    if (slowConnectionTimer.current) clearTimeout(slowConnectionTimer.current)
    maybeStopLoading()
  }

  const startLoading = () => {
    clearTimers()
    navigationLanded.current = false
    minTimeElapsed.current = false
    setLoading(true)

    minTimer.current = setTimeout(() => {
      minTimeElapsed.current = true
      maybeStopLoading()
    }, MIN_DISPLAY_MS)

    slowConnectionTimer.current = setTimeout(() => {
      if (!navigationLanded.current) {
        toast.warning('This is taking longer than usual', {
          description: 'Check your internet connection and try again.',
        })
      }
    }, SLOW_CONNECTION_MS)
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  return (
    <RouteLoaderContext.Provider value={{ startLoading, stopLoading }}>
      {/* ✅ Moving URL listening into a Suspense-wrapped sub-component 
        fixes the static prerendering error for /_not-found 
      */}
      <Suspense fallback={null}>
        <UrlNavigationListener onRouteComplete={stopLoading} />
      </Suspense>
      
      {children}
      {loading && <Loader mode="overlay" shape="circle" />}
    </RouteLoaderContext.Provider>
  )
}

/**
 * Sub-component safely isolated with Suspense boundary 
 * to monitor router events without breaking static site generation.
 */
function UrlNavigationListener({ onRouteComplete }: { onRouteComplete: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const fullUrl = `${pathname}?${searchParams.toString()}`
  const prevUrl = useRef(fullUrl)

  useEffect(() => {
    if (prevUrl.current !== fullUrl) {
      prevUrl.current = fullUrl
      onRouteComplete()
    }
  }, [fullUrl, onRouteComplete])

  return null
}