'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { LogEntry } from './types'

interface LogsTabProps {
  logs: LogEntry[]
  logsLoading: boolean
}

const FILTERS = ['all', 'error', 'warn', 'info', 'debug'] as const

export function LogsTab({ logs, logsLoading }: LogsTabProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                filter === f
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3.5 py-2.5">
          <div className="size-2.5 rounded-full bg-red-500" />
          <div className="size-2.5 rounded-full bg-amber-500" />
          <div className="size-2.5 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">lea-residency — app logs</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="size-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {logsLoading ? 'loading…' : logs.length > 0 ? 'live' : 'empty'}
            </span>
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto font-mono text-xs">
          {logsLoading ? (
            <div className="space-y-2.5 px-3.5 py-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-3" style={{ width: `${55 + ((i * 13) % 40)}%` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">No {filter} logs</div>
          ) : (
            filtered.map((l) => (
              <div key={l.id} className="flex items-start gap-2.5 border-b border-border/60 px-3.5 py-2 last:border-0">
                <span className="shrink-0 text-muted-foreground">{l.timestamp}</span>
                <span className="w-9 shrink-0 font-semibold uppercase">{l.level}</span>
                <span className="shrink-0 text-muted-foreground">[{l.source}]</span>
                <span className="flex-1">{l.message}</span>
                {l.meta && (
                  <span className="hidden shrink-0 text-[10px] text-muted-foreground/70 md:inline">
                    {JSON.stringify(l.meta)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
