'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Delete, Fingerprint, Loader2, Lock } from 'lucide-react'
import { enrollPin, markUnlocked } from '@/lib/security/appLock'
import {
  detectPlatformAuth,
  enrollBiometric,
  type PlatformAuthCapability,
} from '@/lib/security/webauthn'
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

export default function AppLockSetup({
  userId,
  displayName,
  onDone,
}: {
  userId: string
  displayName?: string
  onDone: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep] = useState<'create' | 'confirm'>('create')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [bioCap, setBioCap] = useState<PlatformAuthCapability | null>(null)

  useEffect(() => {
    detectPlatformAuth().then(setBioCap)
  }, [])

  const append = (d: string) => {
    setError('')
    if (step === 'create') {
      setPin((p) => (p.length >= 6 ? p : p + d))
    } else {
      setConfirm((p) => (p.length >= 6 ? p : p + d))
    }
  }

  const backspace = () => {
    if (step === 'create') setPin((p) => p.slice(0, -1))
    else setConfirm((p) => p.slice(0, -1))
  }

  const advance = async () => {
    if (step === 'create') {
      if (pin.length < 4) {
        setError('Use 4–6 digits')
        return
      }
      setStep('confirm')
      return
    }
    if (confirm !== pin) {
      setError('PINs do not match')
      setConfirm('')
      return
    }
    setBusy(true)
    try {
      await enrollPin(userId, pin)
      markUnlocked(userId)
      onDone()
    } catch (e: any) {
      setError(e.message || 'Could not save PIN')
    } finally {
      setBusy(false)
    }
  }

  const enableBio = async () => {
    setBusy(true)
    setError('')
    try {
      if (pin.length < 4) throw new Error('Set your PIN first')
      if (step === 'create') {
        setStep('confirm')
        setBusy(false)
        return
      }
      if (confirm !== pin) throw new Error('Confirm your PIN first')
      await enrollPin(userId, pin)
      await enrollBiometric(userId, displayName || 'LEA user')
      markUnlocked(userId)
      onDone()
    } catch (e: any) {
      setError(e.message || 'Biometric setup failed — PIN still works')
    } finally {
      setBusy(false)
    }
  }

  const value = step === 'create' ? pin : confirm

  usePinKeyboard({
    busy,
    onDigit: append,
    onBackspace: backspace,
    onEnter: () => {
      if (value.length >= 4) void advance()
    },
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Set your App PIN</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'create'
              ? 'Create a 4–6 digit PIN (works on any laptop or phone).'
              : 'Confirm your PIN'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Type digits on your keyboard · Backspace to erase · Enter to continue
          </p>
          {bioCap?.available && step === 'create' && (
            <p className="text-xs text-accent mt-2">
              {bioCap.label} detected — you can enable it after confirming your PIN.
            </p>
          )}
        </div>

        <div className="flex justify-center gap-2" aria-live="polite">
          {Array.from({ length: Math.max(4, value.length || 4) }).map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border ${
                i < value.length ? 'bg-accent border-accent' : 'border-border'
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
          onClick={advance}
          disabled={busy || value.length < 4}
          className="w-full h-12 rounded-xl bg-accent text-accent-foreground"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : step === 'create' ? (
            'Continue'
          ) : (
            'Save PIN & continue'
          )}
        </Button>

        {bioCap?.available && step === 'confirm' && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || confirm.length < 4}
            onClick={enableBio}
            className="w-full h-11 rounded-xl gap-2"
          >
            <Fingerprint className="w-4 h-4" />
            Save PIN + enable {bioCap.label}
          </Button>
        )}
      </div>
    </div>
  )
}
