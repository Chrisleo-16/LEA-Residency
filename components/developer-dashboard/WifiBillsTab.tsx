'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Wifi, Users, TrendingUp, Clock, RefreshCw, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatBar } from './StatCard'
import { SkeletonRows } from './DataRow'
import { fmt, fmtKES, timeAgo } from './helpers'

interface WifiPayment {
  id: string
  tenant_id: string | null
  landlord_id: string | null
  amount: number
  mpesa_code: string | null
  payment_month: string
  payment_date: string
  status: string
  notes: string | null
  tenant: { id: string; full_name: string; email: string } | null
  landlord: { id: string; full_name: string; business_name: string | null; email: string } | null
}

interface WifiSummary {
  revenue: number
  pending: number
  totalTransactions: number
  wifiEnabledTenants: number
}

const EMPTY_SUMMARY: WifiSummary = { revenue: 0, pending: 0, totalTransactions: 0, wifiEnabledTenants: 0 }

export function WifiBillsTab() {
  const [payments, setPayments] = useState<WifiPayment[]>([])
  const [summary, setSummary] = useState<WifiSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/developer/wifi-payments')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load Wi-Fi payments')
      setPayments(json.payments || [])
      setSummary({ ...EMPTY_SUMMARY, ...json.summary })
    } catch (err: any) {
      toast.error('Failed to load Wi-Fi bills', { description: err?.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/smart-sync-wifi', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Sync failed')
      const stats = json.stats || { updated: 0, created: 0, skipped: 0 }
      toast.success('Wi-Fi sync complete', {
        description: `${stats.updated} updated, ${stats.created} created, ${stats.skipped} skipped`,
      })
      load()
    } catch (err: any) {
      toast.error('Wi-Fi sync failed', { description: err?.message })
    } finally {
      setSyncing(false)
    }
  }

  const filtered = payments.filter((p) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      p.tenant?.full_name?.toLowerCase().includes(q) ||
      p.landlord?.full_name?.toLowerCase().includes(q) ||
      p.landlord?.business_name?.toLowerCase().includes(q) ||
      p.mpesa_code?.toLowerCase().includes(q)
    )
  })

  const statusStyle = (status: string) => {
    if (status === 'complete' || status === 'confirmed')
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    if (status === 'partial')
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    if (status === 'pending')
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  }

  return (
    <div className="space-y-6">
      <StatBar
        loading={loading}
        items={[
          { label: 'Wi-Fi Revenue', value: loading ? '—' : fmtKES(summary.revenue), icon: TrendingUp, tone: 'green' },
          { label: 'Transactions', value: loading ? '—' : fmt(summary.totalTransactions), icon: Wifi, tone: 'blue' },
          {
            label: 'Pending', value: loading ? '—' : fmt(summary.pending), icon: Clock,
            tone: summary.pending > 0 ? 'amber' : 'slate',
          },
          { label: 'Wi-Fi Tenants', value: loading ? '—' : fmt(summary.wifiEnabledTenants), icon: Users, tone: 'purple' },
        ]}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Wifi className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Wi-Fi Bills</span>
            <span className="text-xs text-muted-foreground">
              {loading ? 'loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tenant, landlord, code..."
                className="h-8 w-56 rounded-lg border border-border bg-muted/40 pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync M-Pesa'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="divide-y divide-border"><SkeletonRows count={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-14 text-center text-sm text-muted-foreground">
              No Wi-Fi payments {query ? 'match your search' : 'recorded yet'}
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tenant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Landlord</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">M-Pesa Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Month</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{p.tenant?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{p.tenant?.email || ''}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{p.landlord?.business_name || p.landlord?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{p.landlord?.email || ''}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtKES(Number(p.amount))}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs">
                      {p.mpesa_code || <span className="text-muted-foreground">N/A</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.payment_month}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{timeAgo(p.payment_date)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyle(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}