import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ subscription: newSub, payments: [] })
  }

  const { data: payments } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('landlord_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12)

  return NextResponse.json({ subscription, payments: payments || [] })
}