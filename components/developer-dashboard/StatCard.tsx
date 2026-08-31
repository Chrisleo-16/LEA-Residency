import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { statTone, type StatTone } from './helpers'
import type { LucideIcon } from 'lucide-react'

export interface StatItem {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  tone?: StatTone
  delta?: React.ReactNode
  deltaTone?: 'up' | 'down' | 'neutral'
}

const deltaClass: Record<NonNullable<StatItem['deltaTone']>, string> = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
}

/**
 * A single card divided into sections (one per metric) instead of separate
 * bordered tiles — each section gets a soft-tinted icon badge, a big number,
 * and an optional delta line underneath.
 */
export function StatBar({ items, loading }: { items: StatItem[]; loading?: boolean }) {
  return (
    <Card className="mb-5 grid grid-cols-2 gap-0 divide-y divide-border overflow-hidden p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-6 shadow-sm">
      {items.map((item, i) => {
        const Icon = item.icon
        const tone = statTone(item.tone ?? 'slate')
        return (
          <div
            key={i}
            className={cn(
              'flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4',
              i % 2 === 1 && 'border-l border-border sm:border-l-0'
            )}
          >
            <div className={cn('flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg', tone.bg)}>
              <Icon className={cn('size-3.5 sm:size-4', tone.text)} />
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </>
              ) : (
                <>
                  <div className="text-base sm:text-lg font-bold leading-tight break-words text-foreground">
                    {item.value}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] sm:text-xs font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  {item.delta && (
                    <div className={cn('mt-0.5 text-[10px] sm:text-[11px] font-medium', deltaClass[item.deltaTone ?? 'neutral'])}>
                      {item.delta}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </Card>
  )
}

// Kept for the few call sites that still want an isolated tile (e.g. a lone
// highlight card) rather than a divided bar section.
export function StatCard({ label, value, icon: Icon, tone = 'slate', hint }: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  tone?: StatTone
  hint?: React.ReactNode
}) {
  const t = statTone(tone)
  return (
    <Card className="gap-1.5 p-4 py-4">
      {Icon && (
        <div className={cn('mb-1 flex size-9 items-center justify-center rounded-lg', t.bg)}>
          <Icon className={cn('size-4', t.text)} />
        </div>
      )}
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  )
}
