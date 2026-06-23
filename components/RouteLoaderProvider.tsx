// components/RouteLoaderProvider.tsx
// ───────────────────────────────────────────────────────────
// REBUILT — simpler and more predictable than the previous version.
//
// WHAT CHANGED AND WHY:
// The previous version tried to watch usePathname() and react to
// route changes in real time, then stagger an overlay-fade-out with
// a content-fade-in. That created a visible "double animation" stutter
// on instant client-side navigations, because the minimum animation
// time (200ms out + 450ms in) was being forced even when the actual
// page change took under 50ms — the UI was animating something that
// had already finished, which is what read as "broken."
//
// New approach: the loader shows for a FIXED minimum of 3 seconds,
// full stop, no race against pathname timing. Simple opacity-only
// fade (no transform/translateY) for a calmer transition. If the
// navigation hasn't actually completed by 6 seconds, a Sonner toast
// warns the user to check their connection — that's a real signal
// of a slow/dead connection, not just normal page-load time.
// ───────────────────────────────────────────────────────────

'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import Loader from './Loader'

interface RouteLoaderContextType {
  startLoading: () => void
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
const SLOW_CONNECTION_MS = 6000 // if navigation still hasn't landed by here, warn about connectivity

export default function RouteLoaderProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  const prevPathname = useRef(pathname)
  const minTimeElapsed = useRef(false)
  const navigationLanded = useRef(false)
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slowConnectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (minTimer.current) clearTimeout(minTimer.current)
    if (slowConnectionTimer.current) clearTimeout(slowConnectionTimer.current)
  }

  // The loader hides only once BOTH conditions are true:
  // the minimum display time has passed, AND the route has actually
  // changed. Whichever finishes later is what determines when it hides —
  // this is what prevents the "loader vanishes but page is still loading"
  // gap from the earlier version.
  const maybeStopLoading = () => {
    if (minTimeElapsed.current && navigationLanded.current) {
      setLoading(false)
    }
  }

  // Route actually changed
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      navigationLanded.current = true
      if (slowConnectionTimer.current) clearTimeout(slowConnectionTimer.current)
      maybeStopLoading()
    }
  }, [pathname])

  const startLoading = () => {
    clearTimers()
    navigationLanded.current = false
    minTimeElapsed.current = false
    setLoading(true)

    // Fixed minimum: even on an instant navigation, the loader is
    // visible for at least this long, so it never feels like a flicker.
    minTimer.current = setTimeout(() => {
      minTimeElapsed.current = true
      maybeStopLoading()
    }, MIN_DISPLAY_MS)

    // If the route still hasn't actually changed by SLOW_CONNECTION_MS,
    // that's a real signal something is wrong with connectivity —
    // surface it as a toast. The loader stays visible while this shows,
    // since navigationLanded is still false.
    slowConnectionTimer.current = setTimeout(() => {
      if (!navigationLanded.current) {
        toast.warning('This is taking longer than usual', {
          description: 'Check your internet connection and try again.',
        })
      }
    }, SLOW_CONNECTION_MS)
  }

  // Clean up any pending timers if the provider unmounts mid-navigation
  useEffect(() => {
    return () => clearTimers()
  }, [])

  return (
    <RouteLoaderContext.Provider value={{ startLoading }}>
      {children}
      {loading && <Loader mode="overlay" shape="circle" />}
    </RouteLoaderContext.Provider>
  )
}