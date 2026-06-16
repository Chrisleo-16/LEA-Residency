'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CreditCard, AlertCircle, CheckCircle2,
  Clock, Loader2, Building2, Smartphone, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

export default function SubscriptionModal({ subscription, onPaid }: SubscriptionModalProps) {
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [sent, setSent] = useState(false)
  const [polling, setPolling] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [loadingPhone, setLoadingPhone] = useState(true)

  const isSetup = !subscription.setup_fee_paid
  const amount = isSetup ? 5000 : subscription.monthly_fee

  const tierColors: Record<string, string> = {
    starter: 'from-blue-500 to-blue-600',
    standard: 'from-accent to-accent/80',
    growth: 'from-purple-500 to-purple-600',
    enterprise: 'from-amber-500 to-amber-600',
  }
  const tierGradient = tierColors[subscription.tier] || tierColors.starter

  // Pre-fill phone from profile
  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', session.user.id)
          .single()
        if (profile?.phone_number) setPhone(profile.phone_number)
      } catch (err) {
        console.error('[SubscriptionModal] Error fetching phone:', err)
      } finally {
        setLoadingPhone(false)
      }
    }
    fetchPhone()
  }, [])

  // Countdown timer while polling
  useEffect(() => {
    if (!polling) return
    setSecondsLeft(120)
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setPolling(false)
          setSent(false)
          setMessage('Payment window expired. Please try again.')
          setMessageType('error')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [polling])

  // Poll for payment confirmation
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/billing/status')
        const data = await res.json()
        if (data.subscription?.status === 'active') {
          clearInterval(interval)
          setPolling(false)
          setSent(false)
          setMessage('Payment confirmed! Your account is now active.')
          setMessageType('success')
          setTimeout(onPaid, 1500)
        }
      } catch {
        // silently retry
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [polling, onPaid])

  const handlePay = async () => {
    if (!phone || phone.length < 9) {
      setMessage('Please enter a valid M-Pesa phone number.')
      setMessageType('error')
      return
    }

    setPaying(true)
    setMessage('')

    try {
      const res = await fetch('/api/billing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Failed to initiate payment. Please try again.')
        setMessageType('error')
        return
      }

      setSent(true)
      setPolling(true)
    } catch {
      setMessage('Something went wrong. Please try again.')
      setMessageType('error')
    } finally {
      setPaying(false)
    }
  }

  const handleRetry = () => {
    setSent(false)
    setPolling(false)
    setMessage('')
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

            {/* Sent / polling state */}
            {sent ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Smartphone className="w-8 h-8 text-accent animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">STK Push Sent! 📱</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Check your phone for the M-Pesa prompt and enter your PIN to
                    activate your account.
                  </p>
                </div>

                {/* Countdown */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-blue-700">
                      Waiting for confirmation...
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      Prompt expires in {secondsLeft}s
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="w-full rounded-xl border-border text-sm"
                >
                  Didn't receive prompt? Try again
                </Button>
              </div>
            ) : (
              <>
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

                {/* Phone input */}
                <div>
                  <Label className="text-sm font-medium text-foreground block mb-2">
                    M-Pesa Number
                  </Label>
                  {loadingPhone ? (
                    <div className="h-12 bg-secondary rounded-xl flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background border-border text-foreground rounded-xl h-12 text-base focus:ring-2 focus:ring-accent/50"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                    An M-Pesa STK push prompt will be sent to this number.
                  </p>
                </div>

                {/* How it works */}
                {/* <div className="bg-muted/50 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                    How it works:
                  </p>
                  {[
                    '1. Click "Send STK Push" below',
                    '2. M-Pesa prompt appears on your phone',
                    '3. Enter your M-Pesa PIN to confirm',
                    '4. Dashboard unlocks automatically ✅',
                  ].map((step) => (
                    <p key={step} className="text-xs text-muted-foreground font-medium">
                      {step}
                    </p>
                  ))}
                </div> */}

                {/* Message */}
                {message && (
                  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border text-xs leading-relaxed ${messageColors[messageType]}`}>
                    {messageType === 'success'
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      : messageType === 'error'
                        ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        : <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    }
                    {message}
                  </div>
                )}

                {/* Pay button */}
                <Button
                  onClick={handlePay}
                  disabled={paying || !phone || phone.length < 9}
                  className="w-full h-12 rounded-2xl font-semibold text-sm gap-2 bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending M-Pesa prompt...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Send STK Push — KES {amount.toLocaleString()}
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Secured by M-Pesa & Safaricom.
                  Your dashboard unlocks immediately after payment.
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          LEA Executive Residency · Powered by LEA Platform
        </p>
      </div>
    </div>
  )
}