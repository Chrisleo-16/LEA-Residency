'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { User } from '@supabase/supabase-js'
import { CreditCard, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface Subscription {
  tier: string
  monthly_fee: number
  unit_count: number
  status: string
  setup_fee_paid: boolean
  current_period_start: string
  current_period_end: string
  free_access_until?: string | null
}

interface Payment {
  id: string
  amount: number
  status: string
  payment_type: string
  billing_period: string
  payment_date: string | null
  created_at: string
}
interface BillingPageProps {
  user: User | null
}

export default function BillingPage({ user }: BillingPageProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')

  const fetchStatus = async () => {
    const res = await fetch('/api/billing/status')
    const data = await res.json()
    setSubscription(data.subscription)
    setPayments(data.payments || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handlePay = async () => {
    setPaying(true)
    setMessage('')
    try {
      const res = await fetch('/api/billing/pay', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Failed to initiate payment')
      } else {
        setMessage(data.message || 'Check your phone for the M-Pesa prompt')
        setTimeout(fetchStatus, 5000)
      }
    } catch {
      setMessage('Something went wrong. Try again.')
    }
    setPaying(false)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    active: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2, label: 'Active' },
    pending: { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock, label: 'Setup Pending' },
    overdue: { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle, label: 'Overdue' },
    suspended: { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle, label: 'Suspended' },
    exempt: { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle2, label: 'Exempt' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No subscription found.
      </div>
    )
  }

  const config = statusConfig[subscription.status] || statusConfig.pending
  const StatusIcon = config.icon
  const hasFreeAccess =
    !!subscription.free_access_until && new Date(subscription.free_access_until) > new Date()
  const needsPayment =
    subscription.status !== 'active' && subscription.status !== 'exempt' && !hasFreeAccess

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your LEA subscription and payment history
        </p>
      </div>

      {/* Current plan card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Current Plan</p>
            <p className="text-xl font-bold text-foreground capitalize mt-1">{subscription.tier}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${config.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {config.label}
          </div>
        </div>

        {hasFreeAccess && (
          <p className="text-xs text-muted-foreground">
            Free access until {formatDate(subscription.free_access_until as string)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Monthly Fee</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              KES {subscription.monthly_fee.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Units</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{subscription.unit_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Period</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Setup Fee</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {subscription.setup_fee_paid ? 'Paid' : 'Pending'}
            </p>
          </div>
        </div>

        {needsPayment && (
          <div className="pt-3 border-t border-border">
            <Button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {paying
                ? 'Sending request...'
                : !subscription.setup_fee_paid
                  ? `Pay Setup Fee — KES 5,000`
                  : `Pay Now — KES ${subscription.monthly_fee.toLocaleString()}`}
            </Button>
            {message && (
              <p className="text-xs text-center text-muted-foreground mt-2">{message}</p>
            )}
          </div>
        )}
      </div>

      {/* Payment history */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="font-semibold text-foreground text-sm">Payment History</p>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No payments yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {p.payment_type === 'setup' ? 'Setup Fee' : `Subscription — ${p.billing_period}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.payment_date ? formatDate(p.payment_date) : formatDate(p.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    KES {p.amount.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-0.5 capitalize ${
                    p.status === 'complete' ? 'text-green-600' :
                    p.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {p.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}