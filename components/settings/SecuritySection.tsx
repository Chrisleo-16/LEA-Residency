'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Fingerprint, Loader2, Lock, Shield } from 'lucide-react'
import { TwoFactorEnrollCard } from '@/components/security/TwoFactorPanel'
import {
  clearPin,
  enrollPin,
  hasBiometricEnrolled,
  hasPinEnrolled,
  verifyPin,
} from '@/lib/security/appLock'
import {
  detectPlatformAuth,
  enrollBiometric,
  type PlatformAuthCapability,
} from '@/lib/security/webauthn'

export default function SecuritySection({
  userId,
  displayName,
}: {
  userId: string
  displayName?: string
}) {
  const [hasPin, setHasPin] = useState(false)
  const [hasBio, setHasBio] = useState(false)
  const [bioCap, setBioCap] = useState<PlatformAuthCapability | null>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = () => {
    setHasPin(hasPinEnrolled(userId))
    setHasBio(hasBiometricEnrolled(userId))
  }

  useEffect(() => {
    refresh()
    detectPlatformAuth().then(setBioCap)
  }, [userId])

  const changePin = async () => {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      if (hasPin) {
        const ok = await verifyPin(userId, currentPin)
        if (!ok) throw new Error('Current PIN is incorrect')
      }
      await enrollPin(userId, newPin)
      setMsg('App PIN updated')
      setCurrentPin('')
      setNewPin('')
      refresh()
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const enableBio = async () => {
    setBusy(true)
    setError('')
    try {
      if (!hasPinEnrolled(userId)) {
        throw new Error('Set an App PIN first')
      }
      await enrollBiometric(userId, displayName || 'LEA user')
      setMsg('Biometrics enabled on this device')
      refresh()
    } catch (e: any) {
      setError(e.message || 'Biometric setup failed')
    } finally {
      setBusy(false)
    }
  }

  const resetLock = () => {
    clearPin(userId)
    refresh()
    setMsg('App Lock cleared on this device — you will set a new PIN next visit')
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-semibold text-foreground">SMS two-step verification</h4>
        </div>
        <TwoFactorEnrollCard />
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-semibold text-foreground">App Lock (PIN)</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Required to open the dashboard. Locks when you leave the tab or after 2 minutes idle.
          {hasPin ? ' PIN is set on this device.' : ' No PIN on this device yet.'}
        </p>
        {hasPin && (
          <Input
            type="password"
            inputMode="numeric"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="rounded-xl"
          />
        )}
        <Input
          type="password"
          inputMode="numeric"
          placeholder={hasPin ? 'New PIN (4–6 digits)' : 'Create PIN (4–6 digits)'}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="rounded-xl"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={changePin}
            disabled={busy || newPin.length < 4 || (hasPin && currentPin.length < 4)}
            className="rounded-xl bg-accent text-accent-foreground"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPin ? 'Change PIN' : 'Set PIN'}
          </Button>
          {hasPin && (
            <Button
              type="button"
              variant="outline"
              onClick={resetLock}
              className="rounded-xl"
            >
              Clear on this device
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-semibold text-foreground">
            Biometrics {bioCap?.label ? `(${bioCap.label})` : ''}
          </h4>
        </div>
        {!bioCap ? (
          <p className="text-xs text-muted-foreground">Checking this device…</p>
        ) : bioCap.available ? (
          <>
            <p className="text-xs text-muted-foreground">
              {hasBio
                ? `${bioCap.label} is enrolled on this laptop/phone.`
                : `${bioCap.label} was detected. Enable it to unlock without typing your PIN.`}
            </p>
            {!hasBio && (
              <Button
                type="button"
                variant="outline"
                disabled={busy || !hasPin}
                onClick={enableBio}
                className="rounded-xl gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                Enable {bioCap.label}
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {bioCap.reason ||
              'No fingerprint / Face ID / Windows Hello on this device. App PIN still works on this laptop.'}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {msg && <p className="text-xs text-emerald-700">{msg}</p>}
    </div>
  )
}
