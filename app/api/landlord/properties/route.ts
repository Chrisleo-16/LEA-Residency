import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createLandlordBlock } from '@/lib/blockchain/blockchainService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all landlord blocks for this user
    const { data: blocks } = await serviceSupabase
      .from('landlord_blocks')
      .select('id, landlord_code, property_capacity, property_used, created_at')
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: true })

    const blockIds = (blocks || []).map((b) => b.id)

    // Fetch user profile for fallback landlord_block_id
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('landlord_block_id, landlord_code, full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.landlord_block_id && !blockIds.includes(profile.landlord_block_id)) {
      blockIds.push(profile.landlord_block_id)
    }

    let properties: any[] = []
    if (blockIds.length > 0) {
      const { data: propRows } = await serviceSupabase
        .from('properties')
        .select('*')
        .in('landlord_block_id', blockIds)
        .order('created_at', { ascending: true })

      properties = (propRows || []).map((p) => {
        const matchedBlock = (blocks || []).find((b) => b.id === p.landlord_block_id)
        return {
          ...p,
          capacity: matchedBlock?.property_capacity || 10,
          used: matchedBlock?.property_used || 0,
          landlord_code: matchedBlock?.landlord_code || profile?.landlord_code || 'LEA',
        }
      })
    }

    // Fallback if no properties table entry exists yet
    if (properties.length === 0 && blockIds.length > 0) {
      const primaryBlock = blocks?.[0]
      properties.push({
        id: primaryBlock?.id || profile?.landlord_block_id || 'default',
        landlord_block_id: primaryBlock?.id || profile?.landlord_block_id || 'default',
        property_name: 'Executive Residency',
        property_address: 'Nairobi, Kenya',
        capacity: primaryBlock?.property_capacity || 10,
        used: primaryBlock?.property_used || 0,
        landlord_code: primaryBlock?.landlord_code || profile?.landlord_code || 'LEA',
      })
    }

    // Fetch all slots across all blocks
    let allSlots: any[] = []
    if (blockIds.length > 0) {
      const { data: slotRows } = await serviceSupabase
        .from('tenant_slots')
        .select('id, landlord_block_id, slot_number, tenant_code, tenant_id, is_occupied, monthly_rent, lease_start_date, lease_end_date, created_at')
        .in('landlord_block_id', blockIds)
        .order('slot_number', { ascending: true })

      allSlots = slotRows || []
    }

    const tenantIds = Array.from(new Set(allSlots.map((s) => s.tenant_id).filter(Boolean)))
    let tenantMap: Record<string, any> = {}
    let rentMap: Record<string, any> = {}

    if (tenantIds.length > 0) {
      const { data: tenantProfiles } = await serviceSupabase
        .from('profiles')
        .select('id, full_name, email, phone_number, avatar_url, created_at')
        .in('id', tenantIds)

      if (tenantProfiles) {
        tenantMap = Object.fromEntries(tenantProfiles.map((t) => [t.id, t]))
      }

      const { data: rentSettings } = await serviceSupabase
        .from('rent_settings')
        .select('tenant_id, monthly_amount, due_day, unit_number, wifi_enabled, wifi_amount, created_at')
        .in('tenant_id', tenantIds)

      if (rentSettings) {
        rentMap = Object.fromEntries(rentSettings.map((r) => [r.tenant_id, r]))
      }
    }

    const enrichedSlots = allSlots.map((s) => ({
      ...s,
      is_occupied: Boolean(s.tenant_id && (s.is_occupied ?? true)),
      tenant: s.tenant_id ? tenantMap[s.tenant_id] || null : null,
      rent_setting: s.tenant_id ? rentMap[s.tenant_id] || null : null,
    }))

    // Attach enriched slots to each property
    const propertiesWithSlots = properties.map((prop) => {
      const propSlots = enrichedSlots.filter((s) => s.landlord_block_id === prop.landlord_block_id)
      const occupiedCount = propSlots.filter((s) => s.is_occupied && s.tenant_id).length
      return {
        ...prop,
        slots: propSlots,
        totalUnits: propSlots.length || prop.capacity || 0,
        occupiedUnits: occupiedCount,
      }
    })

    // Fetch recent payments for all properties
    const { data: payments } = await serviceSupabase
      .from('payments')
      .select('id, tenant_id, landlord_id, amount, phone_number, mpesa_code, payment_month, payment_date, status, payment_method, notes, created_at, tenant_name, tenant_email')
      .eq('landlord_id', user.id)
      .order('payment_date', { ascending: false })
      .limit(50)

    const enrichedPayments = (payments || []).map((p) => {
      const tenant = tenantMap[p.tenant_id]
      return {
        ...p,
        tenant_name: tenant?.full_name || p.tenant_name || 'Tenant',
        tenant_email: tenant?.email || p.tenant_email || '',
        phone_number: tenant?.phone_number || p.phone_number || '',
      }
    })

    // Fetch recent direct message threads
    const { data: myParticipations } = await serviceSupabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const convIds = (myParticipations || []).map((p) => p.conversation_id)
    let recentMessages: any[] = []

    if (convIds.length > 0) {
      const { data: msgs } = await serviceSupabase
        .from('messages')
        .select('id, conversation_id, sender_id, text, created_at, profiles!messages_sender_id_fkey(full_name, email, avatar_url)')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(20)

      recentMessages = msgs || []
    }

    return NextResponse.json({
      success: true,
      properties: propertiesWithSlots,
      allSlots: enrichedSlots,
      payments: enrichedPayments,
      recentMessages,
    })
  } catch (err: any) {
    console.error('[Multi-Property API] GET Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyName, propertyAddress, totalUnits } = body

    if (!propertyName || !propertyAddress || !totalUnits) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedUnits = parseInt(totalUnits, 10)
    if (isNaN(parsedUnits) || parsedUnits < 1) {
      return NextResponse.json({ error: 'Units must be at least 1' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch profile
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single()

    const nameInitials = (profile?.full_name || 'LAN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
    const uniqueSuffix = Date.now().toString(36).slice(-5).toUpperCase()
    const landlordCode = `LEA-${nameInitials}-${uniqueSuffix}`

    // 1. Create a dedicated blockchain block for this new property
    const { block, error: blockError } = await createLandlordBlock(
      user.id,
      landlordCode,
      profile?.full_name || 'Landlord',
      profile?.email || '',
      parsedUnits
    )

    if (blockError || !block) {
      return NextResponse.json({ error: blockError || 'Failed to initialize property ledger block' }, { status: 500 })
    }

    // 2. Insert into properties table
    const { data: newProperty, error: propError } = await serviceSupabase
      .from('properties')
      .insert({
        landlord_block_id: block.id,
        property_name: propertyName.trim(),
        property_address: propertyAddress.trim(),
      })
      .select()
      .single()

    if (propError) {
      console.error('[Multi-Property API] Property insert error:', propError)
      return NextResponse.json({ error: propError.message }, { status: 500 })
    }

    // 3. Generate tenant slots for each unit in this property
    const slotsToInsert = Array.from({ length: parsedUnits }, (_, i) => ({
      landlord_block_id: block.id,
      slot_number: i + 1,
      tenant_code: `${landlordCode}-UNIT-${i + 1}`,
      is_occupied: false,
    }))

    const { error: slotsError } = await serviceSupabase
      .from('tenant_slots')
      .insert(slotsToInsert)

    if (slotsError) {
      console.error('[Multi-Property API] Slots insert error:', slotsError)
    }

    return NextResponse.json({
      success: true,
      property: {
        ...newProperty,
        capacity: parsedUnits,
        used: 0,
        landlord_code: landlordCode,
      },
    })
  } catch (err: any) {
    console.error('[Multi-Property API] POST Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, propertyName, propertyAddress, totalUnits } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch the property and verify the user owns the block
    const { data: prop, error: propError } = await serviceSupabase
      .from('properties')
      .select('id, landlord_block_id, property_name, property_address')
      .eq('id', propertyId)
      .single()

    if (propError || !prop) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Verify ownership in landlord_blocks
    const { data: block, error: blockError } = await serviceSupabase
      .from('landlord_blocks')
      .select('id, landlord_id, landlord_code, property_capacity, property_used, block_data')
      .eq('id', prop.landlord_block_id)
      .eq('landlord_id', user.id)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Unauthorized to modify this property' }, { status: 403 })
    }

    // 1. Update property metadata
    const updatePayload: Record<string, any> = {}
    if (propertyName && propertyName.trim()) updatePayload.property_name = propertyName.trim()
    if (propertyAddress && propertyAddress.trim()) updatePayload.property_address = propertyAddress.trim()

    if (Object.keys(updatePayload).length > 0) {
      const { error: updatePropErr } = await serviceSupabase
        .from('properties')
        .update(updatePayload)
        .eq('id', propertyId)

      if (updatePropErr) {
        return NextResponse.json({ error: updatePropErr.message }, { status: 500 })
      }
    }

    // 2. Handle capacity resize if provided
    if (totalUnits !== undefined && totalUnits !== null) {
      const newCapacity = parseInt(totalUnits, 10)
      if (isNaN(newCapacity) || newCapacity < 1) {
        return NextResponse.json({ error: 'Total units must be at least 1' }, { status: 400 })
      }

      // Check current occupied slots
      const { data: currentSlots } = await serviceSupabase
        .from('tenant_slots')
        .select('id, slot_number, is_occupied, tenant_id')
        .eq('landlord_block_id', block.id)

      const occupiedSlots = (currentSlots || []).filter((s) => s.is_occupied || s.tenant_id)
      if (newCapacity < occupiedSlots.length) {
        return NextResponse.json({
          error: `Cannot reduce capacity to ${newCapacity} units because ${occupiedSlots.length} units are currently occupied.`,
        }, { status: 400 })
      }

      const existingSlotNumbers = new Set((currentSlots || []).map((s) => s.slot_number))
      const currentMaxSlot = Math.max(0, ...(currentSlots || []).map((s) => s.slot_number))

      // If increasing capacity: insert missing slots up to newCapacity
      if (newCapacity > currentMaxSlot) {
        const slotsToInsert: any[] = []
        for (let i = 1; i <= newCapacity; i++) {
          if (!existingSlotNumbers.has(i)) {
            slotsToInsert.push({
              landlord_block_id: block.id,
              property_id: prop.id,
              slot_number: i,
              tenant_code: `${block.landlord_code || 'LEA'}-UNIT-${i}`,
              is_occupied: false,
            })
          }
        }
        if (slotsToInsert.length > 0) {
          await serviceSupabase.from('tenant_slots').insert(slotsToInsert)
        }
      } else if (newCapacity < currentMaxSlot) {
        // If decreasing capacity: delete vacant slots with slot_number > newCapacity
        // (Ensure occupied slots are safely preserved or relocated)
        const occupiedAboveNewCap = (currentSlots || []).filter(
          (s) => s.slot_number > newCapacity && (s.is_occupied || s.tenant_id)
        )
        
        for (const occ of occupiedAboveNewCap) {
          // Find first vacant slot below newCapacity
          const availableSlot = (currentSlots || []).find(
            (s) => s.slot_number <= newCapacity && !s.is_occupied && !s.tenant_id
          )
          if (availableSlot) {
            await serviceSupabase.from('tenant_slots').delete().eq('id', availableSlot.id)
            await serviceSupabase
              .from('tenant_slots')
              .update({
                slot_number: availableSlot.slot_number,
                tenant_code: `${block.landlord_code || 'LEA'}-UNIT-${availableSlot.slot_number}`,
              })
              .eq('id', occ.id)
          }
        }

        // Delete remaining vacant slots above newCapacity
        await serviceSupabase
          .from('tenant_slots')
          .delete()
          .eq('landlord_block_id', block.id)
          .gt('slot_number', newCapacity)
      }

      // Update landlord_blocks table
      const updatedBlockData = {
        ...(block.block_data || {}),
        property_capacity: newCapacity,
      }

      await serviceSupabase
        .from('landlord_blocks')
        .update({
          property_capacity: newCapacity,
          property_used: occupiedSlots.length,
          block_data: updatedBlockData,
        })
        .eq('id', block.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Property updated successfully',
    })
  } catch (err: any) {
    console.error('[Multi-Property API] PATCH Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
