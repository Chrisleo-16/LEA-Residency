/**
 * Tenant Login via Blockchain 4-Digit Code
 * Validates code against blockchain and logs in tenant
 * POST /api/blockchain/tenant/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { BlockchainService } from '@/lib/blockchain/service';
import crypto from 'crypto';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      code,
      tenantEmail,
      tenantName
    } = body;

    // Validate input
    if (!code || code.length !== 4 || !/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 4 digits.' },
        { status: 400 }
      );
    }

    if (!tenantEmail) {
      return NextResponse.json(
        { error: 'Tenant email required' },
        { status: 400 }
      );
    }

    // Initialize database
    const db = getDatabase();
    const secretKey = process.env.BLOCKCHAIN_SECRET_KEY || 'dev-secret-key-change-in-production';

    // Initialize blockchain service
    const blockchainService = new BlockchainService(db.getClient(), secretKey);

    // Validate code against blockchain
    const validation = await blockchainService.validateCodeAndGetLandlord(code);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid code',
          message: 'This code is not registered in the blockchain network.'
        },
        { status: 401 }
      );
    }

    // Code is valid - create/update tenant
    let tenant = null;
    
    // Check if tenant exists
    const { data: existingTenant } = await db.getClient()
      .from('tenants')
      .select('*')
      .eq('email', tenantEmail)
      .eq('landlord_id', validation.landlordId)
      .single();

    if (!existingTenant) {
      // Create new tenant
      const { data: newTenant, error: createError } = await db.getClient()
        .from('tenants')
        .insert({
          landlord_id: validation.landlordId,
          email: tenantEmail,
          full_name: tenantName || 'Tenant',
          phone_number: null,
          blockchain_code: code
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create tenant profile' },
          { status: 500 }
        );
      }

      tenant = newTenant;
    } else {
      tenant = existingTenant;
    }

    // Generate session token
    const sessionToken = crypto
      .randomBytes(32)
      .toString('hex');

    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session
    const { error: sessionError } = await db.getClient()
      .from('sessions')
      .insert({
        tenant_id: tenant.id,
        token: sessionToken,
        expires_at: sessionExpiry.toISOString(),
        authenticated_via: 'blockchain_code'
      });

    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Build response
    return NextResponse.json({
      success: true,
      message: 'Authenticated via blockchain code',
      session: {
        token: sessionToken,
        expiresAt: sessionExpiry.toISOString(),
        tenant: {
          id: tenant.id,
          email: tenant.email,
          fullName: tenant.full_name
        },
        landlord: {
          id: validation.landlordId,
          name: validation.landlordName,
          properties: validation.properties
        }
      },
      blockchainVerification: {
        verified: true,
        via: 'blockchain_ledger',
        message: 'This authentication is backed by blockchain verification'
      }
    });
  } catch (error) {
    console.error('Tenant blockchain login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/tenant/login
 * Health check and documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Tenant Blockchain Login',
    method: 'POST',
    requiredFields: ['code', 'tenantEmail'],
    description: 'Tenant login using 4-digit blockchain code',
    codeFormat: '4 digits (e.g., "1234")',
    example: {
      code: '1234',
      tenantEmail: 'tenant@example.com',
      tenantName: 'John Doe'
    }
  });
}
