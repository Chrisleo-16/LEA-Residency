/**
 * Consolidated Blockchain API
 * Handles all blockchain operations: blocks, slots, tenants, transactions, verification
 * POST /api/blockchain - for create/update operations
 * GET /api/blockchain - for read/verify operations
 */

import { createClient} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  createLandlordBlock,
  assignTenantToSlot,
  vacateTenantFromSlot,
  createTenantSlots,
  getLandlordBlock,
  getBlockSlots,
  getBlockTransactionHistory,
  verifyBlockchainIntegrity,
} from "@/lib/blockchain/blockchainService";

// ============================================================================
// MIDDLEWARE: Authentication Check
// ============================================================================

async function authenticateRequest(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: "Unauthorized" };
  }

  return { user, error: null };
}

// ============================================================================
// POST - Create/Write Operations
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { action, payload } = await request.json();

    switch (action) {
      // LANDLORD OPERATIONS
      case "create_landlord_block": {
        const {
          landlord_code,
          landlord_name,
          landlord_email,
          property_capacity,
        } = payload;

        if (!landlord_code || !landlord_name || !landlord_email) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const { block, error } = await createLandlordBlock(
          user!.id,
          landlord_code,
          landlord_name,
          landlord_email,
          property_capacity || 0
        );

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          {
            success: true,
            block,
            message: "Landlord block created successfully",
          },
          { status: 201 }
        );
      }

      // PROPERTY OPERATIONS
      case "create_tenant_slots": {
        const { landlord_block_id, property_id, slot_count, starting_slot_number } = payload;

        if (!landlord_block_id || !property_id) {
          return NextResponse.json(
            { error: "Missing landlord_block_id or property_id" },
            { status: 400 }
          );
        }

        const { slots, error } = await createTenantSlots(
          landlord_block_id,
          property_id,
          slot_count || 1,
          starting_slot_number || 1
        );

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          {
            success: true,
            slots,
            count: slots.length,
            message: "Tenant slots created successfully",
          },
          { status: 201 }
        );
      }

      // TENANT OPERATIONS
      case "assign_tenant": {
        const {
          slot_id,
          tenant_id,
          tenant_name,
          tenant_email,
          tenant_phone,
          lease_start_date,
          lease_end_date,
          monthly_rent,
        } = payload;

        if (!slot_id || !tenant_id) {
          return NextResponse.json(
            { error: "Missing slot_id or tenant_id" },
            { status: 400 }
          );
        }

        const { slot, error } = await assignTenantToSlot(
          slot_id,
          tenant_id,
          tenant_name,
          tenant_email,
          tenant_phone,
          lease_start_date,
          lease_end_date,
          monthly_rent
        );

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          { success: true, slot, message: "Tenant assigned successfully" },
          { status: 200 }
        );
      }

      case "vacate_tenant": {
        const { slot_id, reason } = payload;

        if (!slot_id) {
          return NextResponse.json(
            { error: "Missing slot_id" },
            { status: 400 }
          );
        }

        const { slot, error } = await vacateTenantFromSlot(slot_id, reason);

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          { success: true, slot, message: "Tenant vacated successfully" },
          { status: 200 }
        );
      }
      
      // BLOCKCHAIN OPERATIONS
      case "verify_blockchain": {
        const { landlord_block_id } = payload;

        if (!landlord_block_id) {
          return NextResponse.json(
            { error: "Missing landlord_block_id" },
            { status: 400 }
          );
        }

        const { isValid, error, details } = await verifyBlockchainIntegrity(
          landlord_block_id
        );

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          {
            success: true,
            isValid,
            details,
            message: isValid
              ? "Blockchain integrity verified"
              : "Blockchain integrity check failed",
          },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Blockchain API error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Read/Query Operations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    switch (action) {
      // BLOCK OPERATIONS
      case "get_block": {
        const blockId = searchParams.get("block_id");

        if (!blockId) {
          return NextResponse.json(
            { error: "Missing block_id parameter" },
            { status: 400 }
          );
        }

        const { block, error } = await getLandlordBlock(blockId);

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          { success: true, block },
          { status: 200 }
        );
      }

      // SLOT OPERATIONS
      case "get_slots": {
        const blockId = searchParams.get("block_id");
        const occupiedOnly = searchParams.get("occupied_only") === "true";

        if (!blockId) {
          return NextResponse.json(
            { error: "Missing block_id parameter" },
            { status: 400 }
          );
        }

        const { slots, error } = await getBlockSlots(blockId, occupiedOnly);

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          { success: true, slots, count: slots.length },
          { status: 200 }
        );
      }

      // TRANSACTION OPERATIONS
      case "get_transactions": {
        const blockHash = searchParams.get("block_hash");
        const limit = parseInt(searchParams.get("limit") || "50");

        if (!blockHash) {
          return NextResponse.json(
            { error: "Missing block_hash parameter" },
            { status: 400 }
          );
        }

        const { transactions, error } = await getBlockTransactionHistory(
          blockHash,
          limit
        );

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          { success: true, transactions, count: transactions.length },
          { status: 200 }
        );
      }

      // VERIFICATION OPERATIONS
      case "verify": {
        const blockId = searchParams.get("block_id");

        if (!blockId) {
          return NextResponse.json(
            { error: "Missing block_id parameter" },
            { status: 400 }
          );
        }

        const { isValid, error, details } = await verifyBlockchainIntegrity(blockId);

        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json(
          {
            success: true,
            isValid,
            details,
            chainValid: isValid,
            message: isValid
              ? "Blockchain integrity verified successfully"
              : "Blockchain integrity check failed",
          },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Blockchain API error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
