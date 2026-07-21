import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function requireDeveloper(): Promise<{ error: NextResponse; sessionUserId?: undefined } | { error?: undefined; sessionUserId: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  if (!profile || profile.role !== 'developer') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { sessionUserId: session.user.id }
}

async function resolveLandlordTenantIds(blockIds: string[]) {
  const [slotsRes, directProfilesRes] = await Promise.all([
    blockIds.length
      ? serviceClient.from('tenant_slots').select('tenant_id').in('landlord_block_id', blockIds)
      : Promise.resolve({ data: [] as any[] }),
    blockIds.length
      ? serviceClient.from('profiles').select('id').in('landlord_block_id', blockIds).eq('role', 'tenant')
      : Promise.resolve({ data: [] as any[] }),
  ])
  const tenantIds = [...new Set([
    ...(slotsRes.data || []).map((s: any) => s.tenant_id).filter(Boolean),
    ...(directProfilesRes.data || []).map((p: any) => p.id),
  ])] as string[]
  return tenantIds
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDeveloper()
  if (auth.error) return auth.error
  const { id } = await params

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, full_name, email, role, landlord_code')
    .eq('id', id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (profile.role !== 'landlord') {
    const [paymentsRes, complaintsRes, requestsRes] = await Promise.all([
      serviceClient.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      serviceClient.from('complaints').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      serviceClient.from('requests').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    ])
    return NextResponse.json({
      profile,
      impact: {
        paymentCount: paymentsRes.count || 0,
        complaintCount: complaintsRes.count || 0,
        requestCount: requestsRes.count || 0,
      },
    })
  }

  const { data: blocks } = await serviceClient.from('landlord_blocks').select('id').eq('landlord_id', id)
  const blockIds = (blocks || []).map((b: any) => b.id)
  const tenantIds = await resolveLandlordTenantIds(blockIds)

  const [subscriptionRes, paymentsRes, subPaymentsRes] = await Promise.all([
    serviceClient.from('landlord_subscriptions').select('status, monthly_fee').eq('landlord_id', id).maybeSingle(),
    tenantIds.length
      ? serviceClient.from('payments').select('id', { count: 'exact', head: true }).in('tenant_id', tenantIds)
      : Promise.resolve({ count: 0 }),
    serviceClient.from('subscription_payments').select('id', { count: 'exact', head: true }).eq('landlord_id', id),
  ])

  return NextResponse.json({
    profile,
    impact: {
      hasSubscription: !!subscriptionRes.data,
      subscriptionStatus: subscriptionRes.data?.status ?? null,
      monthlyFee: subscriptionRes.data?.monthly_fee ?? null,
      blockCount: blockIds.length,
      tenantCount: tenantIds.length,
      paymentCount: paymentsRes.count || 0,
      subscriptionPaymentCount: subPaymentsRes.count || 0,
    },
  })
}

// Deletes tenant accounts. Payment ledger rows are never deleted — only
// snapshotted (tenant_name/tenant_email) and left with tenant_id set NULL by
// the ON DELETE SET NULL constraint on payments.tenant_id (see
// supabase/migrations/20260720_preserve_payments_on_tenant_removal.sql, which
// exists specifically because a prior version of tenant deletion cascaded
// and silently wiped payment history). Mirrors the cleanup already used by
// the tenant self-service approval flow in app/api/account-deletion-requests.
async function removeTenants(tenantIds: string[]) {
  if (tenantIds.length === 0) return

  const { data: tenantProfiles } = await serviceClient
    .from('profiles')
    .select('id, full_name, email')
    .in('id', tenantIds)

  await Promise.all(
    (tenantProfiles || []).map((t: any) =>
      serviceClient.from('payments').update({ tenant_name: t.full_name, tenant_email: t.email }).eq('tenant_id', t.id),
    ),
  )

  await Promise.all([
    serviceClient.from('message_reads').delete().in('user_id', tenantIds),
    serviceClient.from('message_reactions').delete().in('user_id', tenantIds),
    serviceClient.from('messages').delete().in('sender_id', tenantIds),
    serviceClient.from('conversation_participants').delete().in('user_id', tenantIds),
    serviceClient.from('complaints').delete().in('tenant_id', tenantIds),
    serviceClient.from('requests').delete().in('tenant_id', tenantIds),
    serviceClient.from('rent_settings').delete().in('tenant_id', tenantIds),
    serviceClient.from('account_deletion_requests').delete().in('user_id', tenantIds),
    serviceClient.from('push_subscriptions').delete().in('user_id', tenantIds),
  ])

  await serviceClient.from('tenant_slots').delete().in('tenant_id', tenantIds)
  await serviceClient.from('profiles').delete().in('id', tenantIds)

  await Promise.all(tenantIds.map((tid) => serviceClient.auth.admin.deleteUser(tid).catch(() => null)))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDeveloper()
  if (auth.error) return auth.error
  const { id } = await params

  if (id === auth.sessionUserId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const { data: profile } = await serviceClient.from('profiles').select('id, role').eq('id', id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (profile.role === 'tenant') {
    await removeTenants([id])
    return NextResponse.json({ success: true, removedTenants: 1, removedBlocks: 0 })
  }

  if (profile.role === 'landlord') {
    const { data: blocks } = await serviceClient.from('landlord_blocks').select('id').eq('landlord_id', id)
    const blockIds = (blocks || []).map((b: any) => b.id)
    const tenantIds = await resolveLandlordTenantIds(blockIds)

    await removeTenants(tenantIds)

    if (blockIds.length) {
      await serviceClient.from('tenant_slots').delete().in('landlord_block_id', blockIds)
      await serviceClient.from('landlord_blocks').delete().in('id', blockIds)
    }

    // subscription_payments is left untouched — same ledger-preservation
    // principle as `payments` above, just orphaned rather than deleted
    // (no FK constraint exists on this table to enforce/auto-null it).
    // landlord_subscriptions is current-state, not a ledger, so it's removed.
    await serviceClient.from('landlord_subscriptions').delete().eq('landlord_id', id)
    await serviceClient.from('push_subscriptions').delete().eq('user_id', id)
    await serviceClient.from('profiles').delete().eq('id', id)
    await serviceClient.auth.admin.deleteUser(id).catch(() => null)

    return NextResponse.json({ success: true, removedTenants: tenantIds.length, removedBlocks: blockIds.length })
  }

  await serviceClient.from('push_subscriptions').delete().eq('user_id', id)
  await serviceClient.from('profiles').delete().eq('id', id)
  await serviceClient.auth.admin.deleteUser(id).catch(() => null)
  return NextResponse.json({ success: true, removedTenants: 0, removedBlocks: 0 })
}
