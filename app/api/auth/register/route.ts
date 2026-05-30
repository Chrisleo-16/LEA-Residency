/**
 * User Registration API
 * Handles user signup for Tenants, Landlords, and Staff
 * POST /api/auth/register
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createLandlordBlock } from '@/lib/blockchain/blockchainService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Use service role to create profile and blockchain data securely on the server

    const {
      email,
      password,
      name,
      role, 
      propertyName,
      propertyAddress,
      totalUnits,
    } = await request.json();

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name, role" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["tenant", "landlord", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'tenant', 'landlord', or 'staff'" },
        { status: 400 }
      );
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
        {
          error: authError?.message || "Failed to create user account",
        },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Step 2: Create user profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: name,
      role,
      blockchain_verified: false,
      property_setup_complete: role !== "landlord", // Landlords need property setup
      kyc_verified: false,
    });

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Step 3: If landlord, create blockchain block and properties
    if (role === "landlord") {
      try {
        // Generate landlord code
        const timestamp = Date.now().toString(36);
        const nameHash = name.substring(0, 3).toUpperCase();
        const emailHash = email.substring(0, 3).toUpperCase();
        const landlordCode = `LEA-${nameHash}${emailHash}-${timestamp}`.toUpperCase();

        // Create landlord blockchain block
        const { block, error: blockError } = await createLandlordBlock(
          userId,
          landlordCode,
          name,
          email,
          parseInt(totalUnits || "0")
        );

        if (blockError) {
          console.error("Blockchain block creation failed:", blockError);
          // Don't fail the registration, just log the error
        } else {
          // Create property
          const { data: property, error: propertyError } = await supabase
            .from("properties")
            .insert({
              landlord_block_id: block?.id,
              property_name: propertyName || "Main Property",
              property_address: propertyAddress || "",
            })
            .select()
            .single();

          if (!propertyError) {
            // Create tenant slots
            const slotsPayload = [];
            const unitCount = parseInt(totalUnits || "1");

            for (let i = 1; i <= unitCount; i++) {
              slotsPayload.push({
                landlord_block_id: block?.id,
                property_id: property?.id,
                slot_number: i,
                tenant_code: `LEA-TENANT-${block?.id?.substring(0, 8).toUpperCase()}-${i}`,
                is_occupied: false,
              });
            }

            if (slotsPayload.length > 0) {
              await supabase.from("tenant_slots").insert(slotsPayload);
            }

            // Update profile as setup complete
            await supabase
              .from("profiles")
              .update({
                landlord_block_id: block?.id,
                landlord_code: landlordCode,
                property_setup_complete: true,
                blockchain_verified: true,
              })
              .eq("id", userId);
          }
        }
      } catch (blockchainError) {
        console.error("Blockchain setup error:", blockchainError);
        // Continue registration even if blockchain fails
      }
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
    );
  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
