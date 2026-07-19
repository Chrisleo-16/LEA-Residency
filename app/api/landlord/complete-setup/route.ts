import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createLandlordBlock } from '@/lib/blockchain/blockchainService'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // console.log('🟡 Step 0: API called')
    const supabase = await createClient()
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    // console.log('🟡 Step 1: Auth', { userId: user?.id, authError })
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    
    const { propertyName, propertyAddress, totalUnits, focusAreas } = await request.json()
    // console.log('🟡 Step 2: Body', { propertyName, propertyAddress, totalUnits })

    if (!propertyName || !propertyAddress || !totalUnits) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Step 3: Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, email, landlord_code, landlord_block_id')
      .eq('id', user.id)
      .maybeSingle()
    // console.log('🟡 Step 3: Profile', { profile, profileError })

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

    // Step 4: Generate landlord code
    const landlordCode =
      profile.landlord_code ||
      `LEA-${profile.full_name?.substring(0, 3).toUpperCase() || 'LAN'}-${Date.now().toString(36).slice(-6).toUpperCase()}`

    // Step 5: Get or create block
    let landlordBlockId = profile.landlord_block_id

    if (!landlordBlockId) {
      // console.log('🟡 Step 5: No block on profile, checking DB...')
      const { data: existingBlock } = await serviceSupabase
        .from('landlord_blocks')
        .select('id')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // console.log('🟡 Step 5: Existing block:', existingBlock)

      if (existingBlock) {
        landlordBlockId = existingBlock.id
      } else {
        // console.log('🟡 Step 5: Creating new block...')
        const { block, error: blockError } = await createLandlordBlock(
          user.id,
          landlordCode,
          profile.full_name || user.email || 'Landlord',
          profile.email || '',
          parsedUnits
        )
        // console.log('🟡 Step 5: Block created:', { blockId: block?.id, blockError })

        if (blockError || !block) {
          return NextResponse.json(
            { error: blockError || 'Failed to create landlord blockchain block' },
            { status: 500 }
          )
        }
        landlordBlockId = block.id
      }
    }

    // console.log('🟡 Step 6: landlordBlockId:', landlordBlockId)

    // Step 6: Get or create property
    const { data: existingProperty } = await serviceSupabase
      .from('properties')
      .select('id')
      .eq('landlord_block_id', landlordBlockId)
      .maybeSingle()
    // console.log('🟡 Step 6: Existing property:', existingProperty)

    let propertyId = existingProperty?.id

    if (!propertyId) {
      // console.log('🟡 Step 6: Creating property...')
      const { data: newProperty, error: propertyInsertError } = await serviceSupabase
        .from('properties')
        .insert({
          landlord_block_id: landlordBlockId,
          property_name: propertyName,
          property_address: propertyAddress,
        })
        .select('id')
        .single()
      // console.log('🟡 Step 6: Property created:', { propertyId: newProperty?.id, propertyInsertError })

      if (propertyInsertError || !newProperty) {
        return NextResponse.json(
          { error: propertyInsertError?.message || 'Failed to create property record' },
          { status: 500 }
        )
      }
      propertyId = newProperty.id
    }

    // Step 7: Upsert slots via RPC — ON CONFLICT DO NOTHING
    // console.log('🟡 Step 7: Building slots payload...')
    const slotsPayload = Array.from({ length: parsedUnits }, (_, i) => ({
      landlord_block_id: landlordBlockId,
      property_id: propertyId,
      slot_number: i + 1,
      tenant_code: `LEA-TENANT-${landlordBlockId!.substring(0, 8).toUpperCase()}-${i + 1}`,
      is_occupied: false,
    }))
    // console.log('🟡 Step 7: Calling RPC with', slotsPayload.length, 'slots')

    const { error: tenantSlotsError } = await serviceSupabase
      .rpc('upsert_tenant_slots', { p_slots: slotsPayload })
    // console.log('🟡 Step 7: RPC result:', tenantSlotsError)

    if (tenantSlotsError) {
      return NextResponse.json(
        { error: tenantSlotsError.message },
        { status: 500 }
      )
    }

    // Step 8: Update profile
    // console.log('🟡 Step 8: Updating profile...')
    const { error: updateProfileError } = await serviceSupabase
      .from('profiles')
      .update({
        landlord_block_id: landlordBlockId,
        landlord_code: landlordCode,
        property_setup_complete: true,
        blockchain_verified: true,
        focus_areas: Array.isArray(focusAreas) && focusAreas.length > 0 ? focusAreas : null,
      })
      .eq('id', user.id)
    // console.log('🟡 Step 8: Profile update result:', updateProfileError)

    if (updateProfileError) {
      return NextResponse.json(
        { error: updateProfileError.message },
        { status: 500 }
      )
    }

    // console.log('🟡 Step 9: Done!')
    return NextResponse.json(
      { success: true, message: 'Landlord setup completed successfully' },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('❌ Complete setup API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}