/**
 * User Registration API
 * Handles user signup for Tenants, Landlords, and Staff
 * POST /api/auth/register
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      role,
    } = await request.json()

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, role' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['tenant', 'landlord', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'tenant', 'landlord', or 'staff'" },
        { status: 400 }
      )
    }

    // Step 1: Create user in Supabase Auth using the service role key
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Step 2: Create user profile only
    // Landlords will complete blockchain + property setup on /complete-setup
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: name,
      role,
      blockchain_verified: false,
      property_setup_complete: false,
      kyc_verified: false,
    })

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          name,
          role,
        },
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}