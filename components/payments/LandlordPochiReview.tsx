'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, XCircle, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { readJsonResponse } from '@/lib/api/readJsonResponse'

type PaymentRow = {
  id: string
  tenant_id: string | null
  amount: number
  mpesa_code: string | null
  payment_month: string
  tenant_name?: string | null
  profiles?: { full_name?: string | null } | null
}

type Tenant = { id: string; full_name?: string | null }

export default function LandlordPochiReview({
  payments,
  tenants,
  onDone,
  onError,
}: {
  payments: PaymentRow[]
  tenants: Tenant[]
  onDone: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  if (!payments.length) return null

  const act = async (paymentId: string, action: 'landlord_confirm' | 'landlord_decline') => {
    setBusyId(paymentId)
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
        body: JSON.stringify({ action, paymentId }),
      })
      const { ok, data, error } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(error || data?.error || 'Failed')
      onDone(data.message || (action === 'landlord_confirm' ? 'Confirmed' : 'Declined'))
    } catch (e: any) {
      onError(e.message || 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
          <Hash className="w-4 h-4 text-amber-700 dark:text-amber-300" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            Pochi codes to confirm
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Check each code on your Pochi la Biashara SMS, then confirm or decline.
            PayHero cannot see these payments.
          </p>
        </div>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {payments.map((p) => {
          const tenant =
            tenants.find((t) => t.id === p.tenant_id)?.full_name ||
            p.profiles?.full_name ||
            p.tenant_name ||
            'Tenant'
          const busy = busyId === p.id
          return (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-secondary/20"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{tenant}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono font-bold text-foreground">
                    {p.mpesa_code || '—'}
                  </span>
                  {' · '}
                  KES {Number(p.amount).toLocaleString('en-KE')}
                  {' · '}
                  {p.payment_month}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => act(p.id, 'landlord_confirm')}
                  className="rounded-xl h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Confirm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => act(p.id, 'landlord_decline')}
                  className="rounded-xl h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Decline
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
