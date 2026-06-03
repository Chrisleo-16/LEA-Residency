import { DELETE_FOR_EVERYONE_WINDOW_MS } from '@/lib/chat/constants'

/**
 * Parse message timestamps consistently as UTC.
 * Supabase/Postgres often returns values without a Z suffix; treating those as
 * local time incorrectly fails the 24-hour delete window.
 */
export function parseMessageTimestampMs(
  dateStr: string | Date | null | undefined
): number {
  if (!dateStr) return NaN
  if (dateStr instanceof Date) return dateStr.getTime()

  const trimmed = String(dateStr).trim()
  if (!trimmed) return NaN

  const hasTimezone =
    trimmed.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(trimmed)

  const isoLike = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const iso = hasTimezone ? isoLike : `${isoLike}Z`

  const parsed = new Date(iso).getTime()
  if (!Number.isNaN(parsed)) return parsed

  return new Date(trimmed).getTime()
}
export function isWithinDeleteWindow(
  createdAt: string,
  nowMs: number = Date.now()
): boolean {
  const createdMs = parseMessageTimestampMs(createdAt)
  if (Number.isNaN(createdMs)) return false
  return nowMs - createdMs <= DELETE_FOR_EVERYONE_WINDOW_MS
}

export function deleteWindowCutoffIso(nowMs: number = Date.now()): string {
  return new Date(nowMs - DELETE_FOR_EVERYONE_WINDOW_MS).toISOString()
}
