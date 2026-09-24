'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IDLE_LOCK_MS,
  clearUnlock,
  hasPinEnrolled,
  isUnlocked,
  markUnlocked,
  verifyPin,
  hasBiometricEnrolled,
} from '@/lib/security/appLock'
import { verifyBiometric } from '@/lib/security/webauthn'

export function useAppLock(userId: string | null) {
  const [unlocked, setUnlocked] = useState(false)
  const [ready, setReady] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lock = useCallback(() => {
    clearUnlock()
    setUnlocked(false)
  }, [])

  const unlock = useCallback(() => {
    if (!userId) return
    markUnlocked(userId)
    setUnlocked(true)
  }, [userId])

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!userId) return false
      const ok = await verifyPin(userId, pin)
      if (ok) unlock()
      return ok
    },
    [userId, unlock]
  )

  const unlockWithBiometric = useCallback(async () => {
    if (!userId || !hasBiometricEnrolled(userId)) return false
    const ok = await verifyBiometric(userId)
    if (ok) unlock()
    return ok
  }, [userId, unlock])

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (!unlocked || !userId) return
    idleTimer.current = setTimeout(() => {
      lock()
    }, IDLE_LOCK_MS)
  }, [unlocked, userId, lock])

  useEffect(() => {
    if (!userId) {
      setReady(true)
      setUnlocked(false)
      return
    }
    setUnlocked(isUnlocked(userId))
    setReady(true)
  }, [userId])

  useEffect(() => {
    if (!userId || !unlocked) return

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        lock()
      }
    }
    const onPageHide = () => lock()
    const onActivity = () => resetIdle()

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onPageHide)
    ;['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(
      (ev) => window.addEventListener(ev, onActivity, { passive: true })
    )
    resetIdle()

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onPageHide)
      ;['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(
        (ev) => window.removeEventListener(ev, onActivity)
      )
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [userId, unlocked, lock, resetIdle])

  return {
    ready,
    unlocked,
    needsSetup: !!userId && ready && !hasPinEnrolled(userId),
    lock,
    unlock,
    unlockWithPin,
    unlockWithBiometric,
    hasBiometric: !!userId && hasBiometricEnrolled(userId),
  }
}
