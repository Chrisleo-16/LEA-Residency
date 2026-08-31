import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tenantId,
      currentSlotId,
      fullName,
      phoneNumber,
      email,
      monthlyRent,
      unitNumber,
      targetPropertyId, // Optional: if switching property
      targetSlotId,     // Optional: specific target slot
    } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify landlord blocks owned by current user
    const { data: blocks } = await serviceSupabase
      .from('landlord_blocks')
      .select('id, landlord_code, property_capacity, property_used')
      .eq('landlord_id', user.id)

    const landlordBlockIds = (blocks || []).map((b) => b.id)

    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('landlord_block_id, landlord_code')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.landlord_block_id && !landlordBlockIds.includes(profile.landlord_block_id)) {
      landlordBlockIds.push(profile.landlord_block_id)
    }

    // 1. Update basic tenant profile fields
    const profileUpdates: Record<string, any> = {}
    if (fullName !== undefined) profileUpdates.full_name = fullName.trim()
    if (phoneNumber !== undefined) profileUpdates.phone_number = phoneNumber.trim()

    if (Object.keys(profileUpdates).length > 0) {
      await serviceSupabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', tenantId)
    }

    // 2. Handle Property Switching if targetPropertyId is provided
    if (targetPropertyId) {
      // Find target property & block
      const { data: targetProp } = await serviceSupabase
        .from('properties')
        .select('*')
        .eq('id', targetPropertyId)
        .maybeSingle()

      let targetBlockId = targetProp?.landlord_block_id
      if (!targetBlockId) {
        // Check if targetPropertyId is a block id
        const matchedBlock = blocks?.find((b) => b.id === targetPropertyId)
        if (matchedBlock) targetBlockId = matchedBlock.id
      }

      if (!targetBlockId || !landlordBlockIds.includes(targetBlockId)) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized target property' },
          { status: 403 }
        )
      }

      const targetBlock = blocks?.find((b) => b.id === targetBlockId) || { landlord_code: 'LEA' }

      // Vacate old slot
      if (currentSlotId) {
        await serviceSupabase
          .from('tenant_slots')
          .update({
            tenant_id: null,
            is_occupied: false,
            monthly_rent: null,
          })
          .eq('id', currentSlotId)
      } else {
        // Vacate any current slot assigned to this tenant across landlord's blocks
        await serviceSupabase
          .from('tenant_slots')
          .update({
            tenant_id: null,
            is_occupied: false,
            monthly_rent: null,
          })
          .eq('tenant_id', tenantId)
          .in('landlord_block_id', landlordBlockIds)
      }

      // Assign to target slot
      let destinationSlotId = targetSlotId
      if (!destinationSlotId) {
        // Find first available vacant slot in target block
        const { data: vacantSlot } = await serviceSupabase
          .from('tenant_slots')
          .select('id, slot_number')
          .eq('landlord_block_id', targetBlockId)
          .eq('is_occupied', false)
          .order('slot_number', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (vacantSlot) {
          destinationSlotId = vacantSlot.id
        } else {
          // If no vacant slot, create a new slot in the block
          const { count } = await serviceSupabase
            .from('tenant_slots')
            .select('*', { count: 'exact', head: true })
            .eq('landlord_block_id', targetBlockId)

          const newSlotNum = (count || 0) + 1
          const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
          const newCode = `${targetBlock.landlord_code}-${String(newSlotNum).padStart(2, '0')}-${codeSuffix}`

          const { data: createdSlot } = await serviceSupabase
            .from('tenant_slots')
            .insert({
              landlord_block_id: targetBlockId,
              slot_number: newSlotNum,
              tenant_code: newCode,
              tenant_id: tenantId,
              is_occupied: true,
              monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
            })
            .select('id')
            .single()

          destinationSlotId = createdSlot?.id
        }
      }

      if (destinationSlotId && destinationSlotId !== targetSlotId) {
        await serviceSupabase
          .from('tenant_slots')
          .update({
            tenant_id: tenantId,
            is_occupied: true,
            monthly_rent: monthlyRent ? parseFloat(monthlyRent) : undefined,
          })
          .eq('id', destinationSlotId)
      } else if (destinationSlotId) {
        await serviceSupabase
          .from('tenant_slots')
          .update({
            tenant_id: tenantId,
            is_occupied: true,
            monthly_rent: monthlyRent ? parseFloat(monthlyRent) : undefined,
          })
          .eq('id', destinationSlotId)
      }

      // Update tenant profile to new block & code
      await serviceSupabase
        .from('profiles')
        .update({
          landlord_block_id: targetBlockId,
          landlord_code: targetBlock.landlord_code,
        })
        .eq('id', tenantId)
    } else if (currentSlotId && monthlyRent !== undefined) {
      // Just updating current slot rent
      await serviceSupabase
        .from('tenant_slots')
        .update({
          monthly_rent: parseFloat(monthlyRent) || 0,
        })
        .eq('id', currentSlotId)
    }

    // 3. Update or Upsert Rent Settings
    if (monthlyRent !== undefined || unitNumber !== undefined) {
      const { data: existingRS } = await serviceSupabase
        .from('rent_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      const updatedRS = {
        tenant_id: tenantId,
        monthly_amount: monthlyRent !== undefined ? parseFloat(monthlyRent) : (existingRS?.monthly_amount || 0),
        unit_number: unitNumber !== undefined ? unitNumber.trim() : (existingRS?.unit_number || null),
        updated_at: new Date().toISOString(),
      }

      await serviceSupabase
        .from('rent_settings')
        .upsert(updatedRS, { onConflict: 'tenant_id' })
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant details and property assignment updated successfully',
    })
  } catch (err: any) {
    console.error('[Tenant Update API] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
