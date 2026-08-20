import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLedgerEntries } from '@/lib/engines/kra_tax_engine'

/**
 * GET /api/kra/ledger?from=2026-01&to=2026-12
 * Returns the authenticated landlord's verified rental income ledger rows.
 * `from`/`to` are optional tax_period (YYYY-MM) bounds; omit both for full history.
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
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.role !== 'landlord') {
      return NextResponse.json({ error: 'Only landlords can view the rental income ledger' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const entries = await getLedgerEntries(supabase, authData.user.id, { from, to })

    return NextResponse.json({ success: true, entries })
  } catch (error) {
    console.error('[KRA Ledger] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch rental income ledger' }, { status: 500 })
  }
}