'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Delete, Fingerprint, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppLock } from '@/hooks/useAppLock'
import AppLockSetup from '@/components/security/AppLockSetup'
import { clearUnlock } from '@/lib/security/appLock'
import { detectPlatformAuth, type PlatformAuthCapability } from '@/lib/security/webauthn'
import { usePinKeyboard } from '@/hooks/usePinKeyboard'

const PAD = [
  { id: 'd1', label: '1' },
  { id: 'd2', label: '2' },
  { id: 'd3', label: '3' },
  { id: 'd4', label: '4' },
  { id: 'd5', label: '5' },
  { id: 'd6', label: '6' },
  { id: 'd7', label: '7' },
  { id: 'd8', label: '8' },
  { id: 'd9', label: '9' },
  { id: 'spacer', label: null },
  { id: 'd0', label: '0' },
  { id: 'back', label: '⌫' },
] as const

function LockScreen({
  unlockWithPin,
  unlockWithBiometric,
  hasBiometric,
  bioLabel,
}: {
  unlockWithPin: (pin: string) => Promise<boolean>
  unlockWithBiometric: () => Promise<boolean>
  hasBiometric: boolean
  bioLabel: string
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const append = (d: string) => {
    setError('')
    setPin((p) => (p.length >= 6 ? p : p + d))
  }

  const backspace = () => setPin((p) => p.slice(0, -1))

  const submit = async () => {
    if (pin.length < 4) return
    setBusy(true)
    setError('')
    const ok = await unlockWithPin(pin)
    setBusy(false)
    if (!ok) {
      setError('Incorrect PIN')
      setPin('')
    } else {
      setPin('')
    }
  }

  usePinKeyboard({
    busy,
    onDigit: append,
    onBackspace: backspace,
    onEnter: () => {
      if (pin.length >= 4) void submit()
    },
  })

  const signOut = async () => {
    clearUnlock()
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-accent" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            LEA Executive
          </p>
          <h1 className="text-xl font-bold text-foreground mt-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your PIN
            {hasBiometric ? ` or unlock with ${bioLabel}` : ''} to open your
            dashboard
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Type on your keyboard · Backspace to erase · Enter to unlock
          </p>
        </div>

        <div className="flex justify-center gap-2" aria-live="polite">
          {Array.from({ length: Math.max(4, pin.length || 4) }).map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border ${
                i < pin.length ? 'bg-accent border-accent' : 'border-border'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {PAD.map((cell) =>
            cell.label === null ? (
              <span key={cell.id} aria-hidden />
            ) : (
              <button
                key={cell.id}
                type="button"
                disabled={busy}
                onClick={() =>
                  cell.label === '⌫' ? backspace() : append(cell.label)
                }
                className="h-14 rounded-2xl bg-secondary text-lg font-semibold text-foreground hover:bg-secondary/80 active:scale-95 transition"
              >
                {cell.label === '⌫' ? (
                  <Delete className="w-5 h-5 mx-auto" />
                ) : (
                  cell.label
                )}
              </button>
            ),
          )}
        </div>

        <Button
          onClick={() => void submit()}
          disabled={busy || pin.length < 4}
          className="w-full h-12 rounded-xl bg-accent text-accent-foreground"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock'}
        </Button>

        {hasBiometric && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              const ok = await unlockWithBiometric()
              setBusy(false)
              if (!ok) setError('Biometric unlock failed — try your PIN')
            }}
            className="w-full h-11 rounded-xl gap-2"
          >
            <Fingerprint className="w-4 h-4" />
            Use {bioLabel}
          </Button>
        )}

        <button
          type="button"
          onClick={signOut}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Sign out of LEA
        </button>
      </div>
    </div>
  )
}

export default function AppLockGate({
  userId,
  displayName,
  children,
}: {
  userId: string
  displayName?: string
  children: React.ReactNode
}) {
  const {
    ready,
    unlocked,
    needsSetup,
    unlockWithPin,
    unlockWithBiometric,
    hasBiometric,
    unlock,
  } = useAppLock(userId)

  const [setupDone, setSetupDone] = useState(false)
  const [bioCap, setBioCap] = useState<PlatformAuthCapability | null>(null)
  const [bioTried, setBioTried] = useState(false)

  useEffect(() => {
    detectPlatformAuth().then(setBioCap)
  }, [])

  useEffect(() => {
    if (!ready || needsSetup || unlocked || !hasBiometric || bioTried) return
    let cancelled = false
    setBioTried(true)
    ;(async () => {
      await unlockWithBiometric()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [ready, needsSetup, unlocked, hasBiometric, bioTried, unlockWithBiometric])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (needsSetup && !setupDone) {
    return (
      <AppLockSetup
        userId={userId}
        displayName={displayName}
        onDone={() => {
          setSetupDone(true)
          unlock()
        }}
      />
    )
  }

  if (!unlocked) {
    return (
      <LockScreen
        unlockWithPin={unlockWithPin}
        unlockWithBiometric={unlockWithBiometric}
        hasBiometric={hasBiometric}
        bioLabel={bioCap?.label || 'biometrics'}
      />
    )
  }

  return <>{children}</>
}
