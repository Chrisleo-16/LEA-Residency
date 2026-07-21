'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, Wallet, CheckCircle2, Clock, Layers } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatBar } from './StatCard'
import { DataRow, EmptyRow, SkeletonRows } from './DataRow'
import { fmt, fmtKES, timeAgo, statusBadgeClass } from './helpers'

interface PaymentRow {
  id: string
  amount: number
  status: string
  payment_month: string
  mpesa_code: string | null
  phone_number: string | null
  payment_method: string | null
  created_at: string
  tenant_name: string | null
  tenant_email: string | null
}

interface PaymentsTabProps {
  refreshKey: number
}

const EMPTY_SUMMARY = { total: 0, completed: 0, pending: 0, revenue: 0 }

export function PaymentsTab({ refreshKey }: PaymentsTabProps) {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/developer/payments')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load payments')
        if (cancelled) return
        setSummary(data.summary)
        setPayments(data.payments || [])
      })
      .catch((err) => { if (!cancelled) toast.error('Failed to load payments', { description: err.message }) })
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
      <StatBar
        items={[
          { label: 'Total Received', value: loading ? '—' : fmtKES(summary.revenue), icon: Wallet, tone: 'green' },
          { label: 'Completed', value: loading ? '—' : fmt(summary.completed), icon: CheckCircle2, tone: 'green' },
          {
            label: 'Pending', value: loading ? '—' : fmt(summary.pending), icon: Clock,
            tone: summary.pending > 0 ? 'amber' : 'slate',
          },
          { label: 'All Records', value: loading ? '—' : fmt(summary.total), icon: Layers, tone: 'purple' },
        ]}
        loading={loading}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Tenant Rent Payments</div>
        <div>
          {loading ? (
            <SkeletonRows />
          ) : payments.length === 0 ? (
            <EmptyRow>No payments yet</EmptyRow>
          ) : (
            payments.map((p) => (
              <DataRow
                key={p.id}
                primary={p.tenant_name || p.phone_number || '—'}
                secondary={`${p.phone_number || p.tenant_email || '—'} · ${timeAgo(p.created_at)}`}
                fields={[
                  { label: 'Month', value: p.payment_month },
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
                  { label: 'Method', value: p.payment_method || '—' },
                ]}
                status={
                  <Badge variant="outline" className={statusBadgeClass(p.status)}>
                    {p.status || '—'}
                  </Badge>
                }
              />
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
