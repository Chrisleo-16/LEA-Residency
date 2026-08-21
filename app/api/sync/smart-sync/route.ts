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

    console.log('[Wi-Fi Smart Sync] Starting intelligent transaction sync...')

    const auth = Buffer.from(
      `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`
    ).toString('base64')

    // Try transactions endpoint first, fall back to payments
    let response = await fetch('https://backend.payhero.co.ke/api/v2/transactions', {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.log('[Wi-Fi Smart Sync] Trying alternative endpoint...')
      response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        headers: { Authorization: `Basic ${auth}` },
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Wi-Fi Smart Sync] API Response:', errorText)
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
      console.error('[Wi-Fi Smart Sync] Unexpected API response structure:', result)
      return NextResponse.json({
        success: false,
        error: 'Invalid API response structure',
      }, { status: 500 })
    }

    console.log(`[Wi-Fi Smart Sync] Retrieved ${transactions.length} transactions`)

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

        const externalRef: string = tx.external_reference || ''

        // Only touch WIFI-tagged transactions — everything else is left
        // for the regular smart-sync job to handle.
        if (!/^WIFI-/i.test(externalRef)) {
          skippedCount++
          continue
        }

        const mpesaCode = tx.provider_reference
        const amount = Number(tx.amount)

        console.log(`[Wi-Fi Smart Sync] Processing: ${mpesaCode} | Ref: ${externalRef} | Amount: ${amount}`)

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

        // Parse external reference: "WIFI-{tenantId}-{YYYY-MM}"
        let tenantId: string | null = null
        let paymentMonth: string | null = null

        const match = externalRef.match(/^WIFI-(.+)-(\d{4}-\d{2})$/i)
        if (match) {
          tenantId = match[1]
          paymentMonth = match[2]
        }

        // Fallback: derive month from transaction date
        if (!paymentMonth && tx.transaction_date) {
          const txDate = new Date(tx.transaction_date)
          paymentMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
        }

        // Figure out expected wifi amount for completeness check
        let isComplete = true
        if (tenantId) {
          const { data: rentSetting } = await supabase
            .from('rent_settings')
            .select('wifi_amount')
            .eq('tenant_id', tenantId)
            .maybeSingle()
          const expected = Number(rentSetting?.wifi_amount || 0)
          isComplete = expected > 0 ? amount >= expected : true
        }

        // Try to find and update a pending WIFI record for this tenant + month
        if (tenantId && paymentMonth) {
          const { data: pendingCandidates } = await supabase
            .from('payments')
            .select('id, notes')
            .eq('tenant_id', tenantId)
            .eq('payment_month', paymentMonth)
            .eq('status', 'pending')

          const pendingRecord = (pendingCandidates || []).find((p) =>
            (p.notes || '').toUpperCase().includes('WIFI')
          )

          if (pendingRecord) {
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                mpesa_code: mpesaCode,
                amount,
                status: isComplete ? 'complete' : 'partial',
                payment_date: tx.transaction_date || new Date().toISOString(),
                notes: 'WIFI | Updated via Smart Sync ✅',
              })
              .eq('id', pendingRecord.id)

            if (updateError) {
              console.error(`[Wi-Fi Smart Sync] Update error for ${mpesaCode}:`, updateError)
              errorCount++
            } else {
              console.log(`[Wi-Fi Smart Sync] Updated pending → ${isComplete ? 'complete' : 'partial'}: ${mpesaCode}`)
              updatedCount++
            }
            continue
          }
        }

        // No pending record found — create a new one if we have enough data
        if (!tenantId || !paymentMonth) {
          console.warn(`[Wi-Fi Smart Sync] Cannot create record for ${mpesaCode} — missing tenantId or month`)
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
          status: isComplete ? 'complete' : 'partial',
          payment_date: tx.transaction_date || new Date().toISOString(),
          notes: `WIFI | Created via Smart Sync | Ref: ${externalRef}`,
        })

        if (insertError) {
          console.error(`[Wi-Fi Smart Sync] Insert error for ${mpesaCode}:`, insertError)
          errorCount++
        } else {
          console.log(`[Wi-Fi Smart Sync] Created: ${mpesaCode}`)
          createdCount++
        }
      } catch (err: any) {
        console.error(`[Wi-Fi Smart Sync] Error processing ${tx.provider_reference}:`, err.message)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wi-Fi smart sync completed: ${updatedCount} updated, ${createdCount} created, ${skippedCount} skipped, ${errorCount} errors`,
      stats: {
        updated: updatedCount,
        created: createdCount,
        skipped: skippedCount,
        errors: errorCount,
        total: transactions.length,
      },
    }, { status: 200 })
  } catch (err: any) {
    console.error('[Wi-Fi Smart Sync] Error:', err.message)
    return NextResponse.json({
      error: err.message,
      success: false,
    }, { status: 500 })
  }
}