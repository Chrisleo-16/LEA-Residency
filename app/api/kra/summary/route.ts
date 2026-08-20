import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnnualSummary } from '@/lib/engines/kra_tax_engine'

/**
 * GET /api/kra/summary?year=2026
 * Returns the authenticated landlord's monthly + annual MRI tax summary for
 * the given calendar year (defaults to the current year), including NIL
 * months and the KRA filing deadline for each period.
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
      return NextResponse.json({ error: 'Only landlords can view the tax summary' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || String(new Date().getFullYear())

    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: 'year must be a 4-digit calendar year, e.g. 2026' }, { status: 400 })
    }

    const summary = await getAnnualSummary(supabase, authData.user.id, year)

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('[KRA Summary] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to compute tax summary' }, { status: 500 })
  }
}