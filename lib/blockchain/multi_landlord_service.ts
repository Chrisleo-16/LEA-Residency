/**
 * Multi-Landlord Blockchain Service
 * Enhanced blockchain system supporting multiple landlords with individual blocks
 * Each landlord gets their own blockchain block with tenant slot management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface LandlordBlock {
  id: string;
  landlord_id: string;
  block_hash: string;
  previous_block_hash: string | null;
  block_number: bigint;
  landlord_code: string;
  landlord_name: string;
  landlord_email: string;
  property_capacity: number;
  property_used: number;
  block_data: any;
  blockchain_signature: string | null;
  created_at: string;
  is_active: boolean;
}

export interface TenantSlot {
  id: string;
  landlord_block_id: string;
  slot_number: number;
  tenant_code: string;
  is_occupied: boolean;
  tenant_id?: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent?: number;
  created_at: string;
  occupied_at?: string;
  vacated_at?: string;
}

export interface BlockchainTransaction {
  id: string;
  transaction_hash: string;
  block_hash: string;
  transaction_type: string;
  from_entity?: string;
  to_entity?: string;
  transaction_data: any;
  timestamp: string;
  confirmed: boolean;
  confirmations: number;
}

export class MultiLandlordBlockchainService {
  private db: SupabaseClient;
  private secretKey: string;

  constructor(db: SupabaseClient, secretKey: string) {
    this.db = db;
    this.secretKey = secretKey;
  }

  /**
   * Generate a unique landlord code
   * Format: LEA-{NAME(3)}{EMAIL(3)}-{TIMESTAMP}
   */
  private generateLandlordCode(name: string, email: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const nameHash = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const emailHash = email.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    return `LEA-${nameHash}${emailHash}-${timestamp}`;
  }

  /**
   * Generate SHA-256 hash for blockchain integrity
   */
  private generateHash(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Generate unique tenant slot code
   */
  private generateTenantSlotCode(landlordCode: string, slotNumber: number): string {
    return `${landlordCode}-TENANT-${slotNumber}`;
  }

  /**
   * Get the last block hash for chain continuity
   */
  private async getLastBlockHash(): Promise<string | null> {
    const { data } = await this.db
      .from('landlord_blocks')
      .select('block_hash')
      .order('block_number', { ascending: false })
      .limit(1)
      .single();

    return data?.block_hash || null;
  }

  /**
   * Get the next block number
   */
  private async getNextBlockNumber(): Promise<bigint> {
    const { data } = await this.db
      .from('landlord_blocks')
      .select('block_number')
      .order('block_number', { ascending: false })
      .limit(1)
      .single();

    return (data?.block_number || BigInt(0)) + BigInt(1);
  }

  /**
   * Create a blockchain transaction record
   */
  private async createTransaction(
    blockHash: string,
    type: string,
    fromEntity?: string,
    toEntity?: string,
    data?: any
  ): Promise<string> {
    const transactionData = {
      block_hash: blockHash,
      transaction_type: type,
      from_entity: fromEntity,
      to_entity: toEntity,
      transaction_data: data || {},
      timestamp: new Date().toISOString()
    };

    const transactionHash = this.generateHash(transactionData);

    const { error } = await this.db
      .from('blockchain_transactions')
      .insert({
        ...transactionData,
        transaction_hash: transactionHash,
        confirmed: true,
        confirmations: 1
      });

    if (error) throw error;
    return transactionHash;
  }

  /**
   * Register a new landlord with their own blockchain block
   */
  async registerLandlord(
    landlordId: string,
    landlordName: string,
    landlordEmail: string,
    propertyCapacity: number = 0
  ): Promise<{
    success: boolean;
    landlordCode?: string;
    blockId?: string;
    tenantSlots?: TenantSlot[];
    error?: string;
  }> {
    try {
      // Check if landlord already exists
      const { data: existingBlock } = await this.db
        .from('landlord_blocks')
        .select('*')
        .eq('landlord_id', landlordId)
        .single();

      if (existingBlock) {
        return {
          success: true,
          landlordCode: existingBlock.landlord_code,
          blockId: existingBlock.id,
          error: 'Landlord already registered'
        };
      }

      // Generate landlord code
      const landlordCode = this.generateLandlordCode(landlordName, landlordEmail);

      // Get blockchain chain info
      const lastBlockHash = await this.getLastBlockHash();
      const blockNumber = await this.getNextBlockNumber();

      // Create block data
      const blockData = {
        landlord_id: landlordId,
        landlord_name: landlordName,
        landlord_email: landlordEmail,
        property_capacity: propertyCapacity,
        registration_timestamp: new Date().toISOString(),
        version: '2.0',
        type: 'landlord_block'
      };

      // Generate block hash
      const blockHash = this.generateHash({
        previous_hash: lastBlockHash,
        block_number: blockNumber.toString(),
        data: blockData,
        nonce: 0
      });

      // Create landlord block
      const { data: block, error: blockError } = await this.db
        .from('landlord_blocks')
        .insert({
          landlord_id: landlordId,
          block_hash: blockHash,
          previous_block_hash: lastBlockHash,
          block_number: blockNumber,
          landlord_code: landlordCode,
          landlord_name: landlordName,
          landlord_email: landlordEmail,
          property_capacity: propertyCapacity,
          property_used: 0,
          block_data: blockData,
          blockchain_signature: this.generateHash({ blockHash, landlordCode })
        })
        .select()
        .single();

      if (blockError) throw blockError;

      // Create tenant slots
      const tenantSlots: TenantSlot[] = [];
      for (let i = 1; i <= propertyCapacity; i++) {
        const tenantCode = this.generateTenantSlotCode(landlordCode, i);
        
        const { data: slot, error: slotError } = await this.db
          .from('tenant_slots')
          .insert({
            landlord_block_id: block.id,
            slot_number: i,
            tenant_code: tenantCode,
            is_occupied: false
          })
          .select()
          .single();

        if (slotError) throw slotError;
        tenantSlots.push(slot);
      }

      // Create blockchain transaction
      await this.createTransaction(
        blockHash,
        'landlord_register',
        'system',
        landlordId,
        { landlord_code: landlordCode, capacity: propertyCapacity }
      );

      return {
        success: true,
        landlordCode,
        blockId: block.id,
        tenantSlots
      };
    } catch (error) {
      console.error('Landlord registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Assign a tenant to a specific slot in a landlord's block
   */
  async assignTenantToSlot(
    landlordCode: string,
    tenantEmail: string,
    tenantName: string,
    preferredSlotNumber?: number
  ): Promise<{
    success: boolean;
    tenantSlot?: TenantSlot;
    tenantCode?: string;
    error?: string;
  }> {
    try {
      // Find landlord block
      const { data: landlordBlock, error: blockError } = await this.db
        .from('landlord_blocks')
        .select('*')
        .eq('landlord_code', landlordCode)
        .eq('is_active', true)
        .single();

      if (blockError || !landlordBlock) {
        return { success: false, error: 'Invalid landlord code' };
      }

      // Check if there's available capacity
      if (landlordBlock.property_used >= landlordBlock.property_capacity) {
        return { success: false, error: 'No available tenant slots' };
      }

      // Find available slot
      let query = this.db
        .from('tenant_slots')
        .select('*')
        .eq('landlord_block_id', landlordBlock.id)
        .eq('is_occupied', false);

      if (preferredSlotNumber) {
        query = query.eq('slot_number', preferredSlotNumber);
      }

      const { data: availableSlot, error: slotError } = await query
        .order('slot_number', { ascending: true })
        .limit(1)
        .single();

      if (slotError || !availableSlot) {
        return { success: false, error: 'No available slots found' };
      }

      // Update tenant slot
      const { data: updatedSlot, error: updateError } = await this.db
        .from('tenant_slots')
        .update({
          is_occupied: true,
          tenant_email: tenantEmail,
          tenant_name: tenantName,
          occupied_at: new Date().toISOString()
        })
        .eq('id', availableSlot.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create blockchain transaction
      await this.createTransaction(
        landlordBlock.block_hash,
        'tenant_assign',
        landlordBlock.landlord_id,
        tenantEmail,
        { 
          tenant_code: updatedSlot.tenant_code,
          slot_number: updatedSlot.slot_number,
          tenant_email: tenantEmail
        }
      );

      return {
        success: true,
        tenantSlot: updatedSlot,
        tenantCode: updatedSlot.tenant_code
      };
    } catch (error) {
      console.error('Tenant assignment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Assignment failed'
      };
    }
  }

  /**
   * Validate tenant code and return landlord information
   */
  async validateTenantCode(tenantCode: string): Promise<{
    valid: boolean;
    landlordInfo?: LandlordBlock;
    tenantSlot?: TenantSlot;
    error?: string;
  }> {
    try {
      // Find tenant slot
      const { data: tenantSlot, error: slotError } = await this.db
        .from('tenant_slots')
        .select('*')
        .eq('tenant_code', tenantCode)
        .single();

      if (slotError || !tenantSlot) {
        return { valid: false, error: 'Invalid tenant code' };
      }

      // Get landlord block info
      const { data: landlordBlock, error: blockError } = await this.db
        .from('landlord_blocks')
        .select('*')
        .eq('id', tenantSlot.landlord_block_id)
        .eq('is_active', true)
        .single();

      if (blockError || !landlordBlock) {
        return { valid: false, error: 'Landlord block not found' };
      }

      return {
        valid: true,
        landlordInfo: landlordBlock,
        tenantSlot
      };
    } catch (error) {
      console.error('Code validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get landlord's blockchain information
   */
  async getLandlordBlockchain(landlordId: string): Promise<{
    success: boolean;
    block?: LandlordBlock;
    tenantSlots?: TenantSlot[];
    transactions?: BlockchainTransaction[];
    error?: string;
  }> {
    try {
      // Get landlord block
      const { data: block, error: blockError } = await this.db
        .from('landlord_blocks')
        .select('*')
        .eq('landlord_id', landlordId)
        .single();

      if (blockError || !block) {
        return { success: false, error: 'Landlord block not found' };
      }

      // Get tenant slots
      const { data: tenantSlots } = await this.db
        .from('tenant_slots')
        .select('*')
        .eq('landlord_block_id', block.id)
        .order('slot_number', { ascending: true });

      // Get transactions
      const { data: transactions } = await this.db
        .from('blockchain_transactions')
        .select('*')
        .eq('block_hash', block.block_hash)
        .order('timestamp', { ascending: false });

      return {
        success: true,
        block,
        tenantSlots: tenantSlots || [],
        transactions: transactions || []
      };
    } catch (error) {
      console.error('Get blockchain error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get blockchain'
      };
    }
  }

  /**
   * Vacate a tenant slot
   */
  async vacateTenantSlot(tenantCode: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Find and update tenant slot
      const { data: slot, error: slotError } = await this.db
        .from('tenant_slots')
        .update({
          is_occupied: false,
          tenant_id: null,
          tenant_name: null,
          tenant_email: null,
          tenant_phone: null,
          lease_start_date: null,
          lease_end_date: null,
          monthly_rent: null,
          vacated_at: new Date().toISOString()
        })
        .eq('tenant_code', tenantCode)
        .eq('is_occupied', true)
        .select()
        .single();

      if (slotError || !slot) {
        return { success: false, error: 'Tenant slot not found or already vacant' };
      }

      // Get landlord block for transaction
      const { data: landlordBlock } = await this.db
        .from('landlord_blocks')
        .select('block_hash, landlord_id')
        .eq('id', slot.landlord_block_id)
        .single();

      // Create blockchain transaction
      if (landlordBlock) {
        await this.createTransaction(
          landlordBlock.block_hash,
          'tenant_vacate',
          slot.tenant_email || 'unknown',
          landlordBlock.landlord_id,
          { tenant_code: tenantCode, slot_number: slot.slot_number }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Vacate slot error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to vacate slot'
      };
    }
  }

  /**
   * Update landlord property capacity
   */
  async updatePropertyCapacity(
    landlordId: string,
    newCapacity: number
  ): Promise<{
    success: boolean;
    addedSlots?: TenantSlot[];
    error?: string;
  }> {
    try {
      // Get current landlord block
      const { data: block, error: blockError } = await this.db
        .from('landlord_blocks')
        .select('*')
        .eq('landlord_id', landlordId)
        .single();

      if (blockError || !block) {
        return { success: false, error: 'Landlord block not found' };
      }

      if (newCapacity < block.property_used) {
        return { success: false, error: 'Cannot reduce capacity below occupied slots' };
      }

      const slotsToAdd = newCapacity - block.property_capacity;
      const addedSlots: TenantSlot[] = [];

      // Add new slots
      for (let i = block.property_capacity + 1; i <= newCapacity; i++) {
        const tenantCode = this.generateTenantSlotCode(block.landlord_code, i);
        
        const { data: slot, error: slotError } = await this.db
          .from('tenant_slots')
          .insert({
            landlord_block_id: block.id,
            slot_number: i,
            tenant_code: tenantCode,
            is_occupied: false
          })
          .select()
          .single();

        if (slotError) throw slotError;
        addedSlots.push(slot);
      }

      // Create blockchain transaction
      await this.createTransaction(
        block.block_hash,
        'capacity_update',
        'system',
        landlordId,
        { old_capacity: block.property_capacity, new_capacity: newCapacity }
      );

      return { success: true, addedSlots };
    } catch (error) {
      console.error('Update capacity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update capacity'
      };
    }
  }
}
