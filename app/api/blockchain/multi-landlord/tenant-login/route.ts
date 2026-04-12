/**
 * Multi-Landlord Tenant Login API
 * Validates tenant codes and assigns tenants to specific slots
 * POST /api/blockchain/multi-landlord/tenant-login
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MultiLandlordBlockchainService } from '@/lib/blockchain/multi_landlord_service';
import crypto from 'crypto';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      tenantCode,
      tenantEmail,
      tenantName,
      tenantPhone,
      leaseInfo
    } = body;

    // Validate input
    if (!tenantCode || !tenantEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantCode, tenantEmail' },
        { status: 400 }
      );
    }

    if (!tenantName || tenantName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Tenant name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Initialize multi-landlord blockchain service
    const blockchainService = new MultiLandlordBlockchainService(
      supabase,
      process.env.BLOCKCHAIN_SECRET_KEY || 'dev-secret-key-change-in-production'
    );

    // Validate tenant code against blockchain
    const validation = await blockchainService.validateTenantCode(tenantCode);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid tenant code',
          message: 'This tenant code is not registered in the blockchain network.'
        },
        { status: 401 }
      );
    }

    // Check if slot is already occupied
    if (validation.tenantSlot?.is_occupied) {
      return NextResponse.json(
        {
          success: false,
          error: 'This tenant slot is already occupied',
          message: 'Please contact your landlord for a new tenant code.'
        },
        { status: 409 }
      );
    }

    // Assign tenant to the slot
    const assignment = await blockchainService.assignTenantToSlot(
      validation.landlordInfo!.landlord_code,
      tenantEmail,
      tenantName
    );

    if (!assignment.success) {
      return NextResponse.json(
        { error: assignment.error || 'Failed to assign tenant slot' },
        { status: 500 }
      );
    }

    // Create or update tenant profile
    let tenantProfile = null;
    const { data: existingTenant } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', tenantEmail)
      .single();

    if (existingTenant) {
      // Update existing tenant profile
      const { data: updatedTenant } = await supabase
        .from('profiles')
        .update({
          full_name: tenantName,
          phone_number: tenantPhone || existingTenant.phone_number,
          landlord_block_id: validation.landlordInfo!.id,
          landlord_code: validation.landlordInfo!.landlord_code,
          blockchain_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTenant.id)
        .select()
        .single();

      tenantProfile = updatedTenant;
    } else {
      // Create new tenant profile
      const { data: newTenant } = await supabase
        .from('profiles')
        .insert({
          email: tenantEmail,
          full_name: tenantName,
          phone_number: tenantPhone,
          role: 'tenant',
          landlord_block_id: validation.landlordInfo!.id,
          landlord_code: validation.landlordInfo!.landlord_code,
          blockchain_verified: true
        })
        .select()
        .single();

      tenantProfile = newTenant;
    }

    // Update tenant slot with lease information if provided
    if (leaseInfo && assignment.tenantSlot) {
      await supabase
        .from('tenant_slots')
        .update({
          tenant_id: tenantProfile?.id,
          lease_start_date: leaseInfo.leaseStartDate,
          lease_end_date: leaseInfo.leaseEndDate,
          monthly_rent: leaseInfo.monthlyRent
        })
        .eq('id', assignment.tenantSlot.id);
    }

    // Generate session token
    const sessionToken = crypto
      .randomBytes(32)
      .toString('hex');

    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session (you might want to create a sessions table)
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        tenant_id: tenantProfile?.id,
        token: sessionToken,
        expires_at: sessionExpiry.toISOString(),
        authenticated_via: 'blockchain_tenant_code',
        tenant_slot_id: assignment.tenantSlot?.id
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }

    // Build comprehensive response
    return NextResponse.json({
      success: true,
      message: 'Tenant authenticated via multi-landlord blockchain',
      session: {
        token: sessionToken,
        expiresAt: sessionExpiry.toISOString(),
        tenant: {
          id: tenantProfile?.id,
          email: tenantProfile?.email,
          fullName: tenantProfile?.full_name,
          phone: tenantProfile?.phone_number,
          blockchainVerified: true
        }
      },
      landlord: {
        id: validation.landlordInfo!.landlord_id,
        name: validation.landlordInfo!.landlord_name,
        email: validation.landlordInfo!.landlord_email,
        code: validation.landlordInfo!.landlord_code,
        propertyCapacity: validation.landlordInfo!.property_capacity,
        propertyUsed: validation.landlordInfo!.property_used,
        availableSlots: validation.landlordInfo!.property_capacity - validation.landlordInfo!.property_used
      },
      tenantSlot: {
        id: assignment.tenantSlot?.id,
        slotNumber: assignment.tenantSlot?.slot_number,
        tenantCode: assignment.tenantSlot?.tenant_code,
        leaseInfo: leaseInfo || null
      },
      blockchainVerification: {
        verified: true,
        via: 'multi_landlord_blockchain',
        blockId: validation.landlordInfo!.id,
        blockHash: validation.landlordInfo!.block_hash,
        message: 'Authentication is secured by multi-landlord blockchain technology'
      }
    });
  } catch (error) {
    console.error('Multi-landlord tenant login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/multi-landlord/tenant-login
 * Health check and documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Multi-Landlord Tenant Login',
    method: 'POST',
    version: '2.0',
    features: [
      'Individual tenant slot validation',
      'Blockchain-secured authentication',
      'Automatic slot assignment',
      'Lease information tracking',
      'Multi-landlord isolation'
    ],
    requiredFields: ['tenantCode', 'tenantEmail', 'tenantName'],
    optionalFields: ['tenantPhone', 'leaseInfo'],
    description: 'Tenant login using individual tenant slot codes from multi-landlord blockchain',
    codeFormat: 'LEA-{LANDLORD_CODE}-TENANT-{SLOT_NUMBER}',
    example: {
      tenantCode: 'LEA-TEST123-ABC-TENANT-5',
      tenantEmail: 'tenant@example.com',
      tenantName: 'John Doe',
      tenantPhone: '+254700123456',
      leaseInfo: {
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        monthlyRent: 50000
      }
    }
  });
}
