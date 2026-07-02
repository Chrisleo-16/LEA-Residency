'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertCircle, CheckCircle2, Copy, Check,
  Building2, Wallet, Loader2
} from 'lucide-react'

interface Subscription {
  tier: string
  monthly_fee: number
  setup_fee_paid: boolean
  status: string
  unit_count: number
  current_period_end?: string
}

interface SubscriptionModalProps {
  subscription: Subscription
  onPaid: () => void
}

const POCHI_NUMBER = '+254 748 333 763'

export default function SubscriptionModal({ subscription, onPaid }: SubscriptionModalProps) {
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')

  const isSetup = !subscription.setup_fee_paid
  const amount = isSetup ? 5000 : subscription.monthly_fee

  const tierColors: Record<string, string> = {
    starter: 'from-blue-500 to-blue-600',
    standard: 'from-accent to-accent/80',
    growth: 'from-purple-500 to-purple-600',
    enterprise: 'from-amber-500 to-amber-600',
  }
  const tierGradient = tierColors[subscription.tier] || tierColors.starter

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(POCHI_NUMBER.replace(/\s+/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage('Could not copy automatically — please copy the number manually.')
      setMessageType('error')
    }
  }

  const handleConfirmPayment = async () => {
    setConfirming(true)
    setMessage('')

    try {
      const res = await fetch('/api/billing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, type: isSetup ? 'setup' : 'subscription' }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Failed to submit confirmation. Please try again.')
        setMessageType('error')
        return
      }

      setMessage('Thanks! We\u2019ve received your confirmation and will verify your payment shortly.')
      setMessageType('success')
      setTimeout(onPaid, 1800)
    } catch {
      setMessage('Something went wrong. Please try again.')
      setMessageType('error')
    } finally {
      setConfirming(false)
    }
  }

  const messageColors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">

            {/* Left: brand + amount */}
            <div className={`bg-gradient-to-br ${tierGradient} p-6 sm:p-7 text-white flex flex-col justify-between`}>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base leading-tight">LEA Executive</h2>
                    <p className="text-white/70 text-xs">Residency & Apts</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1.5">
                  {isSetup ? 'Activate Your Account' : 'Subscription Required'}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {isSetup
                    ? 'Complete setup to access your property dashboard'
                    : 'Your subscription has lapsed — renew to continue'}
                </p>
              </div>

              <div className="mt-8 sm:mt-6">
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">
                  {isSetup ? 'One-time setup fee' : 'Amount due'}
                </p>
                <p className="text-4xl font-bold tracking-tight">
                  KES {amount.toLocaleString()}
                </p>
                <p className="text-xs text-white/60 mt-1.5 capitalize">
                  {subscription.tier} plan · {subscription.unit_count} units
                </p>

                <div className="flex items-start gap-2 bg-white/10 rounded-xl p-3 mt-5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-white/80">
                    Tenants pay only their rent — no hidden fees, ever.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Pochi payment */}
            <div className="p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">
                    Pay with Pochi la Biashara
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full bg-secondary border border-border rounded-xl p-4 flex items-center justify-between gap-3 text-left transition-colors hover:border-accent/40"
                >
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pochi Number</p>
                    <p className="text-lg font-bold text-foreground tracking-wide">{POCHI_NUMBER}</p>
                  </div>
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-background flex items-center justify-center">
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </span>
                </button>

                <ol className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    'Open M-Pesa on your phone',
                    'Select Lipa na M-Pesa, then Pochi la Biashara',
                    'Enter the number above',
                    `Enter KES ${amount.toLocaleString()} and your PIN`,
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-4 h-4 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>

                {message && (
                  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border text-xs leading-relaxed ${messageColors[messageType]}`}>
                    {messageType === 'success'
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      : messageType === 'error'
                        ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        : <Wallet className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    }
                    {message}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <Button
                  onClick={handleConfirmPayment}
                  disabled={confirming}
                  className="w-full h-12 rounded-2xl font-semibold text-sm gap-2 bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting confirmation...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      I've Completed Payment
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  Payments are verified manually — your dashboard unlocks once confirmed.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-4">
            LEA Executive Residency · Powered by LEA Platform
          </p>
        </div>
      </div>
    </div>
  )
}