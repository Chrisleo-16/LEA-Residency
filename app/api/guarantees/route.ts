import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  DEFAULT_COVERAGE_MONTHS,
  DEFAULT_FEE_PERCENT,
  MAX_MONTHLY_RENT_KES,
  calcMonthlyFee,
} from '@/lib/guarantees'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = serviceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const statusFilter = request.nextUrl.searchParams.get('status')
    let query = service
      .from('rent_guarantees')
      .select(
        `
        *,
        tenant:profiles!rent_guarantees_tenant_id_fkey(full_name, email, phone_number),
        landlord:profiles!rent_guarantees_landlord_id_fkey(full_name, email),
        property:properties(property_name, property_address)
      `,
      )
      .order('applied_at', { ascending: false })

    if (profile?.role === 'developer') {
      // all
    } else if (profile?.role === 'landlord') {
      query = query.eq('landlord_id', user.id)
    } else {
      query = query.eq('tenant_id', user.id)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) {
      // Fallback without FK join aliases if schema cache is picky
      console.warn('[guarantees GET] join failed, falling back:', error.message)
      let fallback = service
        .from('rent_guarantees')
        .select('*')
        .order('applied_at', { ascending: false })

      if (profile?.role === 'landlord') fallback = fallback.eq('landlord_id', user.id)
      else if (profile?.role !== 'developer') fallback = fallback.eq('tenant_id', user.id)
      if (statusFilter) fallback = fallback.eq('status', statusFilter)

      const { data: rows, error: fallbackError } = await fallback
      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }
      return NextResponse.json({ guarantees: rows || [] })
    }

    return NextResponse.json({ guarantees: data || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      phoneNumber,
      employerName,
      declaredIncome,
      mpesaStatementPath,
      tenantNotes,
    } = body

    if (!phoneNumber?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const service = serviceClient()

    const { data: profile } = await service
      .from('profiles')
      .select('id, role, landlord_block_id, phone_number')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'tenant') {
      return NextResponse.json({ error: 'Only tenants can apply for a rent guarantee' }, { status: 403 })
    }

    if (!profile.landlord_block_id) {
      return NextResponse.json(
        { error: 'You must be linked to a property before applying for a guarantee' },
        { status: 400 },
      )
    }

    // Existing open guarantee?
    const { data: existing } = await service
      .from('rent_guarantees')
      .select('id, status')
      .eq('tenant_id', user.id)
      .in('status', ['applied', 'under_review', 'approved', 'active', 'defaulted', 'claimed'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `You already have a guarantee application in status: ${existing.status}` },
        { status: 409 },
      )
    }

    // Resolve property + landlord + rent
    const { data: property } = await service
      .from('properties')
      .select('id, landlord_block_id, guarantee_enabled, property_name')
      .eq('landlord_block_id', profile.landlord_block_id)
      .maybeSingle()

    if (!property?.guarantee_enabled) {
      return NextResponse.json(
        {
          error:
            'Your landlord has not enabled rent guarantee on this property yet. Ask them to turn it on in the LEA Guarantee app (/guarantee).',
        },
        { status: 400 },
      )
    }

    const { data: block } = await service
      .from('landlord_blocks')
      .select('id, landlord_id')
      .eq('id', profile.landlord_block_id)
      .single()

    if (!block?.landlord_id) {
      return NextResponse.json({ error: 'Could not resolve landlord for your property' }, { status: 400 })
    }

    const { data: slot } = await service
      .from('tenant_slots')
      .select('id, monthly_rent')
      .eq('tenant_id', user.id)
      .maybeSingle()

    const { data: rentSetting } = await service
      .from('rent_settings')
      .select('monthly_amount')
      .eq('tenant_id', user.id)
      .maybeSingle()

    const monthlyRent = Number(rentSetting?.monthly_amount || slot?.monthly_rent || 0)
    if (!monthlyRent || monthlyRent <= 0) {
      return NextResponse.json(
        { error: 'Your landlord must set your monthly rent before you can apply' },
        { status: 400 },
      )
    }

    if (monthlyRent > MAX_MONTHLY_RENT_KES) {
      return NextResponse.json(
        {
          error: `Pilot cap: guarantees only cover rent up to KES ${MAX_MONTHLY_RENT_KES.toLocaleString()}. Your rent is KES ${monthlyRent.toLocaleString()}.`,
        },
        { status: 400 },
      )
    }

    const income = declaredIncome != null ? Number(declaredIncome) : null
    if (income != null && income > 0 && monthlyRent / income > 0.4) {
      // Soft warning stored as note — still allow apply for manual review
    }

    const feePercent = DEFAULT_FEE_PERCENT
    const monthlyFee = calcMonthlyFee(monthlyRent, feePercent)

    const { data: guarantee, error: insertError } = await service
      .from('rent_guarantees')
      .insert({
        tenant_id: user.id,
        landlord_id: block.landlord_id,
        property_id: property.id,
        tenant_slot_id: slot?.id || null,
        monthly_rent: monthlyRent,
        fee_percent: feePercent,
        monthly_fee_amount: monthlyFee,
        coverage_months: DEFAULT_COVERAGE_MONTHS,
        status: 'under_review',
        phone_number: phoneNumber.trim(),
        employer_name: employerName?.trim() || null,
        declared_income: income,
        mpesa_statement_path: mpesaStatementPath || null,
        tenant_notes: tenantNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insertError || !guarantee) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to submit guarantee application' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, guarantee }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
