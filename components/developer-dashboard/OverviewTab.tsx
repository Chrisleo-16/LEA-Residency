'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Building2, Home, TrendingUp, AlertTriangle, CreditCard, Bug, Terminal,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatBar } from './StatCard'
import { SkeletonRows } from './DataRow'
import { fmt, fmtKES, timeAgo } from './helpers'
import type { SentryEvent, LogEntry, TabId } from './types'

const supabase = createClient()

interface PlatformCounts {
  totalUsers: number
  landlords: number
  tenants: number
  totalRevenue: number
  openIssues: number
  pendingPayments: number
}

const EMPTY: PlatformCounts = {
  totalUsers: 0, landlords: 0, tenants: 0, totalRevenue: 0, openIssues: 0, pendingPayments: 0,
}

interface OverviewTabProps {
  sentryEvents: SentryEvent[]
  sentryLoading: boolean
  sentryConfigured: boolean
  logs: LogEntry[]
  logsLoading: boolean
  refreshKey: number
  onNavigate: (tab: TabId) => void
}

export function OverviewTab({
  sentryEvents, sentryLoading, sentryConfigured, logs, logsLoading, refreshKey, onNavigate,
}: OverviewTabProps) {
  const [counts, setCounts] = useState<PlatformCounts>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [profilesRes, paymentsJson, complaintsRes, requestsRes] = await Promise.all([
          supabase.from('profiles').select('role'),
          // payments RLS has no developer exception, so the anon client sees
          // zero rows — go through the service-role API route instead.
          fetch('/api/developer/payments').then((r) => r.json()),
          supabase.from('complaints').select('status'),
          supabase.from('requests').select('status'),
        ])
        if (cancelled) return
        if (profilesRes.error) throw profilesRes.error
        if (paymentsJson.error) throw new Error(paymentsJson.error)
        if (complaintsRes.error) throw complaintsRes.error
        if (requestsRes.error) throw requestsRes.error

        const profiles = profilesRes.data || []
        const complaints = complaintsRes.data || []
        const requests = requestsRes.data || []
        setCounts({
          totalUsers: profiles.length,
          landlords: profiles.filter((p: any) => p.role === 'landlord').length,
          tenants: profiles.filter((p: any) => p.role === 'tenant').length,
          totalRevenue: paymentsJson.summary?.revenue ?? 0,
          openIssues:
            complaints.filter((c: any) => c.status === 'pending').length +
            requests.filter((r: any) => r.status === 'pending').length,
          pendingPayments: paymentsJson.summary?.pending ?? 0,
        })
      } catch (err: any) {
        if (!cancelled) toast.error('Failed to load overview metrics', { description: err?.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  const unresolvedErrors = sentryEvents.filter((e) => !e.isResolved).length

  return (
    <div className="space-y-6">
      <StatBar
        loading={loading}
        items={[
          { label: 'Total Users', value: loading ? '—' : fmt(counts.totalUsers), icon: Users, tone: 'purple' },
          { label: 'Landlords', value: loading ? '—' : fmt(counts.landlords), icon: Building2, tone: 'blue' },
          { label: 'Tenants', value: loading ? '—' : fmt(counts.tenants), icon: Home, tone: 'teal' },
          { label: 'Total Revenue', value: loading ? '—' : fmtKES(counts.totalRevenue), icon: TrendingUp, tone: 'green' },
          {
            label: 'Open Issues', value: loading ? '—' : fmt(counts.openIssues), icon: AlertTriangle,
            tone: counts.openIssues > 0 ? 'amber' : 'slate',
          },
          {
            label: 'Pending Payments', value: loading ? '—' : fmt(counts.pendingPayments), icon: CreditCard,
            tone: counts.pendingPayments > 0 ? 'amber' : 'green',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bug className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent Errors</span>
              <span className="text-xs text-muted-foreground">
                {sentryLoading ? 'loading…' : sentryConfigured ? 'Sentry' : 'not connected'}
              </span>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onNavigate('errors')}>
              View all →
            </Button>
          </div>
          <div className="divide-y divide-border">
            {sentryLoading ? (
              <SkeletonRows count={4} />
            ) : sentryEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {sentryConfigured ? 'No unresolved errors' : 'Sentry not configured'}
              </div>
            ) : (
              sentryEvents.slice(0, 4).map((e) => (
                <div key={e.id} className="flex items-start gap-2.5 px-4 py-3">
                  <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{e.culprit}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xs font-semibold">{e.count}×</div>
                    <div className="text-[11px] text-muted-foreground">{e.lastSeen}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent Logs</span>
              <span className="text-xs text-muted-foreground">
                {logsLoading ? 'loading…' : logs.length > 0 ? 'aggregated' : 'none yet'}
              </span>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onNavigate('logs')}>
              View all →
            </Button>
          </div>
          <div className="divide-y divide-border font-mono text-xs">
            {logsLoading ? (
              <SkeletonRows count={4} />
            ) : logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No logs yet</div>
            ) : (
              logs.slice(0, 6).map((l) => (
                <div key={l.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="shrink-0 text-muted-foreground">{timeAgo(l.timestamp)}</span>
                  <span className="w-9 shrink-0 font-semibold uppercase">{l.level}</span>
                  <span className="shrink-0 text-muted-foreground">[{l.source}]</span>
                  <span className="truncate">{l.message}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {!sentryConfigured && unresolvedErrors === 0 && (
        <Card className="flex-row items-center justify-between gap-3 border-amber-500/20 bg-amber-500/5 p-4 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="text-sm font-semibold">Sentry not configured (server-side)</div>
              <div className="text-xs text-muted-foreground">Add SENTRY_ORG_SLUG + SENTRY_AUTH_TOKEN to Vercel environment.</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
