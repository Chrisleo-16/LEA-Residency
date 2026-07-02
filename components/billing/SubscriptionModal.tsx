'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  CreditCard, AlertCircle, CheckCircle2,
  Copy, Check, Building2, Smartphone
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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className={`bg-gradient-to-r ${tierGradient} p-6 text-white`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">LEA Executive</h2>
                <p className="text-white/70 text-xs">Residency & Apts</p>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1">
              {isSetup ? 'Activate Your Account' : 'Subscription Required'}
            </h3>
            <p className="text-white/70 text-sm">
              {isSetup
                ? 'Complete setup to access your property dashboard'
                : 'Your subscription has lapsed — renew to continue'}
            </p>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {/* Plan summary */}
            <div className="bg-secondary rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Plan Details
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-semibold text-foreground capitalize">
                  {subscription.tier}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Units</span>
                <span className="text-sm font-semibold text-foreground">
                  {subscription.unit_count}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">
                  {isSetup ? 'One-time setup fee' : 'Monthly fee'}
                </span>
                <span className="text-lg font-bold text-foreground">
                  KES {amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Tenant assurance */}
            <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 leading-relaxed">
                Tenants pay only their rent — no hidden fees or extra charges ever.
              </p>
            </div>

            {/* Pochi la Biashara payment card */}
            <div className="bg-secondary rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-accent" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pay via Pochi la Biashara
                </p>
              </div>

              <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Pochi Number</p>
                  <p className="text-lg font-bold text-foreground tracking-wide">{POCHI_NUMBER}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  className="rounded-xl border-border h-10 px-3 gap-1.5 text-xs shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-1.5 pt-1">
                {[
                  'Go to M-Pesa on your phone',
                  'Select Lipa na M-Pesa → Pochi la Biashara',
                  `Enter the number ${POCHI_NUMBER}`,
                  `Enter amount KES ${amount.toLocaleString()} and your PIN`,
                  'Tap "I\'ve Completed Payment" below once done',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border text-xs leading-relaxed ${messageColors[messageType]}`}>
                {messageType === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : messageType === 'error'
                    ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    : <CreditCard className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                }
                {message}
              </div>
            )}

            {/* Confirm button */}
            <Button
              onClick={handleConfirmPayment}
              disabled={confirming}
              className="w-full h-12 rounded-2xl font-semibold text-sm gap-2 bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25"
            >
              {confirming ? (
                <>
                  <Loader2Icon />
                  Submitting confirmation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  I've Completed Payment
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Payments are verified manually by our team.
              Your dashboard unlocks once payment is confirmed.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          LEA Executive Residency · Powered by LEA Platform
        </p>
      </div>
    </div>
  )
}

// Small inline spinner to avoid pulling in another lucide import path issue
function Loader2Icon() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}