'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Hash, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { readJsonResponse } from '@/lib/api/readJsonResponse'

interface Props {
  paymentId: string
  amount: number
  month: string
  onDone: () => void
}

export default function MpesaCodeSubmitCard({
  paymentId,
  amount,
  month,
  onDone,
}: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const codeReady = cleaned.length >= 8 && cleaned.length <= 12

  const submit = async () => {
    if (!codeReady) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/payments/confirm-mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'submit',
          paymentId,
          mpesaCode: cleaned,
          month,
        }),
      })
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || data?.error || 'Could not submit code')
      setSuccess(
        data.message ||
          (data.pendingLandlord
            ? 'Code submitted — waiting for landlord to confirm on Pochi'
            : 'Payment verified'),
      )
      setTimeout(onDone, 1400)
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Hash className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Enter your M-Pesa code</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            After paying KES {Number(amount).toLocaleString('en-KE')} for {month}, enter
            only the receipt code (e.g. UIJ3U7MV3D). For Pochi la Biashara, your landlord
            confirms it on their phone — PayHero cannot see Pochi payments.
          </p>
        </div>
      </div>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="UIJ3U7MV3D"
        maxLength={16}
        autoComplete="off"
        spellCheck={false}
        className="rounded-xl bg-background text-sm font-mono tracking-wider h-12"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {success}
        </p>
      )}

      <Button
        onClick={submit}
        disabled={loading || !codeReady}
        className="w-full rounded-xl h-11 bg-accent text-accent-foreground gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Submit M-Pesa code'
        )}
      </Button>
    </div>
  )
}
