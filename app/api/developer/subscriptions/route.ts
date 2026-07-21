import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// landlord_subscriptions / subscription_payments have no RLS policy defined
// in-repo (created directly in Supabase), so a cross-landlord admin read
// goes through the service-role client instead of relying on the anon-key
// browser client — same idiom as app/api/billing/pay/route.ts.
const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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

  const [subscriptionsRes, paymentsRes] = await Promise.all([
    serviceClient.from('landlord_subscriptions').select('*'),
    serviceClient
      .from('subscription_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (subscriptionsRes.error || paymentsRes.error) {
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }

  const subscriptions = subscriptionsRes.data || []
  const payments = paymentsRes.data || []

  const landlordIds = [...new Set([
    ...subscriptions.map((s: any) => s.landlord_id),
    ...payments.map((p: any) => p.landlord_id),
  ].filter(Boolean))]

  const { data: profiles } = landlordIds.length
    ? await serviceClient
        .from('profiles')
        .select('id, full_name, email, phone_number, landlord_code')
        .in('id', landlordIds)
    : { data: [] as any[] }

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  const now = new Date()

  const enrichedSubscriptions = subscriptions.map((s: any) => ({
    ...s,
    landlord: profileMap.get(s.landlord_id) || null,
  }))

  const enrichedPayments = payments.map((p: any) => {
    const landlord = profileMap.get(p.landlord_id)
    return {
      ...p,
      landlord_name: landlord?.full_name || landlord?.landlord_code || p.landlord_id,
    }
  })

  const summary = {
    mrr: subscriptions
      .filter((s: any) => s.status === 'active')
      .reduce((sum: number, s: any) => sum + Number(s.monthly_fee || 0), 0),
    activeCount: subscriptions.filter((s: any) => s.status === 'active').length,
    overdueCount: subscriptions.filter((s: any) => s.status === 'overdue').length,
    freeAccessCount: subscriptions.filter(
      (s: any) => s.free_access_until && new Date(s.free_access_until) > now,
    ).length,
    totalCollected: payments
      .filter((p: any) => p.status === 'complete')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
    pendingCount: payments.filter((p: any) => p.status === 'pending').length,
  }

  return NextResponse.json({
    summary,
    subscriptions: enrichedSubscriptions,
    payments: enrichedPayments,
  })
}
