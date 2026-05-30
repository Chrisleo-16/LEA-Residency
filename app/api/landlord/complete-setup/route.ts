import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createLandlordBlock } from '@/lib/blockchain/blockchainService'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyName, propertyAddress, totalUnits } = await request.json()

    if (!propertyName || !propertyAddress || !totalUnits) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyName, propertyAddress, totalUnits' },
        { status: 400 }
      )
    }

    const parsedUnits = parseInt(totalUnits, 10)
    if (Number.isNaN(parsedUnits) || parsedUnits < 1) {
      return NextResponse.json(
        { error: 'Total units must be a positive number' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, email, landlord_code, landlord_block_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: profileError?.message || 'Profile not found' },
        { status: 400 }
      )
    }

    if (profile.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Only landlords can complete property setup' },
        { status: 403 }
      )
    }

    const landlordCode =
      profile.landlord_code ||
      `LEA-${profile.full_name?.substring(0, 3).toUpperCase() || 'LAN'}${profile.email?.substring(0, 3).toUpperCase() || 'EMP'}-${Date.now().toString(36)}`.toUpperCase()

    let landlordBlockId = profile.landlord_block_id

    if (!landlordBlockId) {
      const { block, error: blockError } = await createLandlordBlock(
        user.id,
        landlordCode,
        profile.full_name || user.email || 'Landlord',
        profile.email || '',
        parsedUnits
      )

      if (blockError || !block) {
        return NextResponse.json(
          { error: blockError || 'Failed to create landlord blockchain block' },
          { status: 500 }
        )
      }

      landlordBlockId = block.id
    }

    const { data: existingProperty, error: existingPropertyError } = await serviceSupabase
      .from('properties')
      .select('*')
      .eq('landlord_block_id', landlordBlockId)
      .maybeSingle()

    if (existingPropertyError) {
      return NextResponse.json(
        { error: existingPropertyError.message },
        { status: 500 }
      )
    }

    let property = existingProperty
    if (!property) {
      const { data: newProperty, error: propertyInsertError } = await serviceSupabase
        .from('properties')
        .insert({
          landlord_block_id: landlordBlockId,
          property_name: propertyName,
          property_address: propertyAddress,
        })
        .select()
        .single()

      if (propertyInsertError || !newProperty) {
        return NextResponse.json(
          { error: propertyInsertError?.message || 'Failed to create property record' },
          { status: 500 }
        )
      }

      property = newProperty
    }

    const { data: existingSlots, error: slotsError } = await serviceSupabase
      .from('tenant_slots')
      .select('id')
      .eq('property_id', property.id)

    if (slotsError) {
      return NextResponse.json(
        { error: slotsError.message },
        { status: 500 }
      )
    }

    if (!existingSlots || existingSlots.length === 0) {
      const slotsPayload = []
      for (let i = 1; i <= parsedUnits; i++) {
        slotsPayload.push({
          landlord_block_id: landlordBlockId,
          property_id: property.id,
          slot_number: i,
          tenant_code: `LEA-TENANT-${landlordBlockId.substring(0, 8).toUpperCase()}-${i}`,
          is_occupied: false,
        })
      }

      const { error: tenantSlotsError } = await serviceSupabase.from('tenant_slots').insert(slotsPayload)
      if (tenantSlotsError) {
        return NextResponse.json(
          { error: tenantSlotsError.message },
          { status: 500 }
        )
      }
    }

    const { error: updateProfileError } = await serviceSupabase
      .from('profiles')
      .update({
        landlord_block_id: landlordBlockId,
        landlord_code: landlordCode,
        property_setup_complete: true,
        blockchain_verified: true,
      })
      .eq('id', user.id)

    if (updateProfileError) {
      return NextResponse.json(
        { error: updateProfileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Landlord setup completed successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Complete setup API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
