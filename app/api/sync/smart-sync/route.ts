import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYHERO_USERNAME || !process.env.PAYHERO_PASSWORD) {
      return NextResponse.json({
        error: 'Missing PayHero credentials in environment variables',
        success: false,
      }, { status: 500 })
    }

    console.log('[Smart Sync] Starting intelligent transaction sync...')

    const auth = Buffer.from(
      `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`
    ).toString('base64')

    // Try transactions endpoint first, fall back to payments
    let response = await fetch('https://backend.payhero.co.ke/api/v2/transactions', {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.log('[Smart Sync] Trying alternative endpoint...')
      response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        headers: { Authorization: `Basic ${auth}` },
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Smart Sync] API Response:', errorText)
      return NextResponse.json({
        error: `PayHero API error: ${response.status} - ${errorText}`,
        success: false,
      }, { status: 500 })
    }

    const result = await response.json()

    let transactions: any[] = []
    if (Array.isArray(result.data)) {
      transactions = result.data
    } else if (Array.isArray(result)) {
      transactions = result
    } else if (result && Array.isArray(result.transactions)) {
      transactions = result.transactions
    } else {
      console.error('[Smart Sync] Unexpected API response structure:', result)
      return NextResponse.json({
        success: false,
        error: 'Invalid API response structure',
      }, { status: 500 })
    }

    console.log(`[Smart Sync] Retrieved ${transactions.length} transactions`)

    let updatedCount = 0
    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const tx of transactions) {
      try {
        // Only process inbound payments with a valid M-Pesa reference
        if (
          !tx.provider_reference ||
          tx.provider_reference.startsWith('cost_') ||
          tx.transaction_type !== 'inbound_payment'
        ) {
          skippedCount++
          continue
        }

        const mpesaCode = tx.provider_reference
        const externalRef = tx.external_reference || ''
        const amount = Number(tx.amount)

        console.log(`[Smart Sync] Processing: ${mpesaCode} | Ref: ${externalRef} | Amount: ${amount}`)

        // Skip if already recorded
        const { data: alreadyInDb } = await supabase
          .from('payments')
          .select('id')
          .eq('mpesa_code', mpesaCode)
          .maybeSingle()

        if (alreadyInDb) {
          skippedCount++
          continue
        }

        // Parse external reference: "RENT-{tenantId}-{YYYY-MM}" or "REPAIRS-{tenantId}-{YYYY-MM}"
        let tenantId: string | null = null
        let paymentMonth: string | null = null

        if (externalRef) {
          const match = externalRef.match(/^(RENT|REPAIRS)-(.+)-(\d{4}-\d{2})$/i)
          if (match) {
            tenantId = match[2]
            paymentMonth = match[3]
          }
        }

        // Fallback: derive month from transaction date
        if (!paymentMonth && tx.transaction_date) {
          const txDate = new Date(tx.transaction_date)
          paymentMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
        }

        // Try to find and update a pending record for this tenant + month
        if (tenantId && paymentMonth) {
          const { data: pendingRecord } = await supabase
            .from('payments')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('payment_month', paymentMonth)
            .eq('status', 'pending')
            .maybeSingle()

          if (pendingRecord) {
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                mpesa_code: mpesaCode,
                status: 'complete',
                payment_date: tx.transaction_date || new Date().toISOString(),
                notes: 'Updated via Smart Sync ✅',
              })
              .eq('id', pendingRecord.id)

            if (updateError) {
              console.error(`[Smart Sync] Update error for ${mpesaCode}:`, updateError)
              errorCount++
            } else {
              console.log(`[Smart Sync] Updated pending → complete: ${mpesaCode}`)
              updatedCount++
            }
            continue
          }
        }

        // No pending record found — create a new one if we have enough data
        if (!tenantId || !paymentMonth) {
          console.warn(`[Smart Sync] Cannot create record for ${mpesaCode} — missing tenantId or month`)
          errorCount++
          continue
        }

        // Find landlord for this tenant
        let landlordId: string | null = null
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('landlord_id')
          .eq('tenant_id', tenantId)
          .neq('landlord_id', null)
          .limit(1)
          .maybeSingle()
        landlordId = existingPayment?.landlord_id || null

        if (!landlordId) {
          const { data: slot } = await supabase
            .from('tenant_slots')
            .select('landlord_block_id')
            .eq('tenant_id', tenantId)
            .maybeSingle()

          if (slot?.landlord_block_id) {
            const { data: landlordProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('landlord_block_id', slot.landlord_block_id)
              .eq('role', 'landlord')
              .maybeSingle()
            landlordId = landlordProfile?.id || null
          }
        }

        const { error: insertError } = await supabase.from('payments').insert({
          tenant_id: tenantId,
          landlord_id: landlordId,
          amount,
          phone_number: tx.phone_number || null,
          mpesa_code: mpesaCode,
          payment_month: paymentMonth,
          payment_method: 'mpesa',
          logged_by: 'system',
          status: 'complete',
          payment_date: tx.transaction_date || new Date().toISOString(),
          notes: `Created via Smart Sync | Ref: ${externalRef}`,
        })

        if (insertError) {
          console.error(`[Smart Sync] Insert error for ${mpesaCode}:`, insertError)
          errorCount++
        } else {
          console.log(`[Smart Sync] Created: ${mpesaCode}`)
          createdCount++
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
        total: transactions.length,
      },
    }, { status: 200 })
  } catch (err: any) {
    console.error('[Smart Sync] Error:', err.message)
    return NextResponse.json({
      error: err.message,
      success: false,
    }, { status: 500 })
  }
}