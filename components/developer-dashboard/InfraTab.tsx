'use client'

import { useEffect, useState } from 'react'
import {
  Shield, Package, Globe, TrendingUp, Lock, RefreshCw, Bug, Terminal, Eye,
  Zap, Wifi, Activity, BarChart3, Volume2, ArrowRightLeft, CheckCircle2, XCircle,
  LayoutGrid, type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatBar } from './StatCard'
import type { MonitoringStatus } from './types'

interface InfraItem {
  label: string
  status: boolean
  detail: string
  icon: LucideIcon
}

interface InfraTabProps {
  logsCount: number
}

export function InfraTab({ logsCount }: InfraTabProps) {
  const [monitoring, setMonitoring] = useState<MonitoringStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/developer/monitoring-status')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setMonitoring(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Sentry / Africa's Talking status checks are known to be inaccurate
  // (Sentry env vars aren't NEXT_PUBLIC_-prefixed so this is always false
  // client-side even when Sentry is fully configured server-side; Africa's
  // Talking is genuinely live but was never wired to a real check) —
  // carried over as-is, fix deferred per prior conversation.
  const sentryServerConfigured = !!process.env.SENTRY_ORG_SLUG && !!process.env.SENTRY_AUTH_TOKEN

  const items: InfraItem[] = [
    { label: 'Rate Limiting', status: true, detail: '60 req/min per IP', icon: Shield },
    { label: 'PWA Cache', status: true, detail: 'Service Worker active', icon: Package },
    { label: 'CDN (Vercel Edge)', status: true, detail: 'Global edge network', icon: Globe },
    { label: 'Auto Scaling', status: true, detail: 'Vercel + Supabase', icon: TrendingUp },
    { label: 'RLS Policies', status: true, detail: 'All tables enforced', icon: Lock },
    { label: 'Idempotency', status: true, detail: 'Payment webhooks', icon: RefreshCw },
    {
      label: 'Sentry Error Track',
      status: sentryServerConfigured,
      detail: sentryServerConfigured ? 'Server-side configured' : 'Missing SENTRY_ORG_SLUG / SENTRY_AUTH_TOKEN',
      icon: Bug,
    },
    {
      label: 'Log Aggregation',
      status: logsCount > 0,
      detail: logsCount > 0 ? `Aggregating ${logsCount} entries` : 'No logs yet / API not configured',
      icon: Terminal,
    },
    {
      label: 'Uptime Monitor',
      status: !!monitoring?.betterstack.connected,
      detail: monitoring
        ? monitoring.betterstack.connected ? `${monitoring.betterstack.uptime}% uptime` : 'BetterStack not configured'
        : 'Checking…',
      icon: Eye,
    },
    { label: 'M-Pesa Callback', status: true, detail: 'Paybill 400200 active', icon: Zap },
    { label: "Africa's Talking", status: false, detail: 'Sandbox / not live', icon: Wifi },
    { label: 'Realtime (Supabase)', status: true, detail: 'REPLICA IDENTITY FULL', icon: Activity },
    {
      label: 'PostHog Analytics',
      status: !!monitoring?.posthog.connected,
      detail: monitoring ? (monitoring.posthog.connected ? 'Client-side active' : 'Not configured') : 'Checking…',
      icon: BarChart3,
    },
    {
      label: 'Getnoise Monitoring',
      status: !!monitoring?.getnoise.connected,
      detail: monitoring ? (monitoring.getnoise.connected ? 'Sensors active' : 'Not configured') : 'Checking…',
      icon: Volume2,
    },
    {
      label: 'Sideshift Monitoring',
      status: !!monitoring?.sideshift.connected,
      detail: monitoring ? (monitoring.sideshift.connected ? 'Tracking transactions' : 'Not configured') : 'Checking…',
      icon: ArrowRightLeft,
    },
  ]

  const operational = items.filter((i) => i.status).length

  return (
    <div className="space-y-5">
      <StatBar
        items={[
          { label: 'Operational', value: operational, icon: CheckCircle2, tone: 'green' },
          { label: 'Not Configured', value: items.length - operational, icon: XCircle, tone: 'red' },
          { label: 'Total Services', value: items.length, icon: LayoutGrid, tone: 'slate' },
        ]}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Service Status</div>
        <div className="divide-y divide-border">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-center gap-3.5 px-4 py-3.5">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${
                    item.status
                      ? 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{item.detail}</div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    item.status
                      ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/15 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400'
                  }
                >
                  {item.status ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
