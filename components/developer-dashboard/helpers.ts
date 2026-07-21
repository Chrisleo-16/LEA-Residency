export const fmt = (n: number) => n.toLocaleString('en-KE')
export const fmtKES = (n: number) => 'KES ' + n.toLocaleString('en-KE')

export const fmtTime = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const timeAgo = (iso?: string | null) => {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/**
 * Badge component only ships default/secondary/destructive/outline variants —
 * no semantic success/warning. This maps common status strings across the app
 * (payments, subscriptions, verifications, infra) to a consistent color class
 * layered on top of `variant="outline"`.
 */
const PILL = 'rounded-full border-transparent font-medium'

// payments.status has no fixed enum — real values seen across the app are
// 'confirmed' (the column default, used for manually-logged/instant payments),
// 'complete'/'partial' (set by the M-Pesa STK reconciliation in
// stkpush-callback.ts depending on whether the full rent amount was covered),
// 'pending' (awaiting payment), and 'failed'.
export function isPaidPaymentStatus(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase()
  return s !== 'pending' && s !== 'failed' && s !== ''
}

export function statusBadgeClass(status: string | null | undefined): string {
  const s = (status || '').toLowerCase()
  const green = ['complete', 'completed', 'confirmed', 'active', 'resolved', 'approved', 'paid']
  const amber = ['pending', 'partial', 'warning', 'warn', 'pending_review']
  const red = ['failed', 'overdue', 'error', 'fatal', 'rejected', 'suspended', 'inactive']
  if (green.includes(s)) return `${PILL} bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400`
  if (amber.includes(s)) return `${PILL} bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400`
  if (red.includes(s)) return `${PILL} bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400`
  return `${PILL} bg-muted text-muted-foreground`
}

export function levelBadgeClass(level: string | null | undefined): string {
  const l = (level || '').toLowerCase()
  if (l === 'fatal' || l === 'error') return `${PILL} bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400`
  if (l === 'warning' || l === 'warn') return `${PILL} bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400`
  if (l === 'info') return `${PILL} bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400`
  return `${PILL} bg-muted text-muted-foreground`
}

export type StatTone = 'purple' | 'blue' | 'green' | 'amber' | 'pink' | 'teal' | 'red' | 'slate'

const TONE_MAP: Record<StatTone, { bg: string; text: string }> = {
  purple: { bg: 'bg-violet-500/10 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400' },
  blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-500/10 dark:bg-green-500/15', text: 'text-green-600 dark:text-green-400' },
  amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  pink: { bg: 'bg-pink-500/10 dark:bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400' },
  teal: { bg: 'bg-teal-500/10 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400' },
  red: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400' },
  slate: { bg: 'bg-slate-500/10 dark:bg-slate-500/15', text: 'text-slate-600 dark:text-slate-400' },
}

export function statTone(tone: StatTone) {
  return TONE_MAP[tone]
}

// Hex values (not Tailwind classes) matching the same palette, for recharts fills.
export const TONE_HEX: Record<StatTone, string> = {
  purple: '#8b5cf6',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  pink: '#ec4899',
  teal: '#14b8a6',
  red: '#ef4444',
  slate: '#64748b',
}
