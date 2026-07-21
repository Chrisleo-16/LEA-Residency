'use client'

import { Flame, Bug, AlertTriangle, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatBar } from './StatCard'
import { SkeletonRows } from './DataRow'
import { levelBadgeClass } from './helpers'
import type { SentryEvent } from './types'

const LEVEL_META = {
  fatal: { icon: Flame, tone: 'red' as const },
  error: { icon: Bug, tone: 'red' as const },
  warning: { icon: AlertTriangle, tone: 'amber' as const },
  info: { icon: Info, tone: 'blue' as const },
}

interface ErrorsTabProps {
  sentryEvents: SentryEvent[]
  sentryLoading: boolean
  sentryConfigured: boolean
}

export function ErrorsTab({ sentryEvents, sentryLoading, sentryConfigured }: ErrorsTabProps) {
  const levels: SentryEvent['level'][] = ['fatal', 'error', 'warning', 'info']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <div className="text-xs text-muted-foreground">
          {sentryLoading
            ? 'Loading…'
            : `${sentryEvents.filter((e) => !e.isResolved).length} unresolved · ${sentryEvents.filter((e) => e.isResolved).length} resolved`}
        </div>
      </div>

      <StatBar
        items={levels.map((level) => ({
          label: level,
          value: sentryEvents.filter((e) => e.level === level).length,
          icon: LEVEL_META[level].icon,
          tone: LEVEL_META[level].tone,
        }))}
        loading={sentryLoading}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">All Issues</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {sentryConfigured ? 'Sentry API' : 'Configuration missing'}
          </span>
        </div>
        {sentryLoading ? (
          <SkeletonRows />
        ) : sentryEvents.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {sentryConfigured ? 'No unresolved issues found.' : 'Connect Sentry to see errors.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sentryEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${e.isResolved ? 'text-muted-foreground line-through' : ''}`}>
                    {e.title}
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{e.culprit}</div>
                  <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
                    {Object.entries(e.tags).map(([k, v]) => (
                      <span key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                  <div>{e.project}</div>
                  <div>{e.lastSeen}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold">{e.count}</div>
                </div>
                <Badge variant="outline" className={levelBadgeClass(e.isResolved ? 'resolved' : e.level)}>
                  {e.isResolved ? 'Resolved' : e.level}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
