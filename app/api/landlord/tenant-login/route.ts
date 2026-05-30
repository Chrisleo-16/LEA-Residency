import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      landlordCode,
      tenantName,
      tenantEmail,
      tenantPhone,
      leaseStartDate,
      leaseEndDate,
      monthlyRent,
    } = await request.json()

    if (!landlordCode || !tenantName || !tenantEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: landlordCode, tenantName, tenantEmail' },
        { status: 400 }
      )
    }

    const normalizedLandlordCode = landlordCode.toString().trim().toUpperCase()

    const { data: block, error: blockError } = await supabase
      .from('landlord_blocks')
      .select('id, landlord_id, landlord_name, landlord_code')
      .eq('landlord_code', normalizedLandlordCode)
      .maybeSingle()

    if (blockError) {
      console.error('Landlord lookup error:', blockError)
      return NextResponse.json({ error: 'Unable to lookup landlord code' }, { status: 500 })
    }

    if (!block) {
      return NextResponse.json({ error: 'Invalid landlord code' }, { status: 400 })
    }

    const { data: availableSlot, error: slotError } = await supabase
      .from('tenant_slots')
      .select('*')
      .eq('landlord_block_id', block.id)
      .eq('is_occupied', false)
      .order('slot_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (slotError) {
      console.error('Tenant slot lookup error:', slotError)
      return NextResponse.json({ error: 'Unable to find an available unit' }, { status: 500 })
    }

    if (!availableSlot) {
      return NextResponse.json(
        { error: 'No available tenant slots remain for this landlord' },
        { status: 400 }
      )
    }

    const { data: updatedSlot, error: updateError } = await supabase
      .from('tenant_slots')
      .update({
        tenant_name: tenantName,
        tenant_email: tenantEmail,
        tenant_phone: tenantPhone || null,
        lease_start_date: leaseStartDate || null,
        lease_end_date: leaseEndDate || null,
        monthly_rent: monthlyRent || null,
        is_occupied: true,
        occupied_at: new Date().toISOString(),
      })
      .eq('id', availableSlot.id)
      .select()
      .single()

    if (updateError || !updatedSlot) {
      console.error('Tenant slot update error:', updateError)
      return NextResponse.json({ error: 'Unable to claim the tenant slot' }, { status: 500 })
    }

    await supabase.from('tenant_claims').insert({
      tenant_slot_id: updatedSlot.id,
      landlord_block_id: block.id,
      landlord_id: block.landlord_id,
      tenant_email: tenantEmail,
      tenant_name: tenantName,
      tenant_phone: tenantPhone || null,
      referral_code: normalizedLandlordCode,
      source: 'landlord_link',
      status: 'claimed',
    })

    return NextResponse.json({
      success: true,
      landlord: {
        id: block.landlord_id,
        name: block.landlord_name,
        code: block.landlord_code,
      },
      tenantSlot: updatedSlot,
      message: 'Tenant slot claimed successfully',
    })
  } catch (error: any) {
    console.error('Tenant login error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}