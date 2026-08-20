/**
 * KRA Tax Engine
 * Turns the append-only `kra_rental_income_ledger` (written by a DB trigger on
 * `payments` — see supabase/migrations/20260730_create_kra_rental_ledger.sql)
 * into landlord-facing monthly/annual Monthly Rental Income (MRI) summaries
 * and a KRA-return-ready CSV export.
 *
 * This file contains no auth/session logic — callers (route handlers) are
 * responsible for authenticating the request and passing a landlord-scoped
 * Supabase client. Row Level Security on kra_rental_income_ledger already
 * restricts a landlord to their own rows regardless, so this is defense in
 * depth rather than the only guard.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// KRA's published MRI band as of the 2026 rate (10%). These are read from
// kra_tax_settings at query time for the rate itself; these two constants are
// only used for the "does this landlord's total sit inside the simplified MRI
// band" hint shown in the UI, not for the tax calculation itself.
const MRI_ANNUAL_FLOOR = 288_000
const MRI_ANNUAL_CEILING = 15_000_000

export interface LedgerEntry {
  id: string
  payment_id: string
  tenant_id: string | null
  tenant_name: string | null
  tenant_email: string | null
  unit_number: string | null
  amount: number
  payment_method: string | null
  payment_date: string
  payment_month: string
  tax_period: string
  tax_rate_applied: number
  tax_due: number
  source_status: string
}

export interface MonthlySummary {
  taxPeriod: string // YYYY-MM
  grossRent: number
  taxDue: number
  paymentCount: number
  tenantCount: number
  isNil: boolean
  filingDeadline: string // YYYY-MM-DD — 20th of the following month
  taxRateApplied: number | null
}

export interface AnnualSummary {
  year: string
  grossRent: number
  taxDue: number
  months: MonthlySummary[]
  belowMriFloor: boolean
  exceedsMriCeiling: boolean
}

/** Fetch raw ledger rows for a landlord, optionally bounded by tax_period. */
export async function getLedgerEntries(
  supabase: SupabaseClient,
  landlordId: string,
  opts: { from?: string; to?: string } = {}
): Promise<LedgerEntry[]> {
  let query = supabase
    .from('kra_rental_income_ledger')
    .select('*')
    .eq('landlord_id', landlordId)
    .order('payment_date', { ascending: false })

  if (opts.from) query = query.gte('tax_period', opts.from)
  if (opts.to) query = query.lte('tax_period', opts.to)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as LedgerEntry[]
}

/** The 20th of the month after `taxPeriod`, matching KRA's MRI filing deadline. */
export function filingDeadlineFor(taxPeriod: string): string {
  const [year, month] = taxPeriod.split('-').map(Number)
  const deadline = new Date(Date.UTC(year, month, 20)) // month is already +1 (0-indexed +1 = next month)
  return deadline.toISOString().split('T')[0]
}

/** Build all 12 monthly summaries for a given calendar year, filling in NIL months. */
export async function getMonthlySummaries(
  supabase: SupabaseClient,
  landlordId: string,
  year: string
): Promise<MonthlySummary[]> {
  const entries = await getLedgerEntries(supabase, landlordId, {
    from: `${year}-01`,
    to: `${year}-12`,
  })

  const byMonth = new Map<string, LedgerEntry[]>()
  for (const e of entries) {
    const list = byMonth.get(e.tax_period) || []
    list.push(e)
    byMonth.set(e.tax_period, list)
  }

  const months: MonthlySummary[] = []
  for (let m = 1; m <= 12; m++) {
    const taxPeriod = `${year}-${String(m).padStart(2, '0')}`
    const rows = byMonth.get(taxPeriod) || []
    const grossRent = round2(rows.reduce((sum, r) => sum + Number(r.amount), 0))
    const taxDue = round2(rows.reduce((sum, r) => sum + Number(r.tax_due), 0))
    const tenantCount = new Set(rows.map(r => r.tenant_id).filter(Boolean)).size

    months.push({
      taxPeriod,
      grossRent,
      taxDue,
      paymentCount: rows.length,
      tenantCount,
      isNil: grossRent === 0,
      filingDeadline: filingDeadlineFor(taxPeriod),
      taxRateApplied: rows[0]?.tax_rate_applied ?? null,
    })
  }

  return months
}

/** Roll monthly summaries up into an annual view, with MRI-band context flags. */
export async function getAnnualSummary(
  supabase: SupabaseClient,
  landlordId: string,
  year: string
): Promise<AnnualSummary> {
  const months = await getMonthlySummaries(supabase, landlordId, year)
  const grossRent = round2(months.reduce((sum, m) => sum + m.grossRent, 0))
  const taxDue = round2(months.reduce((sum, m) => sum + m.taxDue, 0))

  return {
    year,
    grossRent,
    taxDue,
    months,
    belowMriFloor: grossRent > 0 && grossRent < MRI_ANNUAL_FLOOR,
    exceedsMriCeiling: grossRent > MRI_ANNUAL_CEILING,
  }
}

/** KRA-return-friendly CSV: one row per month, matching the iTax MRI return fields. */
export function toMonthlyCsv(landlordName: string, year: string, months: MonthlySummary[]): string {
  const header = ['Landlord', 'Tax Period', 'Gross Rent Received (KES)', 'MRI Rate', 'Tax Due (KES)', 'Filing Deadline', 'Return Type']
  const rows = months.map(m => [
    landlordName,
    m.taxPeriod,
    m.grossRent.toFixed(2),
    m.taxRateApplied ? `${(m.taxRateApplied * 100).toFixed(1)}%` : '10.0%',
    m.taxDue.toFixed(2),
    m.filingDeadline,
    m.isNil ? 'NIL' : 'MRI',
  ])
  return [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
}

/** Full ledger export — one row per verified payment, for record-keeping / audit. */
export function toLedgerCsv(entries: LedgerEntry[]): string {
  const header = ['Payment Date', 'Tax Period', 'Tenant', 'Unit', 'Amount (KES)', 'Method', 'Tax Rate', 'Tax Due (KES)', 'Status']
  const rows = entries.map(e => [
    new Date(e.payment_date).toISOString().split('T')[0],
    e.tax_period,
    e.tenant_name || '—',
    e.unit_number || '—',
    Number(e.amount).toFixed(2),
    e.payment_method || '—',
    `${(Number(e.tax_rate_applied) * 100).toFixed(1)}%`,
    Number(e.tax_due).toFixed(2),
    e.source_status,
  ])
  return [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}