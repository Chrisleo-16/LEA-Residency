/**
 * Blockchain Service
 * Manages landlord registration, 4-digit code generation, and verification
 * Central hub for all blockchain operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  BlockchainRecord,
  generate4DigitCode,
  createBlockchainRecord,
  verifyBlockRecord,
  buildBlockchainChain,
  generateLandlordBlockchainCertificate
} from './ledger';

export class BlockchainService {
  private db: SupabaseClient;
  private secretKey: string;
  private lastBlock: BlockchainRecord | null = null;

  constructor(db: SupabaseClient, secretKey: string) {
    this.db = db;
    this.secretKey = secretKey;
  }

  /**
   * Register a new landlord on the blockchain
   * Generates their 4-digit code and stores it immutably
   */
  async registerLandlord(
    landlordId: string,
    landlordName: string,
    landlordEmail: string,
    propertyCount: number = 0
  ): Promise<{
    success: boolean;
    code?: string;
    blockId?: string;
    certificate?: any;
    error?: string;
  }> {
    try {
      // Get the last block hash
      const lastBlockHash = await this.getLastBlockHash();

      // Create blockchain record
      const record = createBlockchainRecord(
        landlordId,
        landlordName,
        landlordEmail,
        propertyCount,
        lastBlockHash,
        this.secretKey
      );

      // Verify the record is valid
      if (!verifyBlockRecord(record, this.secretKey)) {
        return {
          success: false,
          error: 'Blockchain record verification failed'
        };
      }

      // Get chain position
      const chainPosition = await this.getChainLength();

      // Get current chain hash
      const chainHash = await this.calculateChainHash();

      // Store in database
      const { data, error } = await this.db
        .from('blockchain_ledger')
        .insert({
          block_id: record.blockId,
          timestamp: record.timestamp,
          landlord_id: landlordId,
          code_hash: record.codeHash,
          public_key: record.publicKey,
          signature: record.signature,
          previous_block_hash: record.previousBlockHash,
          nonce: record.nonce,
          is_verified: true,
          verification_timestamp: new Date().toISOString(),
          chain_position: chainPosition,
          chain_hash: chainHash
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }

      // Generate 4-digit code
      const { code } = generate4DigitCode(landlordId, landlordEmail, record.timestamp);

      // Store code mapping
      const { error: codeError } = await this.db.from('landlord_codes').insert({
        landlord_id: landlordId,
        code,
        code_hash: record.codeHash,
        block_id: record.blockId,
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });

      if (codeError) {
        return {
          success: false,
          error: `Code storage error: ${codeError.message}`
        };
      }

      // Generate certificate for landlord
      const certificate = generateLandlordBlockchainCertificate(code, record);

      this.lastBlock = record;

      return {
        success: true,
        code,
        blockId: record.blockId,
        certificate
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate a 4-digit code and return the landlord ID
   * This is what tenants use to log in
   */
  async validateCodeAndGetLandlord(code: string): Promise<{
    valid: boolean;
    landlordId?: string;
    landlordName?: string;
    properties?: any[];
    error?: string;
  }> {
    try {
      // Look up code in database
      const { data: codeRecord, error: codeError } = await this.db
        .from('landlord_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (codeError || !codeRecord) {
        // Log failed validation attempt
        await this.logCodeValidationAttempt(code, false, 'Code not found or inactive');
        return {
          valid: false,
          error: 'Invalid code'
        };
      }

      // Get the blockchain record
      const { data: blockRecord, error: blockError } = await this.db
        .from('blockchain_ledger')
        .select('*')
        .eq('block_id', codeRecord.block_id)
        .single();

      if (blockError || !blockRecord) {
        return {
          valid: false,
          error: 'Blockchain record not found'
        };
      }

      // Verify block integrity
      const blockData: BlockchainRecord = {
        blockId: blockRecord.block_id,
        timestamp: blockRecord.timestamp,
        landlordId: blockRecord.landlord_id,
        landlordName: '', // Will fetch from landlords table
        landlordEmail: '',
        propertyCount: 0,
        codeHash: blockRecord.code_hash,
        publicKey: blockRecord.public_key,
        signature: blockRecord.signature,
        previousBlockHash: blockRecord.previous_block_hash,
        nonce: blockRecord.nonce
      };

      if (!verifyBlockRecord(blockData, this.secretKey)) {
        await this.logCodeValidationAttempt(code, false, 'Blockchain verification failed');
        return {
          valid: false,
          error: 'Blockchain verification failed - code may be forged'
        };
      }

      // Get landlord details
      const { data: landlord, error: landlordError } = await this.db
        .from('landlords')
        .select('*')
        .eq('id', blockRecord.landlord_id)
        .single();

      if (landlordError || !landlord) {
        return {
          valid: false,
          error: 'Landlord not found'
        };
      }

      // Get properties
      const { data: properties } = await this.db
        .from('properties')
        .select('*')
        .eq('landlord_id', landlord.id);

      // Log successful validation
      await this.logCodeValidationAttempt(code, true, 'Success');

      return {
        valid: true,
        landlordId: landlord.id,
        landlordName: landlord.name,
        properties: properties || []
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  /**
   * Verify the entire blockchain chain integrity
   * Called periodically to detect tampering
   */
  async verifyChainIntegrity(): Promise<{
    isValid: boolean;
    chainLength: number;
    invalidBlocks: string[];
    error?: string;
  }> {
    try {
      const { data: allRecords, error } = await this.db
        .from('blockchain_ledger')
        .select('*')
        .order('chain_position', { ascending: true });

      if (error || !allRecords) {
        return {
          isValid: false,
          chainLength: 0,
          invalidBlocks: [],
          error: error?.message
        };
      }

      const blockRecords: BlockchainRecord[] = allRecords.map(r => ({
        blockId: r.block_id,
        timestamp: r.timestamp,
        landlordId: r.landlord_id,
        landlordName: '',
        landlordEmail: '',
        propertyCount: 0,
        codeHash: r.code_hash,
        publicKey: r.public_key,
        signature: r.signature,
        previousBlockHash: r.previous_block_hash,
        nonce: r.nonce
      }));

      // Build and verify chain
      const chain = buildBlockchainChain(blockRecords);

      // Log verification result
      await this.db.from('blockchain_verification_log').insert({
        block_id: 'chain_verification',
        verification_type: 'chain_validation',
        is_valid: chain.isValid,
        verified_by_system: 'chain_audit_system'
      });

      const invalidBlocks: string[] = [];
      for (const record of blockRecords) {
        if (!verifyBlockRecord(record, this.secretKey)) {
          invalidBlocks.push(record.blockId);
        }
      }

      return {
        isValid: chain.isValid && invalidBlocks.length === 0,
        chainLength: blockRecords.length,
        invalidBlocks
      };
    } catch (error) {
      return {
        isValid: false,
        chainLength: 0,
        invalidBlocks: [],
        error: error instanceof Error ? error.message : 'Verification error'
      };
    }
  }

  /**
   * Get blockchain statistics
   */
  async getBlockchainStats(): Promise<{
    totalLandlords: number;
    totalBlocks: number;
    chainIsValid: boolean;
    lastBlockTimestamp?: number;
  }> {
    try {
      const { data: records } = await this.db
        .from('blockchain_ledger')
        .select('*', { count: 'exact' });

      const { data: codes } = await this.db
        .from('landlord_codes')
        .select('*', { count: 'exact' });

      const integrity = await this.verifyChainIntegrity();

      return {
        totalLandlords: codes?.length || 0,
        totalBlocks: records?.length || 0,
        chainIsValid: integrity.isValid,
        lastBlockTimestamp: records?.[records.length - 1]?.timestamp
      };
    } catch (error) {
      return {
        totalLandlords: 0,
        totalBlocks: 0,
        chainIsValid: false
      };
    }
  }

  /**
   * Private helper: Get last block hash
   */
  private async getLastBlockHash(): Promise<string> {
    if (this.lastBlock) {
      return this.lastBlock.blockId;
    }

    const { data: lastRecord } = await this.db
      .from('blockchain_ledger')
      .select('*')
      .order('chain_position', { ascending: false })
      .limit(1)
      .single();

    return lastRecord?.block_id || '';
  }

  /**
   * Private helper: Get chain length
   */
  private async getChainLength(): Promise<number> {
    const { data } = await this.db
      .from('blockchain_ledger')
      .select('*', { count: 'exact' });

    return data?.length || 0;
  }

  /**
   * Private helper: Calculate current chain hash
   */
  private async calculateChainHash(): Promise<string> {
    const { data: records } = await this.db
      .from('blockchain_ledger')
      .select('*')
      .order('chain_position', { ascending: true });

    if (!records || records.length === 0) {
      return 'genesis';
    }

    // Create cumulative hash
    let chainHash = 'genesis';
    for (const record of records) {
      chainHash = require('crypto')
        .createHash('sha256')
        .update(chainHash + JSON.stringify(record))
        .digest('hex');
    }

    return chainHash;
  }

  /**
   * Private helper: Log code validation attempts for audit trail
   */
  private async logCodeValidationAttempt(
    code: string,
    success: boolean,
    details: string
  ): Promise<void> {
    try {
      // Get landlord ID from code
      const { data: codeRecord } = await this.db
        .from('landlord_codes')
        .select('landlord_id')
        .eq('code', code)
        .single();

      await this.db.from('tenant_code_logins').insert({
        code_used: code,
        landlord_id: codeRecord?.landlord_id || null,
        login_success: success,
        ip_address: '0.0.0.0',
        user_agent: 'blockchain_auth'
      });
    } catch (error) {
      console.warn('Failed to log code validation attempt:', error);
    }
  }
}
