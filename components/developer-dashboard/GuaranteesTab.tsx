'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck, Loader2, Check, X, AlertTriangle, ExternalLink, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  GUARANTEE_STATUS_LABEL,
  type GuaranteeStatus,
  type RentGuarantee,
} from '@/lib/guarantees'
import { fmtKES } from '@/components/developer-dashboard/helpers'
import { toast } from 'sonner'

export function GuaranteesTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<RentGuarantee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'active' | 'claims' | 'all'>('pending')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [payoutRef, setPayoutRef] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/guarantees')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRows(data.guarantees || [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load guarantees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'pending') {
      return rows.filter((r) => ['applied', 'under_review'].includes(r.status))
    }
    if (filter === 'active') {
      return rows.filter((r) => ['approved', 'active'].includes(r.status))
    }
    if (filter === 'claims') {
      return rows.filter((r) => ['defaulted', 'claimed'].includes(r.status))
    }
    return rows
  }, [rows, filter])

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setActioningId(id)
    try {
      const res = await fetch(`/api/guarantees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Guarantee ${action.replace('_', ' ')} successful`)
      setRejectingId(null)
      setRejectReason('')
      setPayoutRef('')
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActioningId(null)
    }
  }

  const viewStatement = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('guarantee-documents')
      .createSignedUrl(path, 60 * 5)
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not open statement')
  }

  const pendingCount = rows.filter((r) => ['applied', 'under_review'].includes(r.status)).length
  const claimCount = rows.filter((r) => ['defaulted', 'claimed'].includes(r.status)).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent" />
            Rent Guarantee Underwriting
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manual review queue for the Nairobi pilot. Approve only when M-Pesa + employment look stable.
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              ['pending', `Pending (${pendingCount})`],
              ['active', 'Active'],
              ['claims', `Claims (${claimCount})`],
              ['all', 'All'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === id
                  ? 'bg-card border-border text-foreground shadow-xs'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No guarantees in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <div key={g.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {(g.tenant as any)?.full_name || 'Tenant'} · {fmtKES(g.monthly_rent)}/mo
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(g.property as any)?.property_name || 'Property'} · fee {fmtKES(g.monthly_fee_amount)} ({g.fee_percent}%)
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {(g.tenant as any)?.email} · {g.phone_number || '—'} · Employer: {g.employer_name || '—'}
                    {g.declared_income != null ? ` · Income KES ${Number(g.declared_income).toLocaleString()}` : ''}
                  </p>
                </div>
                <StatusPill status={g.status} />
              </div>

              {g.tenant_notes && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-2.5">{g.tenant_notes}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {g.mpesa_statement_path && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => viewStatement(g.mpesa_statement_path!)}
                  >
                    <FileText className="size-3.5" />
                    View statement
                    <ExternalLink className="size-3" />
                  </Button>
                )}

                {['applied', 'under_review'].includes(g.status) && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      disabled={actioningId === g.id}
                      onClick={() => act(g.id, 'approve')}
                    >
                      {actioningId === g.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3.5" />}
                      Approve & activate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 text-destructive"
                      onClick={() => setRejectingId(rejectingId === g.id ? null : g.id)}
                    >
                      <X className="size-3.5" />
                      Reject
                    </Button>
                  </>
                )}

                {g.status === 'claimed' && (
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <Input
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      placeholder="Payout M-Pesa / bank ref"
                      className="h-8 text-xs max-w-[220px]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={actioningId === g.id}
                      onClick={() =>
                        act(g.id, 'resolve_claim', {
                          payoutReference: payoutRef,
                          markEnded: false,
                        })
                      }
                    >
                      Mark claim paid
                    </Button>
                  </div>
                )}

                {g.status === 'active' && (
                  <span className="text-[11px] text-muted-foreground self-center">
                    Coverage {g.coverage_start} → {g.coverage_end}
                  </span>
                )}
              </div>

              {rejectingId === g.id && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs"
                    disabled={actioningId === g.id}
                    onClick={() =>
                      act(g.id, 'reject', { rejectionReason: rejectReason || 'Does not meet criteria' })
                    }
                  >
                    Confirm reject
                  </Button>
                </div>
              )}

              {g.claim_notes && (
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  Claim: {fmtKES(g.claim_amount || 0)} — {g.claim_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: GuaranteeStatus }) {
  const tone =
    status === 'active' || status === 'approved'
      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      : status === 'rejected' || status === 'claimed' || status === 'defaulted'
        ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
        : 'bg-secondary text-muted-foreground border-border'

  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>
      {GUARANTEE_STATUS_LABEL[status]}
    </span>
  )
}
