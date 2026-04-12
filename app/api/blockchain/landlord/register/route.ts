/**
 * Landlord Registration API - Blockchain Edition
 * Registers landlords on the blockchain, generates 4-digit code
 * POST /api/blockchain/landlord/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { BlockchainService } from '@/lib/blockchain/service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      landlordId,
      landlordName,
      landlordEmail,
      propertyCount = 0
    } = body;

    // Validate input
    if (!landlordId || !landlordName || !landlordEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: landlordId, landlordName, landlordEmail' },
        { status: 400 }
      );
    }

    // Initialize database
    const db = getDatabase();
    const secretKey = process.env.BLOCKCHAIN_SECRET_KEY || 'dev-secret-key-change-in-production';

    // Initialize blockchain service
    const blockchainService = new BlockchainService(db.getClient(), secretKey);

    // Register on blockchain
    const result = await blockchainService.registerLandlord(
      landlordId,
      landlordName,
      landlordEmail,
      propertyCount
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return 4-digit code and certificate
    return NextResponse.json({
      success: true,
      message: 'Landlord registered on blockchain successfully',
      code: result.code,
      blockId: result.blockId,
      certificate: result.certificate,
      instructions: {
        title: 'Your Blockchain Authentication Code',
        description: 'Share this 4-digit code with your tenants so they can access the system',
        code: result.code,
        blockchainId: result.blockId,
        securityNote: 'This code is backed by blockchain technology. Tenants can only use valid codes registered to you.'
      }
    });
  } catch (error) {
    console.error('Landlord registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/landlord/register
 * Health check
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Landlord Blockchain Registration',
    method: 'POST',
    requiredFields: ['landlordId', 'landlordName', 'landlordEmail'],
    description: 'Register a landlord on blockchain and generate 4-digit code'
  });
}
