import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface DataRowField {
  label: string
  value: React.ReactNode
  mono?: boolean
}

interface DataRowProps {
  primary: React.ReactNode
  secondary?: React.ReactNode
  fields?: DataRowField[]
  status?: React.ReactNode
  avatar?: React.ReactNode
  actions?: React.ReactNode
}

/**
 * One row in a data list that reads as an inline row on desktop and a
 * stacked card on narrow screens, instead of hiding columns via display:none.
 * Shared across Users/Payments/Subscriptions/Database tabs.
 */
export function DataRow({ primary, secondary, fields = [], status, avatar, actions }: DataRowProps) {
  return (
    <div className="border-b border-border px-4 py-3 last:border-0 md:px-5">
      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{primary}</div>
          {secondary && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{secondary}</div>
          )}
        </div>
        {fields.length > 0 && (
          <div className="hidden shrink-0 items-center gap-6 md:flex">
            {fields.map((f, i) => (
              <div key={i} className="text-right">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </div>
                <div className={cn('text-sm text-foreground', f.mono && 'font-mono text-xs')}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        )}
        {status && <div className="shrink-0">{status}</div>}
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {fields.length > 0 && (
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 md:hidden">
          {fields.map((f, i) => (
            <div key={i}>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {f.label}
              </div>
              <div className={cn('text-xs text-foreground', f.mono && 'font-mono')}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-muted-foreground">{children}</div>
  )
}

/** Placeholder rows shown while a list's data is still loading. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:px-5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="hidden h-6 w-16 shrink-0 rounded-full md:block" />
        </div>
      ))}
    </div>
  )
}
