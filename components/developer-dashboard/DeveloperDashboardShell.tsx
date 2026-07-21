'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Terminal, RefreshCw, Menu, BarChart3, Bug, Server, Users, CreditCard,
  Wallet, Activity, Database, Bell, BellRing, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { SentryEvent, LogEntry, TabId } from './types'
import { DashboardSidebar } from './DashboardSidebar'
import { OverviewTab } from './OverviewTab'
import { ErrorsTab } from './ErrorsTab'
import { LogsTab } from './LogsTab'
import { InfraTab } from './InfraTab'
import { UsersTab } from './UsersTab'
import { PaymentsTab } from './PaymentsTab'
import { SubscriptionsTab } from './SubscriptionsTab'
import { ActivityTab } from './ActivityTab'
import { DatabaseTab } from './DatabaseTab'

const supabase = createClient()

const TAB_META: Record<TabId, { label: string; description: string; icon: typeof Terminal }> = {
  overview: { label: 'Overview', description: 'Platform health and key metrics at a glance', icon: BarChart3 },
  errors: { label: 'Errors', description: 'Unresolved and recent Sentry issues', icon: Bug },
  logs: { label: 'Live Logs', description: 'Aggregated Vercel, Supabase, and app logs', icon: Terminal },
  infra: { label: 'Infrastructure', description: 'Service and integration status', icon: Server },
  users: { label: 'Users', description: 'Accounts, landlord blocks, and rent settings', icon: Users },
  payments: { label: 'Payments', description: 'Tenant rent payments received', icon: CreditCard },
  subscriptions: { label: 'Subscriptions', description: 'Who has paid their platform subscription', icon: Wallet },
  activity: { label: 'Activity', description: 'Recent signups, payments, and platform counts', icon: Activity },
  database: { label: 'Database', description: 'Table health, row counts, and schema', icon: Database },
}

const TABS: { id: TabId; label: string; icon: typeof Terminal }[] = (Object.keys(TAB_META) as TabId[]).map((id) => ({
  id, label: TAB_META[id].label, icon: TAB_META[id].icon,
}))

const NAV_SECTIONS: { label: string; ids: TabId[] }[] = [
  { label: 'Overview', ids: ['overview'] },
  { label: 'Monitoring', ids: ['errors', 'logs', 'infra'] },
  { label: 'Data', ids: ['users', 'payments', 'subscriptions', 'activity', 'database'] },
]

const VALID_TABS = new Set(TABS.map((t) => t.id))

export function DeveloperDashboardShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<TabId>(
    initialTab && VALID_TABS.has(initialTab as TabId) ? (initialTab as TabId) : 'overview',
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const [sentryEvents, setSentryEvents] = useState<SentryEvent[]>([])
  const [sentryLoading, setSentryLoading] = useState(true)
  const [sentryError, setSentryError] = useState<string | null>(null)

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)

  const push = usePushNotifications()
  const [pushBusy, setPushBusy] = useState(false)

  const sentryServerConfigured = !!process.env.SENTRY_ORG_SLUG && !!process.env.SENTRY_AUTH_TOKEN

  const handleTabChange = useCallback((value: string) => {
    setTab(value as TabId)
    setMobileNavOpen(false)
    router.replace(`/developer-dashboard?tab=${value}`, { scroll: false })
  }, [router])

  const fetchSentry = useCallback(async () => {
    try {
      setSentryLoading(true)
      setSentryError(null)
      const res = await fetch('/api/developer/sentry-events')
      if (!res.ok) throw new Error(`Sentry API ${res.status}`)
      const data = await res.json()
      setSentryEvents(data.events || [])
    } catch (err: any) {
      setSentryError(err.message)
    } finally {
      setSentryLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      setLogsError(null)
      const res = await fetch('/api/developer/logs?limit=200&source=all')
      if (!res.ok) throw new Error(`Logs API ${res.status}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err: any) {
      setLogsError(err.message)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchSentry(), fetchLogs()])
    setRefreshKey((k) => k + 1)
    setLastRefresh(new Date())
    setRefreshing(false)
  }, [fetchSentry, fetchLogs])

  useEffect(() => { refreshAll() }, [refreshAll])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(refreshAll, 30000)
    return () => clearInterval(id)
  }, [autoRefresh, refreshAll])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handlePushToggle = async () => {
    if (!push.isSupported) {
      toast.info('Push notifications need HTTPS', {
        description: 'This only works on a deployed site or installed PWA, not plain localhost.',
      })
      return
    }
    const wasSubscribed = push.isSubscribed
    setPushBusy(true)
    const toastId = toast.loading(wasSubscribed ? 'Sending test notification…' : 'Enabling push notifications…')
    try {
      const ok = wasSubscribed ? await push.testNotification() : await push.subscribe()
      if (ok) {
        toast.success(wasSubscribed ? 'Test notification sent — check your phone' : 'Push notifications enabled', { id: toastId })
      } else {
        toast.error('Something went wrong. Try again.', { id: toastId })
      }
    } catch {
      toast.error('Something went wrong. Try again.', { id: toastId })
    } finally {
      setPushBusy(false)
    }
  }

  const handleAutoRefreshToggle = () => {
    setAutoRefresh((current) => {
      const next = !current
      if (next) toast.info('Auto-refresh enabled', { description: 'Dashboard will refresh every 30 seconds.' })
      return next
    })
  }

  const unresolvedErrors = sentryEvents.filter((e) => !e.isResolved).length
  const meta = TAB_META[tab]
  const MetaIcon = meta.icon
  const sections = NAV_SECTIONS.map((s) => ({
    label: s.label,
    items: s.ids.map((id) => TABS.find((t) => t.id === id)!),
  }))

  return (
    <div className="min-h-dvh bg-muted/30 p-0 sm:p-3 lg:p-4">
      <Toaster position="top-right" richColors />
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex h-dvh flex-row gap-0 overflow-hidden bg-background text-foreground sm:h-[calc(100dvh-1.5rem)] sm:rounded-2xl sm:border sm:border-border sm:shadow-sm lg:h-[calc(100dvh-2rem)]"
      >
        <DashboardSidebar
          sections={sections}
          unresolvedErrors={unresolvedErrors}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          onVerifications={() => router.push('/developer-dashboard/verifications')}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
                <Menu className="size-4" />
              </Button>
              <MetaIcon className="hidden size-4 text-muted-foreground sm:block" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold leading-tight">{meta.label}</div>
                <div className="hidden truncate text-xs text-muted-foreground sm:block">{meta.description}</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span className="hidden rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground lg:inline">
                {lastRefresh.toLocaleTimeString()}
              </span>
              {push.isSupported && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={handlePushToggle}
                  disabled={pushBusy}
                  title={push.isSubscribed ? 'Send test push' : 'Enable push notifications'}
                >
                  {push.isSubscribed ? <BellRing className="size-4" /> : <Bell className="size-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn('rounded-full', autoRefresh && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
                onClick={handleAutoRefreshToggle}
              >
                {autoRefresh ? '⏸ Auto' : '▶ Auto'}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                disabled={refreshing}
                onClick={refreshAll}
                title="Refresh"
              >
                <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              </Button>
            </div>
          </header>

          {(sentryError || logsError) && (
            <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive sm:px-6">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{sentryError || logsError}</span>
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
              <TabsContent value="overview">
              <OverviewTab
                sentryEvents={sentryEvents}
                sentryLoading={sentryLoading}
                sentryConfigured={sentryServerConfigured}
                logs={logs}
                logsLoading={logsLoading}
                refreshKey={refreshKey}
                onNavigate={handleTabChange as (t: TabId) => void}
              />
            </TabsContent>
            <TabsContent value="errors">
              <ErrorsTab sentryEvents={sentryEvents} sentryLoading={sentryLoading} sentryConfigured={sentryServerConfigured} />
            </TabsContent>
            <TabsContent value="logs">
              <LogsTab logs={logs} logsLoading={logsLoading} />
            </TabsContent>
            <TabsContent value="infra">
              <InfraTab logsCount={logs.length} />
            </TabsContent>
            <TabsContent value="users">
              <UsersTab refreshKey={refreshKey} />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTab refreshKey={refreshKey} />
            </TabsContent>
            <TabsContent value="subscriptions">
              <SubscriptionsTab refreshKey={refreshKey} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityTab refreshKey={refreshKey} />
            </TabsContent>
              <TabsContent value="database">
                <DatabaseTab refreshKey={refreshKey} />
              </TabsContent>
            </div>
          </main>
        </div>
      </Tabs>
    </div>
  )
}
