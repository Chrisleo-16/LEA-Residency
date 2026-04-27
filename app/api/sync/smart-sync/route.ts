import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // 1. Check environment variables first (Common cause of 500)
    if (!process.env.PAYHERO_USERNAME || !process.env.PAYHERO_PASSWORD) {
      return NextResponse.json({ 
        error: "Missing PayHero credentials in environment variables",
        success: false 
      }, { status: 500 })
    }

    console.log('[Smart Sync] Starting intelligent transaction sync...')
    
    const auth = Buffer.from(
      `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}` 
    ).toString('base64')

    // 2. Fetch from PayHero (Try transactions endpoint first)
    let response = await fetch('https://backend.payhero.co.ke/api/v2/transactions', {
      headers: { 'Authorization': `Basic ${auth}` },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.log('[Smart Sync] Trying alternative endpoint...')
      response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        headers: { 'Authorization': `Basic ${auth}` }
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Smart Sync] API Response:', errorText)
      return NextResponse.json({ 
        error: `PayHero API error: ${response.status} - ${errorText}`,
        success: false 
      }, { status: 500 })
    }

    const result = await response.json()
    
    // Handle different response structures
    let transactions = []
    if (Array.isArray(result.data)) {
      transactions = result.data
    } else if (Array.isArray(result)) {
      transactions = result
    } else if (result && typeof result === 'object' && Array.isArray(result.transactions)) {
      transactions = result.transactions
    } else {
      console.error('[Smart Sync] Unexpected API response structure:', result)
      return NextResponse.json({
        success: false,
        error: 'Invalid API response structure - expected array of transactions'
      }, { status: 500 })
    }
    
    console.log(`[Smart Sync] Retrieved ${transactions.length} transactions`)

    // 3. Handle landlord lookup safely (Avoid .single() crash)
    const { data: landlord, error: landlordErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'landlord')
      .limit(1)
      .maybeSingle() // This returns null instead of crashing if not found

    let updatedCount = 0
    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const tx of transactions) {
      try {
        // Defensive check: Process only inbound payments with valid provider_reference (skip fees and top-ups)
        if (!tx.provider_reference || 
            tx.provider_reference.startsWith('cost_') || 
            tx.transaction_type !== 'inbound_payment') {
          console.log(`[Smart Sync] Skipping transaction: Not a valid inbound payment`, {
            type: tx.transaction_type,
            provider_ref: tx.provider_reference,
            amount: tx.amount
          })
          skippedCount++
          continue
        }

        const mpesaCode = tx.provider_reference
        const externalRef = tx.external_reference || ''
        const amount = Number(tx.amount)

        console.log(`[Smart Sync] Processing transaction: ${mpesaCode} | Ref: ${externalRef} | Amount: ${amount}`)

        // 4. Check for existing record
        const { data: alreadyInDb, error: existingError } = await supabase
          .from('payments')
          .select('id')
          .eq('mpesa_code', mpesaCode)
          .maybeSingle()

        if (existingError) {
          console.error(`[Smart Sync] Database error checking existing payment:`, existingError)
          errorCount++
          continue
        }

        if (alreadyInDb) {
          console.log(`[Smart Sync] Transaction already exists: ${mpesaCode}`)
          skippedCount++
          continue
        }

        // 5. Try to find pending record to update (Priority 1)
        const { data: pendingRecord, error: pendingError } = await supabase
          .from('payments')
          .select('id')
          .eq('amount', amount)
          .eq('status', 'pending')
          .ilike('notes', `%${externalRef}%`)
          .maybeSingle()

        if (pendingError) {
          console.error(`[Smart Sync] Database error finding pending payment:`, pendingError)
          errorCount++
          continue
        }

        if (pendingRecord) {
          console.log(`[Smart Sync] Found pending record to update: ${pendingRecord.id}`)
          // Update existing pending record
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              mpesa_code: mpesaCode,
              status: 'complete',
              payment_date: tx.transaction_date || new Date().toISOString(),
              notes: `Updated via Smart Sync | Ref: ${externalRef}`
            })
            .eq('id', pendingRecord.id)

          if (updateError) {
            console.error(`[Smart Sync] Error updating ${mpesaCode}:`, updateError)
            errorCount++
          } else {
            console.log(`[Smart Sync] Updated pending: ${mpesaCode}`)
            updatedCount++
          }
        } else {
          // 6. Create new record (Priority 2)
          console.log(`[Smart Sync] Creating new record for: ${mpesaCode}`)
          let tenantId = null
          let paymentMonth = null
          
          // Parse external reference
          const match = externalRef.match(/^(RENT|REPAIRS)-(.+)-(\d{4}-\d{2})$/i)
          if (match) {
            tenantId = match[2]
            paymentMonth = match[3]
          }

          // Fallback: use transaction date month
          if (!paymentMonth && tx.transaction_date) {
            const txDate = new Date(tx.transaction_date)
            paymentMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
          }

          // Create new payment record with validation
          const paymentData = {
            tenant_id: tenantId,
            landlord_id: landlord?.id || null,
            amount: amount,
            phone_number: tx.phone_number,
            mpesa_code: mpesaCode,
            payment_month: paymentMonth,
            payment_method: 'mpesa',
            logged_by: 'system',
            status: 'complete',
            payment_date: tx.transaction_date || new Date().toISOString(),
            notes: `Created via Smart Sync | Ref: ${externalRef}`,
          }

          // Validate payment data before insert
          if (!paymentData.tenant_id || !paymentData.payment_month) {
            console.error(`[Smart Sync] Invalid payment data for ${mpesaCode}:`, paymentData)
            errorCount++
            continue
          }

          const { error: insertError } = await supabase.from('payments').insert(paymentData)

          if (insertError) {
            console.error(`[Smart Sync] Error creating ${mpesaCode}:`, insertError)
            errorCount++
          } else {
            console.log(`[Smart Sync] Created: ${mpesaCode}`)
            createdCount++
          }
        }
      } catch (err: any) {
        console.error(`[Smart Sync] Error processing ${tx.provider_reference}:`, err.message)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Smart sync completed: ${updatedCount} updated, ${createdCount} created, ${skippedCount} skipped, ${errorCount} errors`,
      stats: {
        updated: updatedCount,
        created: createdCount,
        skipped: skippedCount,
        errors: errorCount,
        total: transactions.length
      }
    }, { status: 200 })

  } catch (err: any) {
    console.error('[Smart Sync] Error:', err.message)
    return NextResponse.json({ 
      error: err.message,
      success: false 
    }, { status: 500 })
  }
}
