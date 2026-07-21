'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, CheckCircle2, Clock, TrendingUp, Wallet, AlertTriangle, Gift } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatBar } from './StatCard'
import { DonutBreakdown } from './DonutBreakdown'
import { DataRow, EmptyRow, SkeletonRows } from './DataRow'
import { fmt, fmtKES, fmtDate, timeAgo, statusBadgeClass, TONE_HEX } from './helpers'
import type { LandlordSubscription, SubscriptionPayment, SubscriptionsSummary } from './types'

interface SubscriptionsTabProps {
  refreshKey: number
}

const EMPTY_SUMMARY: SubscriptionsSummary = {
  mrr: 0, activeCount: 0, overdueCount: 0, freeAccessCount: 0, totalCollected: 0, pendingCount: 0,
}

export function SubscriptionsTab({ refreshKey }: SubscriptionsTabProps) {
  const [summary, setSummary] = useState<SubscriptionsSummary>(EMPTY_SUMMARY)
  const [subscriptions, setSubscriptions] = useState<LandlordSubscription[]>([])
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/developer/subscriptions')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load subscriptions')
        if (cancelled) return
        setSummary(data.summary)
        setSubscriptions(data.subscriptions || [])
        setPayments(data.payments || [])
        setError(null)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-500/20 bg-red-500/5 p-4 py-4 text-sm text-red-600 dark:text-red-400">{error}</Card>
      )}

      <StatBar
        items={[
          { label: 'MRR', value: loading ? '—' : fmtKES(summary.mrr), icon: TrendingUp, tone: 'green' },
          { label: 'Active', value: loading ? '—' : fmt(summary.activeCount), icon: CheckCircle2, tone: 'green' },
          {
            label: 'Overdue', value: loading ? '—' : fmt(summary.overdueCount), icon: AlertTriangle,
            tone: summary.overdueCount > 0 ? 'red' : 'slate',
          },
          { label: 'Free Access', value: loading ? '—' : fmt(summary.freeAccessCount), icon: Gift, tone: 'blue' },
          { label: 'Total Collected', value: loading ? '—' : fmtKES(summary.totalCollected), icon: Wallet, tone: 'purple' },
          {
            label: 'Pending', value: loading ? '—' : fmt(summary.pendingCount), icon: Clock,
            tone: summary.pendingCount > 0 ? 'amber' : 'slate',
          },
        ]}
        loading={loading}
      />

      {!loading && (summary.activeCount + summary.overdueCount + summary.freeAccessCount > 0) && (
        <DonutBreakdown
          title="Subscription Status Mix"
          description="How your landlord base splits across billing status."
          centerValue={summary.activeCount + summary.overdueCount + summary.freeAccessCount}
          centerLabel="Landlords"
          segments={[
            { label: 'Active', value: summary.activeCount, colorHex: TONE_HEX.green },
            { label: 'Overdue', value: summary.overdueCount, colorHex: TONE_HEX.red },
            { label: 'Free Access', value: summary.freeAccessCount, colorHex: TONE_HEX.blue },
          ]}
          highlight={
            summary.overdueCount > 0
              ? {
                  icon: <AlertTriangle className="size-4 shrink-0 text-red-600 dark:text-red-400" />,
                  title: `${summary.overdueCount} landlord${summary.overdueCount === 1 ? '' : 's'} overdue`,
                  description: 'Their next M-Pesa STK push will retry automatically via the billing cron.',
                }
              : {
                  icon: <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />,
                  title: 'All subscriptions in good standing',
                  description: 'No overdue landlords right now.',
                }
          }
        />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Payments Received</div>
        <div>
          {loading ? (
            <SkeletonRows />
          ) : payments.length === 0 ? (
            <EmptyRow>No subscription payments yet</EmptyRow>
          ) : (
            payments.map((p) => (
              <DataRow
                key={p.id}
                primary={p.landlord_name}
                secondary={`${p.payment_type === 'setup' ? 'Setup Fee' : `Subscription — ${p.billing_period}`} · ${timeAgo(p.payment_date || p.created_at)}`}
                fields={[
                  { label: 'Amount', value: fmtKES(Number(p.amount)) },
                  {
                    label: 'M-Pesa Code',
                    value: p.mpesa_code ? (
                      <span className="inline-flex items-center gap-1 font-mono">
                        {p.mpesa_code}
                        <button onClick={() => copy(p.mpesa_code!, p.id)} className="text-muted-foreground hover:text-foreground">
                          {copied === p.id ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                        </button>
                      </span>
                    ) : '—',
                    mono: true,
                  },
                ]}
                status={
                  <Badge variant="outline" className={statusBadgeClass(p.status)}>
                    {p.status}
                  </Badge>
                }
              />
            ))
          )}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Landlord Subscriptions</div>
        <div>
          {loading ? (
            <SkeletonRows />
          ) : subscriptions.length === 0 ? (
            <EmptyRow>No landlord subscriptions yet</EmptyRow>
          ) : (
            subscriptions.map((s) => {
              const hasFreeAccess = !!s.free_access_until && new Date(s.free_access_until) > new Date()
              return (
                <DataRow
                  key={s.id}
                  primary={s.landlord?.full_name || s.landlord?.landlord_code || s.landlord_id}
                  secondary={
                    hasFreeAccess
                      ? `Free until ${fmtDate(s.free_access_until)}`
                      : `${s.tier || 'standard'} · Period ends ${fmtDate(s.current_period_end)}`
                  }
                  fields={[
                    { label: 'Monthly Fee', value: fmtKES(s.monthly_fee || 0) },
                    { label: 'Units', value: s.unit_count ?? '—' },
                    {
                      label: 'Setup Fee',
                      value: s.setup_fee_paid ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="size-3" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Clock className="size-3" /> Pending
                        </span>
                      ),
                    },
                  ]}
                  status={
                    <Badge
                      variant="outline"
                      className={hasFreeAccess ? statusBadgeClass('pending') : statusBadgeClass(s.status)}
                    >
                      {hasFreeAccess ? 'Free Access' : s.status}
                    </Badge>
                  }
                />
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
