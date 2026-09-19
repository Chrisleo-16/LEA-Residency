import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  ensureTenancyAccount,
  generateBillForPeriod,
  allocatePayment,
  getAccountSummary,
} from '@/lib/tenancy/ledger'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveLandlordForTenant(sb: any, tenantId: string) {
  const { data: profile } = await sb
    .from('profiles')
    .select('id, landlord_block_id')
    .eq('id', tenantId)
    .maybeSingle()

  const { data: slot } = await sb
    .from('tenant_slots')
    .select('landlord_block_id, unit_id')
    .eq('tenant_id', tenantId)
    .eq('is_occupied', true)
    .maybeSingle()

  // Prefer occupied slot; fall back to profile.landlord_block_id
  const blockId =
    slot?.landlord_block_id || profile?.landlord_block_id || null

  if (!blockId) return null

  // Prefer landlord_blocks.landlord_id (source of truth), then profiles match
  const { data: block } = await sb
    .from('landlord_blocks')
    .select('id, landlord_id')
    .eq('id', blockId)
    .maybeSingle()

  let landlordId = block?.landlord_id as string | undefined

  if (!landlordId) {
    const { data: landlord } = await sb
      .from('profiles')
      .select('id')
      .eq('landlord_block_id', blockId)
      .eq('role', 'landlord')
      .maybeSingle()
    landlordId = landlord?.id
  }

  if (!landlordId) return null

  let unitNumber: string | null = null
  if (slot?.unit_id) {
    const { data: unit } = await sb
      .from('units')
      .select('unit_number')
      .eq('id', slot.unit_id)
      .maybeSingle()
    unitNumber = unit?.unit_number || null
  }

  const { data: rs } = await sb
    .from('rent_settings')
    .select('unit_number')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    landlordId,
    landlordBlockId: blockId as string,
    unitNumber: unitNumber || rs?.unit_number || null,
  }
}

/**
 * GET /api/tenancy/account
 * ?tenant_id= (landlord) or own account (tenant)
 * ?generate=1 to ensure current-period bill exists
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await createClient()
    const authHeader = request.headers.get('authorization')
    const bearer =
      authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null

    const { data: authData, error: authError } = bearer
      ? await auth.auth.getUser(bearer)
      : await auth.auth.getUser()

    const user = authData.user
    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized' },
        { status: 401 }
      )
    }

    const sb = service()
    const { data: profile } = await sb
      .from('profiles')
      .select('role, landlord_block_id')
      .eq('id', user.id)
      .maybeSingle()

    const { searchParams } = new URL(request.url)
    const tenantIdParam = searchParams.get('tenant_id')
    const shouldGenerate = searchParams.get('generate') === '1'
    const period =
      searchParams.get('period') || new Date().toISOString().slice(0, 7)

    let tenantId = user.id
    if (profile?.role === 'landlord' && tenantIdParam) {
      tenantId = tenantIdParam
    } else if (profile?.role === 'landlord' && !tenantIdParam) {
      // list all accounts for this landlord
      const { data: accounts } = await sb
        .from('tenancy_accounts')
        .select('*, profiles:tenant_id(id, full_name, email, phone_number)')
        .eq('landlord_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })

      return NextResponse.json({ success: true, accounts: accounts || [] })
    }

    const ctx = await resolveLandlordForTenant(sb, tenantId)
    if (!ctx?.landlordId) {
      return NextResponse.json(
        { error: 'No active tenancy found for this tenant' },
        { status: 404 }
      )
    }

    if (
      profile?.role === 'landlord' &&
      ctx.landlordId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const account = await ensureTenancyAccount(sb, {
      tenantId,
      landlordId: ctx.landlordId,
      landlordBlockId: ctx.landlordBlockId,
      unitNumber: ctx.unitNumber,
    })

    if (shouldGenerate) {
      await generateBillForPeriod(sb, account.id, period, {
        createdBy: user.id,
      })
    }

    const summary = await getAccountSummary(sb, account.id)
    return NextResponse.json({ success: true, ...summary })
  } catch (err: any) {
    console.error('[tenancy/account]', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tenancy/account
 * Actions: generate_bill | allocate | set_variable_charge | add_recurring
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await createClient()
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = service()
    const body = await request.json()
    const action = body.action as string

    if (action === 'allocate') {
      const { paymentId, tenancyAccountId, amount } = body
      if (!paymentId || !tenancyAccountId || !amount) {
        return NextResponse.json(
          { error: 'paymentId, tenancyAccountId, amount required' },
          { status: 400 }
        )
      }
      const result = await allocatePayment(sb, {
        paymentId,
        tenancyAccountId,
        amount: Number(amount),
        createdBy: user.id,
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'generate_bill') {
      const tenantId = body.tenantId || user.id
      const period = body.period || new Date().toISOString().slice(0, 7)
      const ctx = await resolveLandlordForTenant(sb, tenantId)
      if (!ctx?.landlordId) {
        return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 })
      }

      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (
        profile?.role === 'landlord' &&
        ctx.landlordId !== user.id
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const account = await ensureTenancyAccount(sb, {
        tenantId,
        landlordId: ctx.landlordId,
        landlordBlockId: ctx.landlordBlockId,
        unitNumber: ctx.unitNumber,
      })

      const bill = await generateBillForPeriod(sb, account.id, period, {
        variableAmounts: body.variableAmounts,
        dueDay: body.dueDay,
        createdBy: user.id,
      })

      return NextResponse.json({ success: true, bill })
    }

    if (action === 'upsert_recurring') {
      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'landlord') {
        return NextResponse.json({ error: 'Landlords only' }, { status: 403 })
      }

      const { tenancyAccountId, charge } = body
      if (!tenancyAccountId || !charge?.charge_type || !charge?.label) {
        return NextResponse.json({ error: 'Invalid charge' }, { status: 400 })
      }

      const { data, error } = await sb
        .from('recurring_charges')
        .insert({
          tenancy_account_id: tenancyAccountId,
          charge_type: charge.charge_type,
          label: charge.label,
          amount: charge.is_variable ? null : Number(charge.amount || 0),
          is_variable: !!charge.is_variable,
          priority: charge.priority ?? 100,
          is_active: true,
        })
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, charge: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[tenancy/account POST]', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
