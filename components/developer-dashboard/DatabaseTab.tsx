'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Minus, Database, Lock, Activity, Zap, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatBar } from './StatCard'
import { fmt } from './helpers'
import { SCHEMA_TABLES } from './schemaTables'
import type { SchemaTableDef } from './types'

const supabase = createClient()

// Tables whose row counts are worth a live query — the rest (blockchain_transactions,
// photos, staff_assignments, properties, message_reactions/reads, conversation_participants)
// aren't queried elsewhere in this dashboard either, so they stay at 0 rather than adding
// 7 more head-count round trips for tables nothing else here reads.
const COUNTED_TABLES = new Set([
  'profiles', 'payments', 'landlord_subscriptions', 'subscription_payments', 'messages',
  'conversations', 'complaints', 'requests', 'policies', 'rent_settings', 'landlord_blocks',
  'tenant_slots', 'contact_submissions', 'viewing_requests', 'push_subscriptions', 'staff',
  'account_deletion_requests',
])

interface DatabaseTabProps {
  refreshKey: number
}

export function DatabaseTab({ refreshKey }: DatabaseTabProps) {
  const [tables, setTables] = useState<SchemaTableDef[]>(SCHEMA_TABLES.map((t) => ({ ...t, count: 0 })))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const results = await Promise.all(
          SCHEMA_TABLES.map(async (t) => {
            if (!COUNTED_TABLES.has(t.name)) return { ...t, count: 0 }
            const { count, error } = await supabase.from(t.name).select('id', { count: 'exact', head: true })
            if (error) throw error
            return { ...t, count: count || 0 }
          }),
        )
        if (!cancelled) setTables(results)
      } catch (err: any) {
        if (!cancelled) toast.error('Failed to load table counts', { description: err?.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  const rlsCount = tables.filter((t) => t.rls).length
  const realtimeCount = tables.filter((t) => t.realtime).length
  const totalRows = tables.reduce((s, t) => s + t.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Open Supabase ↗
        </a>
      </div>

      <StatBar
        items={[
          { label: 'Total Tables', value: tables.length, icon: Database, tone: 'purple' },
          { label: 'RLS Enforced', value: `${rlsCount}/${tables.length}`, icon: Lock, tone: 'green' },
          { label: 'Realtime Tables', value: realtimeCount, icon: Activity, tone: 'blue' },
          { label: 'Total Rows (known)', value: loading ? '—' : fmt(totalRows), icon: Zap, tone: 'amber' },
        ]}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="grid grid-cols-[1fr_70px_50px_60px] gap-3 border-b border-border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[180px_70px_50px_60px_1fr]">
          <div>Table</div>
          <div>Rows</div>
          <div>RLS</div>
          <div>RT</div>
          <div className="hidden sm:block">Columns</div>
        </div>
        <div className="divide-y divide-border">
          {tables.map((t) => (
            <div key={t.name} className="grid grid-cols-[1fr_70px_50px_60px] items-start gap-3 px-4 py-3 sm:grid-cols-[180px_70px_50px_60px_1fr]">
              <div className="truncate font-mono text-xs font-medium text-primary">{t.name}</div>
              <div className="font-mono text-xs">{loading ? '—' : fmt(t.count)}</div>
              <div>{t.rls ? <CheckCircle className="size-3.5 text-green-600 dark:text-green-400" /> : <XCircle className="size-3.5 text-red-600 dark:text-red-400" />}</div>
              <div>
                {t.realtime ? (
                  <span className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-green-500" /> live
                  </span>
                ) : (
                  <Minus className="size-3 text-muted-foreground/40" />
                )}
              </div>
              <div className="col-span-4 flex flex-wrap gap-1 sm:col-span-1">
                {t.cols.map((c) => (
                  <span key={c} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex-row items-start gap-3 border-green-500/20 bg-green-500/5 p-4 py-4">
        <Shield className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <div className="text-sm font-semibold">Most tables have RLS enabled</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Row Level Security is enforced across user-facing tables — tenants read only their own
            data, landlords see only their tenants. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">conversations</code> uses{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">USING (true)</code> for group chat discovery.
            <code className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">landlord_subscriptions</code> /{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">subscription_payments</code> have no
            migration-defined RLS — reads go through the service-role API route instead.
          </p>
        </div>
      </Card>
    </div>
  )
}
