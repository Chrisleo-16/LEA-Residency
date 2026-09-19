import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  normalizeMpesaCode,
  lookupPayHeroByMpesaCode,
  recipientMatchesLandlord,
  extractAmountFromTx,
  extractMerchantFromTx,
} from '@/lib/mpesa/verifyMpesaCode'
import {
  ensureTenancyAccount,
  generateBillForPeriod,
  allocatePayment,
  addBillingMonths,
} from '@/lib/tenancy/ledger'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveAuth(request: NextRequest) {
  const auth = await createClient()
  const header = request.headers.get('authorization')
  const bearer =
    header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null
  const { data, error } = bearer
    ? await auth.auth.getUser(bearer)
    : await auth.auth.getUser()
  return { user: data.user, error }
}

async function resolveLandlordId(sb: any, tenantId: string) {
  const { data: slot } = await sb
    .from('tenant_slots')
    .select('landlord_block_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const blockId = slot?.landlord_block_id
  if (!blockId) return { landlordId: null as string | null, blockId: null as string | null }

  const { data: block } = await sb
    .from('landlord_blocks')
    .select('landlord_id')
    .eq('id', blockId)
    .maybeSingle()

  return { landlordId: block?.landlord_id || null, blockId }
}

/** True if landlord has any PayHero-linked M-Pesa channel (not Pochi-only). */
async function landlordHasPayHeroChannel(sb: any, landlordId: string) {
  const { data } = await sb
    .from('landlord_payment_settings')
    .select('id, payhero_channel_id, payment_type')
    .eq('landlord_id', landlordId)
    .not('payhero_channel_id', 'is', null)
    .limit(1)
  return !!(data && data.length)
}

async function allocateFromPaymentNotes(
  sb: any,
  opts: {
    tenantId: string
    landlordId: string
    blockId: string | null
    paymentId: string
    amount: number
    month: string
    notesSeed: string
    createdBy: string
  },
) {
  const account = await ensureTenancyAccount(sb, {
    tenantId: opts.tenantId,
    landlordId: opts.landlordId,
    landlordBlockId: opts.blockId,
  })
  const notesStr = String(opts.notesSeed || '')
  let vars: Record<string, number> | undefined
  const varsMatch = notesStr.match(/vars:(\{[^|]*\})/i)
  if (varsMatch) {
    try {
      vars = JSON.parse(varsMatch[1])
    } catch {
      vars = undefined
    }
  }
  if (!vars) {
    const waterMatch = notesStr.match(/water:([\d.]+)/i)
    const w = waterMatch ? Number(waterMatch[1]) : 0
    if (w > 0) vars = { water: w }
  }
  const advMatch = notesStr.match(/advance:(\d+)/i)
  const adv = advMatch ? Math.min(3, Number(advMatch[1]) || 0) : 0
  for (let i = 0; i <= adv; i++) {
    const period = addBillingMonths(opts.month, i)
    await generateBillForPeriod(sb, account.id, period, {
      createdBy: opts.createdBy,
      variableAmounts: i === 0 ? vars : undefined,
    })
  }
  const endPeriod = addBillingMonths(opts.month, adv)
  const onlyMatch = notesStr.match(/only:([a-z,_]+)/i)
  const onlyChargeTypes = onlyMatch
    ? onlyMatch[1].split(',').map((t) => t.trim()).filter(Boolean)
    : undefined
  return allocatePayment(sb, {
    paymentId: opts.paymentId,
    tenancyAccountId: account.id,
    amount: opts.amount,
    createdBy: opts.createdBy,
    billingPeriod: endPeriod,
    onlyChargeTypes,
    skipSeparateCharges: !onlyChargeTypes?.length,
  })
}

/**
 * POST /api/payments/confirm-mpesa
 * action: "start"            — create awaiting_sms placeholder after Pochi "Got it"
 * action: "submit"           — tenant enters M-Pesa code only
 *   - PayHero channel: auto-verify via PayHero transaction-status
 *   - Pochi (no PayHero): store code as awaiting_ll for landlord confirm/decline
 * action: "landlord_confirm" — landlord confirms a Pochi code
 * action: "landlord_decline" — landlord declines a Pochi code
 * GET                        — list awaiting rows for current tenant
 *
 * Note: payments.status is varchar(20).
 */
const AWAITING_SMS = 'awaiting_sms'
/** Awaiting landlord review of a Pochi receipt code (fits varchar(20)). */
const AWAITING_LL = 'awaiting_ll'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await resolveAuth(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = service()
    const scope = request.nextUrl.searchParams.get('scope')

    // Landlord: pending Pochi codes to confirm
    if (scope === 'landlord') {
      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'landlord') {
        return NextResponse.json({ error: 'Landlord only' }, { status: 403 })
      }
      const { data } = await sb
        .from('payments')
        .select('*')
        .eq('landlord_id', user.id)
        .eq('status', AWAITING_LL)
        .order('created_at', { ascending: false })
      return NextResponse.json({ success: true, pending: data || [] })
    }

    const { data } = await sb
      .from('payments')
      .select('*')
      .eq('tenant_id', user.id)
      .in('status', [AWAITING_SMS, AWAITING_LL])
      .order('created_at', { ascending: false })

    return NextResponse.json({ success: true, pending: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await resolveAuth(request)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = service()
    const body = await request.json()
    const action = body.action as string

    if (action === 'start') {
      const amount = Number(body.amount)
      const waterBill = Math.max(0, Number(body.waterBill) || 0)
      const variableAmounts: Record<string, number> = {
        ...(body.variableAmounts || {}),
      }
      if (waterBill > 0 && !variableAmounts.water) {
        variableAmounts.water = waterBill
      }
      const advanceMonths = Math.min(
        3,
        Math.max(0, Number(body.advanceMonths) || 0)
      )
      const onlyChargeTypes: string[] = Array.isArray(body.onlyChargeTypes)
        ? body.onlyChargeTypes.map((t: string) => String(t).toLowerCase())
        : []
      const month =
        body.month || new Date().toISOString().slice(0, 7)
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
      }

      const { landlordId, blockId } = await resolveLandlordId(sb, user.id)
      const { data: profile } = await sb
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', user.id)
        .maybeSingle()

      const seedBills = async (accountId: string) => {
        for (let i = 0; i <= advanceMonths; i++) {
          const period = addBillingMonths(month, i)
          await generateBillForPeriod(sb, accountId, period, {
            variableAmounts: i === 0 ? variableAmounts : undefined,
            createdBy: user.id,
          })
        }
      }

      const { data: existing } = await sb
        .from('payments')
        .select('id')
        .eq('tenant_id', user.id)
        .eq('payment_month', month)
        .eq('status', AWAITING_SMS)
        .not('notes', 'ilike', '%WIFI%')
        .maybeSingle()

      if (existing) {
        if (landlordId) {
          try {
            const account = await ensureTenancyAccount(sb, {
              tenantId: user.id,
              landlordId,
              landlordBlockId: blockId,
            })
            await seedBills(account.id)
          } catch (e: any) {
            console.warn('[confirm-mpesa] water attach:', e?.message)
          }
        }
        return NextResponse.json({
          success: true,
          payment: existing,
          reused: true,
        })
      }

      const noteParts = [
        'POCHI_MANUAL',
        'awaiting M-Pesa code',
        `block:${blockId || 'n/a'}`,
        Object.keys(variableAmounts).length
          ? `vars:${JSON.stringify(variableAmounts)}`
          : null,
        advanceMonths > 0 ? `advance:${advanceMonths}` : null,
        onlyChargeTypes.length
          ? `only:${onlyChargeTypes.join(',')}`
          : null,
      ].filter(Boolean)

      const { data: payment, error: insertError } = await sb
        .from('payments')
        .insert({
          tenant_id: user.id,
          landlord_id: landlordId,
          amount,
          phone_number: profile?.phone_number || null,
          mpesa_code: null,
          payment_month: month,
          payment_method: 'mpesa',
          logged_by: 'tenant',
          status: AWAITING_SMS,
          payment_date: new Date().toISOString(),
          notes: noteParts.join(' | '),
          tenant_name: profile?.full_name || null,
          tenant_email: profile?.email || null,
        })
        .select('*')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      if (landlordId) {
        try {
          const account = await ensureTenancyAccount(sb, {
            tenantId: user.id,
            landlordId,
            landlordBlockId: blockId,
          })
          await seedBills(account.id)
          await sb
            .from('payments')
            .update({ tenancy_account_id: account.id })
            .eq('id', payment.id)
        } catch (e: any) {
          console.warn('[confirm-mpesa] bill seed:', e?.message)
        }
      }

      return NextResponse.json({ success: true, payment, reused: false })
    }

    if (action === 'submit') {
      const paymentId = body.paymentId as string | undefined
      const month = body.month || new Date().toISOString().slice(0, 7)
      const rawCode =
        body.mpesaCode || body.code || body.smsText || body.message || ''

      const mpesaCode = normalizeMpesaCode(String(rawCode))
      if (!mpesaCode) {
        return NextResponse.json(
          {
            error:
              'Enter a valid M-Pesa code only (e.g. UIJ3U7MV3D). Do not paste the full SMS.',
          },
          { status: 400 }
        )
      }

      const { data: dup } = await sb
        .from('payments')
        .select('id')
        .eq('mpesa_code', mpesaCode)
        .maybeSingle()
      if (dup) {
        return NextResponse.json(
          { error: `Code ${mpesaCode} was already recorded` },
          { status: 409 }
        )
      }

      let paymentRow: any = null
      if (paymentId) {
        const { data } = await sb
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .eq('tenant_id', user.id)
          .maybeSingle()
        paymentRow = data
      }
      if (!paymentRow) {
        const { data } = await sb
          .from('payments')
          .select('*')
          .eq('tenant_id', user.id)
          .eq('status', AWAITING_SMS)
          .eq('payment_month', month)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        paymentRow = data
      }

      const { landlordId, blockId } = await resolveLandlordId(sb, user.id)
      if (!landlordId) {
        return NextResponse.json(
          { error: 'No landlord linked to your account' },
          { status: 400 }
        )
      }

      const { data: profile } = await sb
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', user.id)
        .maybeSingle()

      const hasPayHero = await landlordHasPayHeroChannel(sb, landlordId)

      // ── Pochi / non-PayHero: cannot look up receipt on PayHero ──
      if (!hasPayHero) {
        const amount = Number(paymentRow?.amount) || 0
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Missing payment amount. Start payment again from My Bills.' },
            { status: 400 }
          )
        }

        const notes = [
          'POCHI_MANUAL',
          'pending_landlord_review',
          `code:${mpesaCode}`,
          paymentRow?.notes || null,
        ]
          .filter(Boolean)
          .join(' | ')

        let saved: any
        if (paymentRow) {
          const { data, error: updErr } = await sb
            .from('payments')
            .update({
              amount,
              mpesa_code: mpesaCode,
              phone_number:
                profile?.phone_number || paymentRow.phone_number || null,
              status: AWAITING_LL,
              payment_date: new Date().toISOString(),
              payment_method: 'mpesa',
              notes,
              landlord_id: paymentRow.landlord_id || landlordId,
            })
            .eq('id', paymentRow.id)
            .select('*')
            .single()
          if (updErr) {
            return NextResponse.json({ error: updErr.message }, { status: 500 })
          }
          saved = data
        } else {
          const { data, error: insErr } = await sb
            .from('payments')
            .insert({
              tenant_id: user.id,
              landlord_id: landlordId,
              amount,
              phone_number: profile?.phone_number || null,
              mpesa_code: mpesaCode,
              payment_month: month,
              payment_method: 'mpesa',
              logged_by: 'tenant',
              status: AWAITING_LL,
              payment_date: new Date().toISOString(),
              notes,
              tenant_name: profile?.full_name || null,
              tenant_email: profile?.email || null,
            })
            .select('*')
            .single()
          if (insErr) {
            return NextResponse.json({ error: insErr.message }, { status: 500 })
          }
          saved = data
        }

        return NextResponse.json({
          success: true,
          pendingLandlord: true,
          payment: saved,
          message: `Code ${mpesaCode} submitted. Your landlord will confirm it against their Pochi (PayHero cannot see Pochi payments).`,
        })
      }

      // ── PayHero channel: auto-verify receipt ──
      const lookup = await lookupPayHeroByMpesaCode(mpesaCode)
      if (!lookup.ok) {
        return NextResponse.json(
          { error: lookup.error, declined: true },
          { status: 400 }
        )
      }

      const merchant = extractMerchantFromTx(lookup.tx)
      const { data: landlordProfile } = await sb
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', landlordId)
        .maybeSingle()

      const { data: channels } = await sb
        .from('landlord_payment_settings')
        .select('account_name, paybill_number, payment_type')
        .eq('landlord_id', landlordId)

      const expectedNames = [
        landlordProfile?.full_name,
        ...(channels || []).map((c: any) => c.account_name),
      ].filter(Boolean)

      const expectedPhones = [
        landlordProfile?.phone_number,
        ...(channels || []).map((c: any) => c.paybill_number),
      ]
        .filter(Boolean)
        .map((p: string) => String(p).replace(/\D/g, '').replace(/^254/, '0'))

      const txPhone = String(lookup.tx.phone || lookup.tx.phone_number || '')
        .replace(/\D/g, '')
        .replace(/^254/, '0')

      const phoneOk =
        !!txPhone &&
        expectedPhones.some(
          (p) =>
            p &&
            (p === txPhone ||
              p.endsWith(txPhone.slice(-9)) ||
              txPhone.endsWith(p.slice(-9))),
        )

      const nameOk = recipientMatchesLandlord(merchant, expectedNames)

      if (!nameOk && !phoneOk) {
        const expectedLabel =
          expectedNames.filter(Boolean)[0] || 'your landlord'
        return NextResponse.json(
          {
            error: merchant
              ? `Declined: this code was paid to “${merchant}”, not ${expectedLabel}.`
              : `Declined: could not confirm this code was paid to ${expectedLabel}.`,
            declined: true,
            merchant: merchant || null,
            expected: expectedLabel,
          },
          { status: 403 }
        )
      }

      const amount =
        extractAmountFromTx(lookup.tx) ?? Number(paymentRow?.amount) ?? 0
      if (!amount || amount <= 0) {
        return NextResponse.json(
          {
            error:
              'Payment found, but amount is missing. Ask your landlord to log it.',
            declined: true,
          },
          { status: 400 }
        )
      }

      const paidAt = lookup.tx.transaction_date || new Date().toISOString()
      const notes = [
        'verified:payhero',
        merchant ? `to:${merchant}` : null,
        `code:${mpesaCode}`,
      ]
        .filter(Boolean)
        .join(' | ')

      let saved: any
      if (paymentRow) {
        const { data, error: updErr } = await sb
          .from('payments')
          .update({
            amount,
            mpesa_code: mpesaCode,
            phone_number:
              profile?.phone_number || paymentRow.phone_number || null,
            status: 'confirmed',
            payment_date: paidAt,
            payment_method: 'mpesa',
            notes,
            landlord_id: paymentRow.landlord_id || landlordId,
          })
          .eq('id', paymentRow.id)
          .select('*')
          .single()
        if (updErr) {
          return NextResponse.json({ error: updErr.message }, { status: 500 })
        }
        saved = data
      } else {
        const { data, error: insErr } = await sb
          .from('payments')
          .insert({
            tenant_id: user.id,
            landlord_id: landlordId,
            amount,
            phone_number: profile?.phone_number || null,
            mpesa_code: mpesaCode,
            payment_month: month,
            payment_method: 'mpesa',
            logged_by: 'tenant',
            status: 'confirmed',
            payment_date: paidAt,
            notes,
            tenant_name: profile?.full_name || null,
            tenant_email: profile?.email || null,
          })
          .select('*')
          .single()
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 })
        }
        saved = data
      }

      let allocation: any = null
      try {
        allocation = await allocateFromPaymentNotes(sb, {
          tenantId: user.id,
          landlordId,
          blockId,
          paymentId: saved.id,
          amount,
          month,
          notesSeed: String(paymentRow?.notes || ''),
          createdBy: user.id,
        })
      } catch (ledgerErr: any) {
        console.warn('[confirm-mpesa] ledger skip:', ledgerErr?.message)
      }

      return NextResponse.json({
        success: true,
        payment: saved,
        merchant: merchant || null,
        allocation,
        message: `Verified ${mpesaCode} → ${merchant || 'landlord'} · KES ${amount.toLocaleString('en-KE')}`,
      })
    }

    // ── Landlord confirms / declines a Pochi code ──
    if (action === 'landlord_confirm' || action === 'landlord_decline') {
      const paymentId = body.paymentId as string
      if (!paymentId) {
        return NextResponse.json({ error: 'paymentId required' }, { status: 400 })
      }

      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'landlord') {
        return NextResponse.json({ error: 'Landlord only' }, { status: 403 })
      }

      const { data: row } = await sb
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('landlord_id', user.id)
        .eq('status', AWAITING_LL)
        .maybeSingle()

      if (!row) {
        return NextResponse.json(
          { error: 'No pending Pochi code found for this payment' },
          { status: 404 }
        )
      }

      if (action === 'landlord_decline') {
        const reason = String(body.reason || 'Not found on Pochi / wrong recipient').slice(0, 120)
        const { data, error: updErr } = await sb
          .from('payments')
          .update({
            status: 'declined',
            notes: `${row.notes || ''} | declined:${reason}`.slice(0, 500),
          })
          .eq('id', paymentId)
          .select('*')
          .single()
        if (updErr) {
          return NextResponse.json({ error: updErr.message }, { status: 500 })
        }
        return NextResponse.json({
          success: true,
          declined: true,
          payment: data,
          message: `Declined code ${row.mpesa_code}`,
        })
      }

      // Confirm
      const amount = Number(body.amount) || Number(row.amount) || 0
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
      }

      const { data: saved, error: updErr } = await sb
        .from('payments')
        .update({
          amount,
          status: 'confirmed',
          payment_date: new Date().toISOString(),
          logged_by: 'landlord',
          notes: `${row.notes || ''} | confirmed:landlord`.slice(0, 500),
        })
        .eq('id', paymentId)
        .select('*')
        .single()

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }

      let allocation: any = null
      try {
        const { blockId } = await resolveLandlordId(sb, row.tenant_id)
        allocation = await allocateFromPaymentNotes(sb, {
          tenantId: row.tenant_id,
          landlordId: user.id,
          blockId,
          paymentId: saved.id,
          amount,
          month: row.payment_month,
          notesSeed: String(row.notes || ''),
          createdBy: user.id,
        })
      } catch (ledgerErr: any) {
        console.warn('[confirm-mpesa] landlord ledger skip:', ledgerErr?.message)
      }

      return NextResponse.json({
        success: true,
        payment: saved,
        allocation,
        message: `Confirmed ${row.mpesa_code} · KES ${amount.toLocaleString('en-KE')}`,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[confirm-mpesa]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
