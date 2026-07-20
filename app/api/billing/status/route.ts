import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Standing policy: every landlord gets 30 days of free access, granted once
// the first time their subscription row is seen (new or existing).
async function grantFreeAccessIfUnset(supabase: any, subscription: any) {
  if (!subscription || subscription.free_access_until) {
    return subscription
  }

  const freeAccessUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: updated, error } = await supabase
    .from('landlord_subscriptions')
    .update({ free_access_until: freeAccessUntil })
    .eq('id', subscription.id)
    .select()
    .single()

  return error ? subscription : updated
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription, error: subError } = await supabase
    .from('landlord_subscriptions')
    .select('*')
    .eq('landlord_id', user.id)
    .maybeSingle()

  if (subError) {
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }

  if (!subscription) {
    const { data: newSub } = await supabase.rpc('upsert_landlord_subscription', {
      p_landlord_id: user.id,
    })
    const withFreeAccess = await grantFreeAccessIfUnset(supabase, newSub)
    return NextResponse.json({ subscription: withFreeAccess, payments: [] })
  }

  const subscriptionWithFreeAccess = await grantFreeAccessIfUnset(supabase, subscription)

  const { data: payments } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('landlord_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12)

  return NextResponse.json({ subscription: subscriptionWithFreeAccess, payments: payments || [] })
}