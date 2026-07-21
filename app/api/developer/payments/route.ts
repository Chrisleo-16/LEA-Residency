import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// payments RLS (tenant/landlord scoped) has no exception for the developer
// role, so the anon-key browser client silently sees zero rows here even
// though the table has data — same gap as landlord_subscriptions /
// subscription_payments. Go through the service-role client instead.
const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isPaidStatus(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase()
  return s !== 'pending' && s !== 'failed' && s !== ''
}

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'developer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [recentRes, allRes] = await Promise.all([
    serviceClient
      .from('payments')
      .select('id, amount, status, payment_month, mpesa_code, phone_number, payment_method, created_at, tenant_name, tenant_email')
      .order('created_at', { ascending: false })
      .limit(30),
    serviceClient.from('payments').select('amount, status'),
  ])

  if (recentRes.error || allRes.error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }

  const all = allRes.data || []

  return NextResponse.json({
    summary: {
      total: all.length,
      completed: all.filter((p: any) => isPaidStatus(p.status)).length,
      pending: all.filter((p: any) => (p.status || '').toLowerCase() === 'pending').length,
      revenue: all
        .filter((p: any) => isPaidStatus(p.status))
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
    },
    payments: recentRes.data || [],
  })
}
