'use client'

import { PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Card } from '@/components/ui/card'

export interface DonutSegment {
  label: string
  value: number
  colorHex: string
}

interface DonutBreakdownProps {
  title: string
  description?: string
  centerValue: React.ReactNode
  centerLabel: string
  segments: DonutSegment[]
  highlight?: { icon: React.ReactNode; title: string; description: string }
}

/**
 * Ring chart with a big number centered inside and a color-coded legend to
 * the side — used for status/category breakdowns (e.g. active vs overdue
 * subscriptions) rather than time-series trends.
 */
export function DonutBreakdown({ title, description, centerValue, centerLabel, segments, highlight }: DonutBreakdownProps) {
  const config: ChartConfig = Object.fromEntries(segments.map((s) => [s.label, { label: s.label, color: s.colorHex }]))
  const hasData = segments.some((s) => s.value > 0)
  const chartData = hasData ? segments : [{ label: 'No data', value: 1, colorHex: 'var(--color-muted)' }]

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xs">
      <div className="border-b border-border px-3.5 sm:px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs sm:text-sm font-semibold text-foreground">{title}</div>
          {description && <div className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{description}</div>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 sm:gap-6 p-4 sm:p-5 sm:flex-row">
        <div className="relative flex size-32 sm:size-36 shrink-0 items-center justify-center">
          <ChartContainer config={config} className="aspect-square size-32 sm:size-36">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius="72%"
                outerRadius="100%"
                strokeWidth={3}
                paddingAngle={hasData && segments.filter((s) => s.value > 0).length > 1 ? 3 : 0}
              >
                {chartData.map((s, i) => (
                  <Cell key={i} fill={s.colorHex} className="stroke-background" />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-lg sm:text-xl font-bold leading-tight text-foreground">{centerValue}</div>
            <div className="text-center text-[10px] sm:text-[11px] leading-tight text-muted-foreground">{centerLabel}</div>
          </div>
        </div>

        <div className="w-full flex-1 space-y-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs sm:text-sm rounded-lg bg-secondary/30 sm:bg-transparent p-2 sm:p-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.colorHex }} />
                <span className="truncate text-foreground/80 sm:text-muted-foreground font-medium">{s.label}</span>
              </div>
              <span className="shrink-0 font-bold sm:font-medium text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {highlight && (
        <div className="mx-3.5 sm:mx-5 mb-3.5 sm:mb-5 flex items-center gap-3 rounded-xl bg-primary/5 p-3 sm:p-3.5 border border-primary/10">
          <div className="shrink-0">{highlight.icon}</div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-foreground">{highlight.title}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">{highlight.description}</div>
          </div>
        </div>
      )}
    </Card>
  )
}
