import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, tenant_id, landlord_id, amount, phone_number, mpesa_code, payment_month, payment_date, status, payment_method, notes, logged_by, created_at')
      .ilike('notes', '%WIFI%')
      .order('payment_date', { ascending: false })

    if (error) throw error

    const tenantIds = Array.from(new Set((payments || []).map(p => p.tenant_id).filter(Boolean)))
    const landlordIds = Array.from(new Set((payments || []).map(p => p.landlord_id).filter(Boolean)))

    const { data: tenants } = tenantIds.length
      ? await supabase.from('profiles').select('id, full_name, email, phone_number').in('id', tenantIds)
      : { data: [] }

    const { data: landlords } = landlordIds.length
      ? await supabase.from('profiles').select('id, full_name, business_name, email').in('id', landlordIds)
      : { data: [] }

    const { count: wifiEnabledCount } = await supabase
      .from('rent_settings')
      .select('tenant_id', { count: 'exact', head: true })
      .eq('wifi_enabled', true)

    const tenantMap = new Map((tenants || []).map(t => [t.id, t]))
    const landlordMap = new Map((landlords || []).map(l => [l.id, l]))

    const enriched = (payments || []).map(p => ({
      ...p,
      tenant: tenantMap.get(p.tenant_id!) || null,
      landlord: landlordMap.get(p.landlord_id!) || null,
    }))

    const revenue = enriched
      .filter(p => ['complete', 'confirmed', 'partial'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const pending = enriched.filter(p => p.status === 'pending').length

    return NextResponse.json({
      payments: enriched,
      summary: {
        revenue,
        pending,
        totalTransactions: enriched.length,
        wifiEnabledTenants: wifiEnabledCount || 0,
      },
    })
  } catch (err: any) {
    console.error('[Developer Wi-Fi Payments] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}