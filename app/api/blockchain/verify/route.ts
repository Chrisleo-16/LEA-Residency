/**
 * Blockchain Chain Verification API
 * Verifies the integrity of the entire blockchain chain
 * GET /api/blockchain/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { BlockchainService } from '@/lib/blockchain/service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    const db = getDatabase();
    const secretKey = process.env.BLOCKCHAIN_SECRET_KEY || 'dev-secret-key-change-in-production';

    // Initialize blockchain service
    const blockchainService = new BlockchainService(db.getClient(), secretKey);

    // Verify chain integrity
    const verification = await blockchainService.verifyChainIntegrity();

    // Get statistics
    const stats = await blockchainService.getBlockchainStats();

    return NextResponse.json({
      status: 'ok',
      blockchain: {
        chainValid: verification.isValid,
        chainLength: verification.chainLength,
        invalidBlocks: verification.invalidBlocks,
        totalLandlords: stats.totalLandlords,
        totalBlocks: stats.totalBlocks,
        lastBlockTimestamp: stats.lastBlockTimestamp ? new Date(stats.lastBlockTimestamp).toISOString() : null
      },
      verification: {
        timestamp: new Date().toISOString(),
        message: verification.isValid
          ? 'Blockchain chain integrity verified. All blocks are valid.'
          : `Chain integrity check failed. ${verification.invalidBlocks.length} invalid blocks detected.`
      }
    });
  } catch (error) {
    console.error('Chain verification error:', error);
    return NextResponse.json(
      {
        error: 'Chain verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blockchain/verify
 * Force a chain verification audit
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const db = getDatabase();
    const secretKey = process.env.BLOCKCHAIN_SECRET_KEY || 'dev-secret-key-change-in-production';

    const blockchainService = new BlockchainService(db.getClient(), secretKey);

    // Run comprehensive verification
    const verification = await blockchainService.verifyChainIntegrity();
    const stats = await blockchainService.getBlockchainStats();

    // Alert if issues found
    if (!verification.isValid) {
      console.error('BLOCKCHAIN INTEGRITY ALERT:', {
        invalidBlocks: verification.invalidBlocks,
        chainLength: verification.chainLength
      });
    }

    return NextResponse.json({
      auditCompleted: true,
      timestamp: new Date().toISOString(),
      results: {
        chainValid: verification.isValid,
        invalidBlocks: verification.invalidBlocks,
        totalBlocks: stats.totalBlocks,
        totalLandlords: stats.totalLandlords
      },
      action: verification.isValid ? 'No action required' : 'ALERT: Chain tampering detected!'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Audit failed' },
      { status: 500 }
    );
  }
}
