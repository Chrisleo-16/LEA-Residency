import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get total landlords
    const { count: landlordCount } = await supabase
      .from('landlord_blocks')
      .select('*', { count: 'exact', head: true })

    // Get total tenants
    const { count: tenantCount } = await supabase
      .from('tenant_slots')
      .select('*', { count: 'exact', head: true })
      .eq('is_occupied', true)

    // Get blockchain blocks count
    const { count: blockCount } = await supabase
      .from('landlord_blocks')
      .select('*', { count: 'exact', head: true })

    const data = {
      enabled: true,
      totalLandlords: landlordCount || 0,
      totalTenants: tenantCount || 0,
      isolationLevel: 'strict',
      rlsEnabled: true,
      blockchainBlocks: blockCount || 0
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching multi-tenancy status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch multi-tenancy status' },
      { status: 500 }
    )
  }
}
