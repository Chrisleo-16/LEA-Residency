/**
 * Multi-Landlord Blockchain Registration API
 * Registers landlords with their own blockchain blocks and tenant slots
 * POST /api/blockchain/multi-landlord/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MultiLandlordBlockchainService } from '@/lib/blockchain/multi_landlord_service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      landlordId,
      landlordName,
      landlordEmail,
      propertyCapacity = 0,
      propertyName,
      propertyAddress
    } = body;

    // Validate input
    if (!landlordId || !landlordName || !landlordEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: landlordId, landlordName, landlordEmail' },
        { status: 400 }
      );
    }

    if (propertyCapacity < 0 || propertyCapacity > 1000) {
      return NextResponse.json(
        { error: 'Property capacity must be between 0 and 1000' },
        { status: 400 }
      );
    }

    // Initialize multi-landlord blockchain service
    const blockchainService = new MultiLandlordBlockchainService(
      supabase,
      process.env.BLOCKCHAIN_SECRET_KEY || 'dev-secret-key-change-in-production'
    );

    // Register landlord on blockchain
    const result = await blockchainService.registerLandlord(
      landlordId,
      landlordName,
      landlordEmail,
      propertyCapacity
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Create property record if provided
    let propertyRecord = null;
    if (propertyName && propertyAddress && result.blockId) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          landlord_block_id: result.blockId,
          property_name: propertyName,
          property_address: propertyAddress,
          total_units: propertyCapacity,
          available_units: propertyCapacity,
          blockchain_hash: result.landlordCode
        })
        .select()
        .single();

      if (!propertyError) {
        propertyRecord = property;
      }
    }

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      message: 'Landlord registered on blockchain successfully',
      landlordCode: result.landlordCode,
      blockId: result.blockId,
      tenantSlots: result.tenantSlots,
      property: propertyRecord,
      blockchainInfo: {
        totalSlots: propertyCapacity,
        availableSlots: propertyCapacity,
        usedSlots: 0,
        landlordCode: result.landlordCode,
        blockType: 'multi-landlord-blockchain'
      },
      instructions: {
        title: 'Your Multi-Landlord Blockchain Code',
        description: 'Each tenant slot has a unique code. Share individual slot codes with tenants.',
        landlordCode: result.landlordCode,
        tenantSlots: result.tenantSlots?.map((slot, index) => ({
          slotNumber: slot.slot_number,
          tenantCode: slot.tenant_code,
          status: 'available'
        })) || [],
        securityNote: 'This system uses blockchain technology to ensure secure tenant management.'
      }
    });
  } catch (error) {
    console.error('Multi-landlord registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/multi-landlord/register
 * Health check and documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Multi-Landlord Blockchain Registration',
    method: 'POST',
    version: '2.0',
    features: [
      'Individual blockchain blocks per landlord',
      'Automatic tenant slot generation',
      'Blockchain-secured tenant codes',
      'Real-time capacity management',
      'Multi-landlord isolation'
    ],
    requiredFields: ['landlordId', 'landlordName', 'landlordEmail'],
    optionalFields: ['propertyCapacity', 'propertyName', 'propertyAddress'],
    description: 'Register a landlord with their own blockchain block and tenant slots',
    example: {
      landlordId: 'uuid-landlord-id',
      landlordName: 'John Doe',
      landlordEmail: 'john@landlord.com',
      propertyCapacity: 12,
      propertyName: 'Sunset Apartments',
      propertyAddress: '123 Main St, Nairobi, Kenya'
    }
  });
}
