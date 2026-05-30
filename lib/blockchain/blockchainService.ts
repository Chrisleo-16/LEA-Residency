import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface LandlordBlock {
  id: string;
  landlord_id: string;
  block_hash: string;
  previous_block_hash: string | null;
  block_number: number;
  landlord_code: string;
  landlord_name: string;
  landlord_email: string;
  property_capacity: number;
  property_used: number;
  block_data: Record<string, any>;
  blockchain_signature: string | null;
  created_at: string;
  nonce: number;
  is_active: boolean;
}

export interface TenantSlot {
  id: string;
  landlord_block_id: string;
  property_id: string | null;
  slot_number: number;
  tenant_code: string;
  is_occupied: boolean;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  monthly_rent: number | null;
  created_at: string;
  occupied_at: string | null;
  vacated_at: string | null;
}

export interface BlockchainTransaction {
  id: string;
  transaction_hash: string;
  block_hash: string;
  transaction_type: string;
  from_entity: string | null;
  to_entity: string | null;
  transaction_data: Record<string, any>;
  timestamp: string;
  confirmed: boolean;
  confirmations: number;
}

/**
 * Generate a SHA-256 hash for blockchain operations
 */
export function generateHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Create a new landlord blockchain block
 */
export async function createLandlordBlock(
  landlordId: string,
  landlordCode: string,
  landlordName: string,
  landlordEmail: string,
  propertyCapacity: number = 0
): Promise<{ block: LandlordBlock; error: string | null }> {
  try {
    // Generate unique hash
    const blockData = {
      landlord_id: landlordId,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    const blockHash = generateHash(JSON.stringify(blockData));

    // Get the previous block to link
    const { data: lastBlock } = await supabase
      .from("landlord_blocks")
      .select("*")
      .eq("landlord_id", landlordId)
      .order("block_number", { ascending: false })
      .limit(1);

    const previousBlockHash = lastBlock && lastBlock.length > 0 ? lastBlock[0].block_hash : null;
    const blockNumber = lastBlock && lastBlock.length > 0 ? lastBlock[0].block_number + 1 : 1;

    const { data, error } = await supabase
      .from("landlord_blocks")
      .insert({
        landlord_id: landlordId,
        block_hash: blockHash,
        previous_block_hash: previousBlockHash,
        block_number: blockNumber,
        landlord_code: landlordCode,
        landlord_name: landlordName,
        landlord_email: landlordEmail,
        property_capacity: propertyCapacity,
        property_used: 0,
        block_data: blockData,
        nonce: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Record transaction
    await recordTransaction({
      transaction_type: "block_creation",
      from_entity: landlordId,
      to_entity: "system",
      block_hash: blockHash,
      transaction_data: { landlordCode, landlordName },
    });

    return { block: data as LandlordBlock, error: null };
  } catch (error) {
    return { block: null as any, error: (error as Error).message };
  }
}

/**
 * Assign a tenant to a slot
 */
export async function assignTenantToSlot(
  slotId: string,
  tenantId: string,
  tenantName: string,
  tenantEmail: string,
  tenantPhone: string,
  leaseStartDate: string,
  leaseEndDate: string,
  monthlyRent: number
): Promise<{ slot: TenantSlot | null; error: string | null }> {
  try {
    // Get slot details
    const { data: slot, error: slotError } = await supabase
      .from("tenant_slots")
      .select("*")
      .eq("id", slotId)
      .single();

    if (slotError) throw slotError;

    // Update slot
    const { data: updatedSlot, error: updateError } = await supabase
      .from("tenant_slots")
      .update({
        tenant_id: tenantId,
        tenant_name: tenantName,
        tenant_email: tenantEmail,
        tenant_phone: tenantPhone,
        lease_start_date: leaseStartDate,
        lease_end_date: leaseEndDate,
        monthly_rent: monthlyRent,
        is_occupied: true,
        occupied_at: new Date().toISOString(),
      })
      .eq("id", slotId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record transaction
    const { data: block } = await supabase
      .from("landlord_blocks")
      .select("block_hash")
      .eq("id", slot.landlord_block_id)
      .single();

    await recordTransaction({
      transaction_type: "tenant_assign",
      from_entity: slot.landlord_block_id,
      to_entity: tenantId,
      block_hash: block?.block_hash,
      transaction_data: {
        slot_id: slotId,
        tenant_name: tenantName,
        monthly_rent: monthlyRent,
      },
    });

    return { slot: updatedSlot as TenantSlot, error: null };
  } catch (error) {
    return { slot: null, error: (error as Error).message };
  }
}

/**
 * Vacate a tenant from a slot
 */
export async function vacateTenantFromSlot(
  slotId: string,
  reason: string = ""
): Promise<{ slot: TenantSlot | null; error: string | null }> {
  try {
    // Get slot details
    const { data: slot, error: slotError } = await supabase
      .from("tenant_slots")
      .select("*")
      .eq("id", slotId)
      .single();

    if (slotError) throw slotError;

    // Update slot
    const { data: updatedSlot, error: updateError } = await supabase
      .from("tenant_slots")
      .update({
        is_occupied: false,
        vacated_at: new Date().toISOString(),
        tenant_id: null,
      })
      .eq("id", slotId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record transaction
    const { data: block } = await supabase
      .from("landlord_blocks")
      .select("block_hash")
      .eq("id", slot.landlord_block_id)
      .single();

    await recordTransaction({
      transaction_type: "tenant_vacate",
      from_entity: slot.tenant_id,
      to_entity: slot.landlord_block_id,
      block_hash: block?.block_hash,
      transaction_data: {
        slot_id: slotId,
        reason: reason,
        vacated_by: slot.tenant_name,
      },
    });

    return { slot: updatedSlot as TenantSlot, error: null };
  } catch (error) {
    return { slot: null, error: (error as Error).message };
  }
}

/**
 * Create tenant slots for a landlord block
 */
export async function createTenantSlots(
  landlordBlockId: string,
  propertyId: string,
  slotCount: number,
  startingSlotNumber: number = 1
): Promise<{ slots: TenantSlot[]; error: string | null }> {
  try {
    const slots = [];

    for (let i = 0; i < slotCount; i++) {
      const slotNumber = startingSlotNumber + i;
      const tenantCode = `LEA-TENANT-${landlordBlockId.substring(0, 8).toUpperCase()}-${slotNumber}`;

      slots.push({
        landlord_block_id: landlordBlockId,
        property_id: propertyId,
        slot_number: slotNumber,
        tenant_code: tenantCode,
        is_occupied: false,
      });
    }

    const { data, error } = await supabase
      .from("tenant_slots")
      .insert(slots)
      .select();

    if (error) throw error;

    return { slots: data as TenantSlot[], error: null };
  } catch (error) {
    return { slots: [], error: (error as Error).message };
  }
}

/**
 * Record a blockchain transaction
 */
export async function recordTransaction(
  transactionData: Partial<BlockchainTransaction>
): Promise<{ transaction: BlockchainTransaction | null; error: string | null }> {
  try {
    // Generate unique hash
    const txHash = generateHash(
      JSON.stringify({
        ...transactionData,
        timestamp: new Date().toISOString(),
      })
    );

    const { data, error } = await supabase
      .from("blockchain_transactions")
      .insert({
        transaction_hash: txHash,
        transaction_type: transactionData.transaction_type || "unknown",
        from_entity: transactionData.from_entity,
        to_entity: transactionData.to_entity,
        block_hash: transactionData.block_hash,
        transaction_data: transactionData.transaction_data || {},
        confirmed: false,
        confirmations: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return { transaction: data as BlockchainTransaction, error: null };
  } catch (error) {
    return { transaction: null, error: (error as Error).message };
  }
}

/**
 * Get landlord block with metrics
 */
export async function getLandlordBlock(
  blockId: string
): Promise<{ block: LandlordBlock | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("landlord_blocks")
      .select("*")
      .eq("id", blockId)
      .single();

    if (error) throw error;

    return { block: data as LandlordBlock, error: null };
  } catch (error) {
    return { block: null, error: (error as Error).message };
  }
}

/**
 * Get all tenant slots for a block
 */
export async function getBlockSlots(
  landlordBlockId: string,
  occupiedOnly: boolean = false
): Promise<{ slots: TenantSlot[]; error: string | null }> {
  try {
    let query = supabase
      .from("tenant_slots")
      .select("*")
      .eq("landlord_block_id", landlordBlockId);

    if (occupiedOnly) {
      query = query.eq("is_occupied", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { slots: data as TenantSlot[], error: null };
  } catch (error) {
    return { slots: [], error: (error as Error).message };
  }
}

/**
 * Get transaction history for a block
 */
export async function getBlockTransactionHistory(
  blockHash: string,
  limit: number = 50
): Promise<{ transactions: BlockchainTransaction[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("blockchain_transactions")
      .select("*")
      .eq("block_hash", blockHash)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { transactions: data as BlockchainTransaction[], error: null };
  } catch (error) {
    return { transactions: [], error: (error as Error).message };
  }
}

/**
 * Verify blockchain integrity
 */
export async function verifyBlockchainIntegrity(
  landlordBlockId: string
): Promise<{ isValid: boolean; error: string | null; details: any }> {
  try {
    const { data: blocks, error: blocksError } = await supabase
      .from("landlord_blocks")
      .select("*")
      .eq("landlord_id", landlordBlockId)
      .order("block_number", { ascending: true });

    if (blocksError) throw blocksError;

    const details = {
      totalBlocks: blocks.length,
      validBlocks: 0,
      chainValid: true,
      issues: [] as string[],
    };

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const prevBlock = i > 0 ? blocks[i - 1] : null;

      // Check if previous hash matches
      if (prevBlock && block.previous_block_hash !== prevBlock.block_hash) {
        details.chainValid = false;
        details.issues.push(
          `Block ${i + 1}: Previous hash mismatch`
        );
      } else {
        details.validBlocks++;
      }
    }

    return { isValid: details.chainValid, error: null, details };
  } catch (error) {
    return { isValid: false, error: (error as Error).message, details: null };
  }
}
