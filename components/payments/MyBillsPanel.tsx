'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Receipt,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { readJsonResponse } from '@/lib/api/readJsonResponse'

interface Props {
  user: User | null
  tenantId?: string // landlord viewing a specific tenant
  onPayTotal?: (totalDue: number, summary: any) => void
  onPaySeparate?: (item: {
    charge_type: string
    label: string
    amount: number
  }) => void
}

const PAYMENTS_PAGE_SIZE = 5

function money(n: number) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

export default function MyBillsPanel({ user, tenantId, onPayTotal, onPaySeparate }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [paymentsPage, setPaymentsPage] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ generate: '1' })
      if (tenantId) qs.set('tenant_id', tenantId)

      const supabase = (await import('@/lib/supabase/client')).createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(`/api/tenancy/account?${qs}`, {
        credentials: 'include',
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      })
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || 'Failed to load account')
      setSummary(data)
      setPaymentsPage(0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, tenantId])

  useEffect(() => {
    load()
  }, [load])

  const regenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/tenancy/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_bill',
          tenantId: tenantId || user?.id,
        }),
      })
      const { ok, error: apiError } = await readJsonResponse(res)
      if (!ok) throw new Error(apiError || 'Failed to generate bill')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const allPayments = useMemo(
    () => (summary?.recentPayments as any[]) || [],
    [summary]
  )
  const paymentsPageCount = Math.max(
    1,
    Math.ceil(allPayments.length / PAYMENTS_PAGE_SIZE)
  )
  const pageSafe = Math.min(paymentsPage, paymentsPageCount - 1)
  const pagedPayments = allPayments.slice(
    pageSafe * PAYMENTS_PAGE_SIZE,
    pageSafe * PAYMENTS_PAGE_SIZE + PAYMENTS_PAGE_SIZE
  )

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
        <p className="font-medium">{error}</p>
        <p className="text-xs text-amber-800">
          My Bills needs you linked to a landlord property (via referral / tenant slot).
          If you just joined, ask your landlord to confirm your unit assignment, then retry.
        </p>
        <Button size="sm" variant="outline" onClick={load}>
          Retry
        </Button>
      </div>
    )
  }

  const account = summary?.account
  const currentBill = summary?.currentBill
  const openBills = summary?.openBills || []
  const totalDue = Number(summary?.totalDue || 0)
  const rentDue = Number(summary?.rentDue ?? totalDue)
  const separateDues = (summary?.separateDues || []) as Array<{
    charge_type: string
    label: string
    amount: number
    billing_period: string
  }>
  const credit = Number(summary?.creditBalance || 0)
  const running = Number(summary?.runningBalance || 0)
  const lines = (currentBill?.bill_lines || []).filter(
    (l: any) => String(l.charge_type).toLowerCase() !== 'wifi'
  )
  const periodRemaining = Math.max(
    0,
    Number(currentBill?.amount_due || 0) - Number(currentBill?.amount_paid || 0)
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            Tenancy account
            {account?.unit_number ? ` · Unit ${account.unit_number}` : ''}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Continuous balance — bills, payments, credits and arrears in one place.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={regenerate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          Refresh bill
        </Button>
      </div>

      {/* Balance strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-popover p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Rent &amp; bundled due
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {money(rentDue)}
          </p>
          {separateDues.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              + {money(separateDues.reduce((s, d) => s + Number(d.amount), 0))}{' '}
              separate fees
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-popover p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Credit
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {money(credit)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-popover p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Running balance
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              running > 0 ? 'text-amber-700' : running < 0 ? 'text-emerald-700' : 'text-foreground'
            }`}
          >
            {running > 0
              ? `${money(running)} outstanding`
              : running < 0
                ? `${money(Math.abs(running))} credit`
                : money(0)}
          </p>
        </div>
      </div>

      {/* Current period bill */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" />
            <span className="font-medium text-sm">
              Current bill
              {currentBill?.billing_period
                ? ` · ${currentBill.billing_period}`
                : ''}
            </span>
          </div>
          {currentBill && (
            <Badge
              variant="outline"
              className={`capitalize ${
                periodRemaining > 0
                  ? 'border-amber-300 text-amber-800'
                  : 'border-emerald-300 text-emerald-800'
              }`}
            >
              {periodRemaining > 0
                ? currentBill.status === 'partial'
                  ? 'partial'
                  : 'due'
                : 'paid'}
            </Badge>
          )}
        </div>
        {!currentBill || lines.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No lines for this period yet. Fixed rent generates automatically; variable
            charges (e.g. water) appear once set. Wi-Fi is paid after rent.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {lines.map((line: any) => (
              <div
                key={line.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{line.label}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {line.charge_type}
                    {line.is_arrears_carry ? ' · carried forward' : ''}
                    {(summary?.chargePlan || []).find(
                      (c: any) =>
                        c.charge_type === line.charge_type && c.pay_separately
                    )
                      ? ' · pay separately'
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(line.amount)}</p>
                  {Number(line.amount_outstanding) > 0 &&
                    Number(line.amount_outstanding) < Number(line.amount) && (
                      <p className="text-[11px] text-amber-700">
                        {money(line.amount_outstanding)} left
                      </p>
                    )}
                  {Number(line.amount_outstanding) === 0 && Number(line.amount) > 0 && (
                    <p className="text-[11px] text-emerald-700 flex items-center justify-end gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Paid
                    </p>
                  )}
                  {Number(line.amount_outstanding) > 0 &&
                    Number(line.amount_outstanding) === Number(line.amount) && (
                      <p className="text-[11px] text-amber-700">Pending</p>
                    )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between bg-accent/5 px-4 py-3 text-sm font-semibold">
              <span>Amount due this period</span>
              <span>{money(periodRemaining)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Open / overdue periods */}
      {openBills.length > 1 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Open periods across your account
          </p>
          {openBills.map((b: any) => (
            <div
              key={b.id}
              className="flex justify-between text-sm text-amber-900/90"
            >
              <span>{b.billing_period}</span>
              <span>
                {money(Math.max(0, Number(b.amount_due) - Number(b.amount_paid)))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent payments with allocations — paginated */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent payments & allocations
          </p>
          {allPayments.length > PAYMENTS_PAGE_SIZE && (
            <p className="text-[11px] text-muted-foreground">
              {pageSafe * PAYMENTS_PAGE_SIZE + 1}–
              {Math.min((pageSafe + 1) * PAYMENTS_PAGE_SIZE, allPayments.length)} of{' '}
              {allPayments.length}
            </p>
          )}
        </div>
        <div className="space-y-2">
          {allPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            pagedPayments.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border px-4 py-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{money(p.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.payment_month}
                      {p.mpesa_code ? ` · ${p.mpesa_code}` : ''}
                      {` · ${p.status}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0 h-fit">
                    {p.payment_method || 'mpesa'}
                  </Badge>
                </div>
                {(p.payment_allocations || []).length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                    {p.payment_allocations.map((a: any) => (
                      <li key={a.id}>
                        →{' '}
                        {a.allocation_type === 'credit'
                          ? a.notes || 'Credit'
                          : a.notes || 'Bill line'}
                        : {money(a.amount)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>

        {allPayments.length > PAYMENTS_PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={pageSafe <= 0}
              onClick={() => setPaymentsPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pageSafe + 1} / {paymentsPageCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={pageSafe >= paymentsPageCount - 1}
              onClick={() =>
                setPaymentsPage((p) => Math.min(paymentsPageCount - 1, p + 1))
              }
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {separateDues.length > 0 && (
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Pay separately
          </p>
          <p className="text-xs text-muted-foreground">
            These fees are not included in the rent total — pay each on its own.
          </p>
          {separateDues.map((d) => (
            <div
              key={`${d.charge_type}-${d.billing_period}-${d.amount}`}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium">{d.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {d.billing_period} · {money(d.amount)}
                </p>
              </div>
              {onPaySeparate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl shrink-0"
                  onClick={() =>
                    onPaySeparate({
                      charge_type: d.charge_type,
                      label: d.label,
                      amount: d.amount,
                    })
                  }
                >
                  Pay {d.label}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {onPayTotal && rentDue > 0 && (
        <Button
          className="w-full h-12 bg-accent text-accent-foreground font-semibold"
          onClick={() => onPayTotal(rentDue, summary)}
        >
          Pay rent &amp; bundled {money(rentDue)}
        </Button>
      )}
    </div>
  )
}
