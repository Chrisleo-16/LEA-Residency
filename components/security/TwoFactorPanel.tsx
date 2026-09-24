'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { readJsonResponse } from '@/lib/api/readJsonResponse'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export default function TwoFactorVerifyPanel({
  onVerified,
  onSignOut,
}: {
  onVerified: () => void
  onSignOut?: () => void
}) {
  const [code, setCode] = useState('')
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const authHeaders = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    }
  }

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/send', {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ purpose: 'login_2fa' }),
      })
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || data?.error || 'Could not send code')
      setPhoneMasked(data.phoneMasked || null)
      setSent(true)
    } catch (e: any) {
      setError(e.message || 'Failed to send code')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    send()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verify = async () => {
    if (code.length < 6) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ purpose: 'login_2fa', code }),
      })
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || data?.error || 'Invalid code')
      onVerified()
    } catch (e: any) {
      setError(e.message || 'Verification failed')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-5 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-accent" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground">Two-step verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {sent
            ? `Enter the code we sent to ${phoneMasked || 'your phone'}`
            : 'Sending a code to your phone…'}
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        onClick={verify}
        disabled={busy || code.length < 6}
        className="w-full h-11 rounded-xl bg-accent text-accent-foreground"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & continue'}
      </Button>

      <button
        type="button"
        disabled={busy}
        onClick={send}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Resend code
      </button>

      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="block w-full text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      )}
    </div>
  )
}

/** Settings: enable 2FA with phone + OTP */
export function TwoFactorEnrollCard() {
  const [status, setStatus] = useState<{
    twoFactorEnabled: boolean
    hasPhone: boolean
    phoneMasked: string | null
  } | null>(null)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'idle' | 'code'>('idle')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const headers = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    }
  }

  const refresh = async () => {
    const res = await fetch('/api/auth/2fa/status', {
      headers: await headers(),
      credentials: 'include',
    })
    const { ok, data } = await readJsonResponse<any>(res)
    if (ok) {
      setStatus({
        twoFactorEnabled: !!data.twoFactorEnabled,
        hasPhone: !!data.hasPhone,
        phoneMasked: data.phoneMasked,
      })
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const startEnroll = async () => {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/auth/2fa/send', {
        method: 'POST',
        headers: await headers(),
        credentials: 'include',
        body: JSON.stringify({
          purpose: 'enroll_2fa',
          phone: phone || undefined,
        }),
      })
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || data?.error)
      setStep('code')
      setMsg(`Code sent to ${data.phoneMasked || 'your phone'}`)
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const confirmEnroll = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: await headers(),
        credentials: 'include',
        body: JSON.stringify({ purpose: 'enroll_2fa', code }),
      })
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || data?.error)
      setMsg('Two-step verification is on')
      setStep('idle')
      setCode('')
      await refresh()
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: await headers(),
        credentials: 'include',
      })
      const { ok, error: apiError } = await readJsonResponse(res)
      if (!ok) throw new Error(apiError || 'Failed')
      setMsg('Two-step verification turned off')
      await refresh()
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (!status) {
    return (
      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading security…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Status:{' '}
        <span className="font-semibold text-foreground">
          {status.twoFactorEnabled ? 'Enabled' : 'Off'}
        </span>
        {status.phoneMasked ? ` · ${status.phoneMasked}` : ''}
      </p>

      {!status.twoFactorEnabled && (
        <>
          {step === 'idle' && (
            <>
              <Input
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl"
              />
              <Button
                onClick={startEnroll}
                disabled={busy || (!phone && !status.hasPhone)}
                className="rounded-xl bg-accent text-accent-foreground"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send verification code'}
              </Button>
            </>
          )}
          {step === 'code' && (
            <>
              <Input
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="rounded-xl font-mono tracking-widest"
              />
              <Button
                onClick={confirmEnroll}
                disabled={busy || code.length < 6}
                className="rounded-xl bg-accent text-accent-foreground"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
              </Button>
            </>
          )}
        </>
      )}

      {status.twoFactorEnabled && (
        <Button
          variant="outline"
          onClick={disable}
          disabled={busy}
          className="rounded-xl border-destructive/40 text-destructive"
        >
          Turn off 2FA
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {msg && <p className="text-xs text-emerald-700">{msg}</p>}
    </div>
  )
}
