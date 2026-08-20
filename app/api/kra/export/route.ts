import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnnualSummary, getLedgerEntries, toMonthlyCsv, toLedgerCsv } from '@/lib/engines/kra_tax_engine'

/**
 * GET /api/kra/export?year=2026&type=monthly
 * GET /api/kra/export?from=2026-01&to=2026-12&type=ledger
 *
 * type=monthly (default) → one row per calendar month, matching the iTax MRI
 *   return fields (gross rent, rate, tax due, filing deadline, NIL flag).
 * type=ledger → one row per verified payment, for record-keeping / audit.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, business_name')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.role !== 'landlord') {
      return NextResponse.json({ error: 'Only landlords can export tax records' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') === 'ledger' ? 'ledger' : 'monthly'
    const landlordName = profile?.business_name || profile?.full_name || 'Landlord'

    if (type === 'ledger') {
      const from = searchParams.get('from') || undefined
      const to = searchParams.get('to') || undefined
      const entries = await getLedgerEntries(supabase, authData.user.id, { from, to })
      const csv = toLedgerCsv(entries)
      const filename = `rental-income-ledger-${from || 'all'}-to-${to || 'all'}.csv`

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const year = searchParams.get('year') || String(new Date().getFullYear())
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: 'year must be a 4-digit calendar year, e.g. 2026' }, { status: 400 })
    }

    const { months } = await getAnnualSummary(supabase, authData.user.id, year)
    const csv = toMonthlyCsv(landlordName, year, months)
    const filename = `kra-mri-return-${year}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[KRA Export] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}