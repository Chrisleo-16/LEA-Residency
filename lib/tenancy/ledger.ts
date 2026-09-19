/**
 * Tenancy ledger — continuous account balance, bills, credits, arrears, allocation.
 * Uses service-role supabase client passed in by API routes.
 */

export type ChargeType =
  | 'rent'
  | 'water'
  | 'garbage'
  | 'service'
  | 'electricity'
  | 'wifi'
  | 'other'

export const CHARGE_PRIORITY: Record<ChargeType, number> = {
  rent: 20,
  water: 30,
  garbage: 40,
  wifi: 50,
  electricity: 60,
  service: 70,
  other: 100,
}

export interface TenancyAccountRow {
  id: string
  tenant_id: string
  landlord_id: string
  landlord_block_id: string | null
  unit_number: string | null
  credit_balance: number
  arrears_balance: number
  running_balance: number
  status: string
}

export interface BillLineInput {
  charge_type: string
  label: string
  amount: number
  priority?: number
  recurring_charge_id?: string | null
  is_arrears_carry?: boolean
}

type Sb = any // SupabaseClient — keep loose to avoid tight coupling in shared lib

function num(n: unknown) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** Sync rent/utilities recurring charges from rent_settings (idempotent). */
export async function syncRecurringChargesFromRentSettings(
  sb: Sb,
  accountId: string,
  tenantId: string
) {
  const { data: rs } = await sb
    .from('rent_settings')
    .select(
      [
        'monthly_amount',
        'wifi_enabled',
        'wifi_amount',
        'garbage_enabled',
        'garbage_amount',
        'electricity_enabled',
        'electricity_amount',
        'electricity_is_variable',
        'water_enabled',
        'water_fixed',
        'water_is_variable',
        'water_pay_separate',
        'garbage_pay_separate',
        'electricity_pay_separate',
      ].join(', ')
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const { data: existing } = await sb
    .from('recurring_charges')
    .select('*')
    .eq('tenancy_account_id', accountId)

  const byType = new Map<string, any>(
    (existing || []).map((c: any) => [c.charge_type, c])
  )

  const upserts: PromiseLike<any>[] = []

  const upsertFixed = (
    type: ChargeType,
    label: string,
    amount: number,
    enabled: boolean,
    paySeparately = false
  ) => {
    const cur = byType.get(type)
    if (!enabled || amount <= 0) {
      if (cur?.is_active) {
        upserts.push(
          sb
            .from('recurring_charges')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', cur.id)
        )
      }
      return
    }
    if (!cur) {
      upserts.push(
        sb.from('recurring_charges').insert({
          tenancy_account_id: accountId,
          charge_type: type,
          label,
          amount,
          is_variable: false,
          priority: CHARGE_PRIORITY[type],
          is_active: true,
          pay_separately: !!paySeparately,
        })
      )
    } else {
      upserts.push(
        sb
          .from('recurring_charges')
          .update({
            label,
            amount,
            is_variable: false,
            is_active: true,
            priority: CHARGE_PRIORITY[type],
            pay_separately: !!paySeparately,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cur.id)
      )
    }
  }

  const upsertWaterOrElectric = (
    type: 'water' | 'electricity',
    label: string,
    enabled: boolean,
    isVariable: boolean,
    fixedAmount: number,
    paySeparately = false
  ) => {
    const cur = byType.get(type)
    if (!enabled) {
      if (cur?.is_active) {
        upserts.push(
          sb
            .from('recurring_charges')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', cur.id)
        )
      }
      return
    }

    const payload = {
      label,
      amount: isVariable ? null : fixedAmount,
      is_variable: isVariable,
      is_active: true,
      priority: CHARGE_PRIORITY[type],
      pay_separately: !!paySeparately,
      updated_at: new Date().toISOString(),
    }

    if (!isVariable && fixedAmount <= 0) {
      if (cur?.is_active) {
        upserts.push(
          sb
            .from('recurring_charges')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', cur.id)
        )
      }
      return
    }

    if (!cur) {
      upserts.push(
        sb.from('recurring_charges').insert({
          tenancy_account_id: accountId,
          charge_type: type,
          ...payload,
        })
      )
    } else {
      upserts.push(
        sb.from('recurring_charges').update(payload).eq('id', cur.id)
      )
    }
  }

  const rentAmt = num(rs?.monthly_amount)
  upsertFixed('rent', 'Monthly Rent', rentAmt, rentAmt > 0, false)

  const waterEnabled = rs?.water_enabled !== false
  const waterFixedMode =
    waterEnabled && rs?.water_is_variable === false && num(rs?.water_fixed) > 0
  upsertWaterOrElectric(
    'water',
    'Water',
    waterEnabled,
    !waterFixedMode,
    num(rs?.water_fixed),
    !!rs?.water_pay_separate
  )

  upsertFixed(
    'garbage',
    'Garbage',
    num(rs?.garbage_amount),
    !!rs?.garbage_enabled && num(rs?.garbage_amount) > 0,
    !!rs?.garbage_pay_separate
  )

  const elecEnabled = !!rs?.electricity_enabled
  const elecVariable = !!rs?.electricity_is_variable
  upsertWaterOrElectric(
    'electricity',
    'Electricity',
    elecEnabled,
    elecVariable,
    num(rs?.electricity_amount),
    !!rs?.electricity_pay_separate
  )

  const wifiAmt = num(rs?.wifi_amount)
  upsertFixed('wifi', 'Wi-Fi', wifiAmt, !!rs?.wifi_enabled && wifiAmt > 0, true)

  await Promise.all(upserts)
}

/** Shift YYYY-MM by n months */
export function addBillingMonths(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface ChargePlanItem {
  charge_type: string
  label: string
  amount: number | null
  is_variable: boolean
  is_active: boolean
  priority: number
  tenant_can_enter: boolean
  /** Paid on its own (not in rent STK / Pochi total) */
  pay_separately: boolean
}

export interface PaymentRules {
  allowAdvanceMonths: number
  allowTenantVariableEntry: boolean
}

export interface SeparateDueItem {
  charge_type: string
  label: string
  amount: number
  billing_period: string
  bill_line_id: string
  is_variable: boolean
  tenant_can_enter: boolean
}

/** Build charge plan + rules for tenant payment UI */
export async function getChargePlanAndRules(
  sb: Sb,
  accountId: string,
  tenantId: string
): Promise<{ chargePlan: ChargePlanItem[]; paymentRules: PaymentRules }> {
  await syncRecurringChargesFromRentSettings(sb, accountId, tenantId)

  const { data: rs } = await sb
    .from('rent_settings')
    .select(
      'allow_advance_months, allow_tenant_variable_entry, water_is_variable, electricity_is_variable'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const allowTenantVariableEntry = rs?.allow_tenant_variable_entry !== false
  const allowAdvanceMonths = Math.min(
    3,
    Math.max(0, Number(rs?.allow_advance_months) || 0)
  )

  const { data: charges } = await sb
    .from('recurring_charges')
    .select('*')
    .eq('tenancy_account_id', accountId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  const chargePlan: ChargePlanItem[] = (charges || [])
    .filter((c: any) => String(c.charge_type).toLowerCase() !== 'wifi')
    .map((c: any) => ({
      charge_type: c.charge_type,
      label: c.label,
      amount: c.amount == null ? null : num(c.amount),
      is_variable: !!c.is_variable,
      is_active: !!c.is_active,
      priority: c.priority ?? 100,
      tenant_can_enter:
        !!c.is_variable &&
        allowTenantVariableEntry,
      pay_separately: !!c.pay_separately,
    }))

  return {
    chargePlan,
    paymentRules: { allowAdvanceMonths, allowTenantVariableEntry },
  }
}

/** Ensure a tenancy account exists for tenant + landlord block. Seed rent charge from rent_settings. */
export async function ensureTenancyAccount(
  sb: Sb,
  params: {
    tenantId: string
    landlordId: string
    landlordBlockId?: string | null
    unitNumber?: string | null
  }
): Promise<TenancyAccountRow> {
  const { tenantId, landlordId, landlordBlockId, unitNumber } = params

  let q = sb
    .from('tenancy_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (landlordBlockId) q = q.eq('landlord_block_id', landlordBlockId)
  else q = q.eq('landlord_id', landlordId)

  const { data: existing } = await q.maybeSingle()
  if (existing) {
    await syncRecurringChargesFromRentSettings(sb, existing.id, tenantId)
    if (unitNumber && !existing.unit_number) {
      await sb
        .from('tenancy_accounts')
        .update({ unit_number: unitNumber })
        .eq('id', existing.id)
      existing.unit_number = unitNumber
    }
    return existing as TenancyAccountRow
  }

  const { data: created, error } = await sb
    .from('tenancy_accounts')
    .insert({
      tenant_id: tenantId,
      landlord_id: landlordId,
      landlord_block_id: landlordBlockId || null,
      unit_number: unitNumber || null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await syncRecurringChargesFromRentSettings(sb, created.id, tenantId)

  const { data: rs } = await sb
    .from('rent_settings')
    .select('unit_number')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (rs?.unit_number && !created.unit_number) {
    await sb
      .from('tenancy_accounts')
      .update({ unit_number: rs.unit_number })
      .eq('id', created.id)
    created.unit_number = rs.unit_number
  }

  return created as TenancyAccountRow
}

async function appendLedger(
  sb: Sb,
  accountId: string,
  entry: {
    entry_type: string
    amount: number
    balance_after: number
    reference_type?: string
    reference_id?: string
    description?: string
    created_by?: string
  }
) {
  await sb.from('tenancy_ledger_entries').insert({
    tenancy_account_id: accountId,
    ...entry,
  })
}

async function refreshAccountBalances(sb: Sb, accountId: string) {
  const { data: account } = await sb
    .from('tenancy_accounts')
    .select('*')
    .eq('id', accountId)
    .single()
  if (!account) return

  const { data: openBills } = await sb
    .from('bills')
    .select('amount_due, amount_paid, status')
    .eq('tenancy_account_id', accountId)
    .in('status', ['open', 'partial', 'overdue', 'draft'])

  const outstanding = (openBills || []).reduce(
    (s: number, b: any) => s + Math.max(0, num(b.amount_due) - num(b.amount_paid)),
    0
  )

  const credit = num(account.credit_balance)
  const running = num(outstanding - credit)

  await sb
    .from('tenancy_accounts')
    .update({
      arrears_balance: Math.max(0, running),
      running_balance: running,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}

/** Generate (or return existing) bill for a billing period. */
export async function generateBillForPeriod(
  sb: Sb,
  accountId: string,
  billingPeriod: string, // YYYY-MM
  opts?: {
    variableAmounts?: Record<string, number> // charge_type → amount
    dueDay?: number
    createdBy?: string
  }
) {
  const { data: existing } = await sb
    .from('bills')
    .select('*, bill_lines(*)')
    .eq('tenancy_account_id', accountId)
    .eq('billing_period', billingPeriod)
    .maybeSingle()

  if (existing) {
    const lines = existing.bill_lines || []
    const hasChargeLines = lines.some(
      (l: any) =>
        !l.is_arrears_carry &&
        String(l.charge_type).toLowerCase() !== 'wifi' &&
        num(l.amount) > 0
    )
    const paidAnything = num(existing.amount_paid) > 0
    // Heal empty stub bills created before rent charges were seeded
    if (!hasChargeLines && !paidAnything) {
      await sb.from('bills').delete().eq('id', existing.id)
    } else {
      // Strip wifi lines from rent bills (wifi is paid separately after rent)
      const wifiLines = lines.filter(
        (l: any) => String(l.charge_type).toLowerCase() === 'wifi'
      )
      if (wifiLines.length) {
        for (const wl of wifiLines) {
          await sb.from('bill_lines').delete().eq('id', wl.id)
        }
        const rentLines = lines.filter(
          (l: any) => String(l.charge_type).toLowerCase() !== 'wifi'
        )
        const newSubtotal = rentLines.reduce(
          (s: number, l: any) => s + num(l.amount),
          0
        )
        const paidOnRent = rentLines.reduce(
          (s: number, l: any) => s + num(l.amount_paid),
          0
        )
        const due = Math.max(0, num(newSubtotal - paidOnRent))
        await sb
          .from('bills')
          .update({
            subtotal: newSubtotal,
            amount_due: newSubtotal,
            amount_paid: paidOnRent,
            status: due <= 0 ? 'paid' : paidOnRent > 0 ? 'partial' : 'open',
            paid_at: due <= 0 ? existing.paid_at || new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        await refreshAccountBalances(sb, accountId)
      }

      // Optionally attach variable charges (e.g. water) onto an open bill
      if (opts?.variableAmounts) {
        const { data: fresh } = await sb
          .from('bills')
          .select('*, bill_lines(*)')
          .eq('id', existing.id)
          .single()
        await applyVariableAmountsToBill(sb, fresh || existing, opts.variableAmounts)
        const { data: refreshed } = await sb
          .from('bills')
          .select('*, bill_lines(*)')
          .eq('id', existing.id)
          .single()
        return refreshed || existing
      }
      const { data: afterWifi } = await sb
        .from('bills')
        .select('*, bill_lines(*)')
        .eq('id', existing.id)
        .single()
      return afterWifi || existing
    }
  }

  const { data: account } = await sb
    .from('tenancy_accounts')
    .select('*')
    .eq('id', accountId)
    .single()
  if (!account) throw new Error('Tenancy account not found')

  // Keep recurring charges in sync before generating
  await syncRecurringChargesFromRentSettings(
    sb,
    accountId,
    account.tenant_id
  )

  const { data: recurring } = await sb
    .from('recurring_charges')
    .select('*')
    .eq('tenancy_account_id', accountId)
    .eq('is_active', true)

  const { data: rs } = await sb
    .from('rent_settings')
    .select('monthly_amount, deposit_months, deposit_billed_period')
    .eq('tenant_id', account.tenant_id)
    .maybeSingle()

  const depositMonths = [2, 3].includes(Number(rs?.deposit_months))
    ? Number(rs.deposit_months)
    : 0
  const depositAlreadyBilled = !!rs?.deposit_billed_period
  const isDepositPeriod =
    depositMonths > 0 &&
    !depositAlreadyBilled &&
    num(rs?.monthly_amount) > 0

  const lines: BillLineInput[] = []

  // Carry prior arrears as a line
  const priorArrears = num(account.arrears_balance)
  if (priorArrears > 0) {
    lines.push({
      charge_type: 'other',
      label: 'Previous balance (arrears)',
      amount: priorArrears,
      priority: 10,
      is_arrears_carry: true,
    })
  }

  // First bill for a new tenant: security deposit only (N × rent), not normal rent
  if (isDepositPeriod) {
    const depositAmt = num(num(rs.monthly_amount) * depositMonths)
    lines.push({
      charge_type: 'other',
      label: `Security deposit (${depositMonths} months)`,
      amount: depositAmt,
      priority: 15,
    })
  }

  for (const c of recurring || []) {
    // Wi-Fi is collected after rent on its own flow — never on the rent bill
    if (String(c.charge_type).toLowerCase() === 'wifi') continue
    // Deposit month: skip monthly rent (deposit stands in for first period)
    if (
      isDepositPeriod &&
      String(c.charge_type).toLowerCase() === 'rent'
    ) {
      continue
    }

    let amount = c.is_variable
      ? num(opts?.variableAmounts?.[c.charge_type])
      : num(c.amount)
    if (c.is_variable && !opts?.variableAmounts?.[c.charge_type]) {
      // skip zero variable charges until landlord/tenant sets them
      continue
    }
    if (amount <= 0) continue
    lines.push({
      charge_type: c.charge_type,
      label: c.label,
      amount,
      priority: c.priority ?? CHARGE_PRIORITY[c.charge_type as ChargeType] ?? 100,
      recurring_charge_id: c.id,
    })
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  // Do NOT auto-apply account credit when generating — credit sits until a real
  // payment allocation uses it. Otherwise an unpaid month looks "Paid".
  const creditApplied = 0
  const amountDue = num(subtotal)

  const dueDay = opts?.dueDay || 5
  const [y, m] = billingPeriod.split('-').map(Number)
  const dueDate = new Date(y, m - 1, Math.min(dueDay, 28))

  const { data: bill, error } = await sb
    .from('bills')
    .insert({
      tenancy_account_id: accountId,
      billing_period: billingPeriod,
      status: amountDue <= 0 ? 'paid' : 'open',
      subtotal,
      credit_applied: creditApplied,
      amount_due: amountDue,
      amount_paid: amountDue <= 0 ? amountDue : 0,
      due_date: dueDate.toISOString().slice(0, 10),
      paid_at: amountDue <= 0 ? new Date().toISOString() : null,
      notes: isDepositPeriod
        ? `DEPOSIT_PERIOD | ${depositMonths}x rent`
        : null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  if (isDepositPeriod) {
    await sb
      .from('rent_settings')
      .update({
        deposit_billed_period: billingPeriod,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', account.tenant_id)
  }

  if (lines.length) {
    await sb.from('bill_lines').insert(
      lines.map((l) => ({
        bill_id: bill.id,
        charge_type: l.charge_type,
        label: l.label,
        amount: l.amount,
        amount_paid: 0,
        amount_outstanding: l.amount,
        recurring_charge_id: l.recurring_charge_id || null,
        priority: l.priority ?? 100,
        is_arrears_carry: !!l.is_arrears_carry,
      }))
    )
  }

  // Consume credit
  if (creditApplied > 0) {
    await sb
      .from('tenancy_accounts')
      .update({
        credit_balance: num(account.credit_balance - creditApplied),
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)

    await appendLedger(sb, accountId, {
      entry_type: 'credit_applied',
      amount: -creditApplied,
      balance_after: amountDue,
      reference_type: 'bill',
      reference_id: bill.id,
      description: `Credit KES ${creditApplied} applied to ${billingPeriod}`,
      created_by: opts?.createdBy,
    })
  }

  await appendLedger(sb, accountId, {
    entry_type: 'bill_generated',
    amount: amountDue,
    balance_after: amountDue,
    reference_type: 'bill',
    reference_id: bill.id,
    description: `Bill generated for ${billingPeriod}`,
    created_by: opts?.createdBy,
  })

  await refreshAccountBalances(sb, accountId)

  const { data: full } = await sb
    .from('bills')
    .select('*, bill_lines(*)')
    .eq('id', bill.id)
    .single()

  return full
}

/** Add/update variable charges (water etc.) on an existing open bill. */
async function applyVariableAmountsToBill(
  sb: Sb,
  bill: any,
  variableAmounts: Record<string, number>
) {
  if (!['open', 'partial', 'overdue', 'draft'].includes(bill.status)) return

  const existingLines = bill.bill_lines || []
  let added = 0

  for (const [chargeType, rawAmt] of Object.entries(variableAmounts)) {
    const amount = num(rawAmt)
    if (amount <= 0) continue

    const existing = existingLines.find(
      (l: any) => l.charge_type === chargeType && !l.is_arrears_carry
    )
    if (existing) {
      const delta = num(amount - num(existing.amount))
      if (delta === 0) continue
      const newAmt = amount
      const paid = num(existing.amount_paid)
      await sb
        .from('bill_lines')
        .update({
          amount: newAmt,
          amount_outstanding: Math.max(0, num(newAmt - paid)),
        })
        .eq('id', existing.id)
      added += delta
    } else {
      await sb.from('bill_lines').insert({
        bill_id: bill.id,
        charge_type: chargeType,
        label: chargeType === 'water' ? 'Water' : chargeType,
        amount,
        amount_paid: 0,
        amount_outstanding: amount,
        priority: CHARGE_PRIORITY[chargeType as ChargeType] ?? 100,
        is_arrears_carry: false,
      })
      added += amount
    }
  }

  if (added === 0) return

  const newSubtotal = num(num(bill.subtotal) + added)
  const newDue = num(num(bill.amount_due) + added)
  await sb
    .from('bills')
    .update({
      subtotal: newSubtotal,
      amount_due: newDue,
      status: newDue <= num(bill.amount_paid) ? 'paid' : bill.status === 'paid' ? 'open' : bill.status,
      paid_at: newDue <= num(bill.amount_paid) ? bill.paid_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bill.id)

  await refreshAccountBalances(sb, bill.tenancy_account_id)
}

/**
 * Allocate a payment across open bill lines by priority.
 * Surplus becomes credit. Returns allocation summary.
 * Idempotent: if this payment already has allocations, returns existing summary.
 */
export async function allocatePayment(
  sb: Sb,
  params: {
    paymentId: string
    tenancyAccountId: string
    amount: number
    createdBy?: string
    /** Prefer allocating to this billing period (YYYY-MM); never to later periods */
    billingPeriod?: string
    /** Only allocate to these charge types (e.g. ['water'] for separate water pay) */
    onlyChargeTypes?: string[]
    /** Skip lines marked pay_separately / wifi (default true for rent payments) */
    skipSeparateCharges?: boolean
  }
) {
  const amount = num(params.amount)
  if (amount <= 0) throw new Error('Payment amount must be positive')

  // Prevent duplicate credit spam from repeated reconcile / page loads
  const { data: existingAllocs } = await sb
    .from('payment_allocations')
    .select('id, amount, allocation_type, bill_id, bill_line_id, notes')
    .eq('payment_id', params.paymentId)

  if (existingAllocs && existingAllocs.length > 0) {
    return {
      allocated: existingAllocs
        .filter((a: any) => a.allocation_type === 'bill_line')
        .map((a: any) => ({
          bill_id: a.bill_id,
          bill_line_id: a.bill_line_id,
          label: a.notes || 'Bill line',
          amount: num(a.amount),
        })),
      creditAdded: existingAllocs
        .filter((a: any) => a.allocation_type === 'credit')
        .reduce((s: number, a: any) => s + num(a.amount), 0),
      account: null,
      totalPaid: amount,
      skipped: true,
    }
  }

  const { data: account } = await sb
    .from('tenancy_accounts')
    .select('*')
    .eq('id', params.tenancyAccountId)
    .single()
  if (!account) throw new Error('Tenancy account not found')

  const { data: separateCharges } = await sb
    .from('recurring_charges')
    .select('charge_type, pay_separately')
    .eq('tenancy_account_id', params.tenancyAccountId)
    .eq('is_active', true)

  const separateTypes = new Set(
    (separateCharges || [])
      .filter((c: any) => !!c.pay_separately)
      .map((c: any) => String(c.charge_type).toLowerCase())
  )
  separateTypes.add('wifi')

  const onlyTypes = (params.onlyChargeTypes || []).map((t) =>
    String(t).toLowerCase()
  )
  const skipSeparate = params.skipSeparateCharges !== false && onlyTypes.length === 0

  const lineAllowed = (chargeType: string) => {
    const t = String(chargeType).toLowerCase()
    if (onlyTypes.length) return onlyTypes.includes(t)
    if (skipSeparate && separateTypes.has(t)) return false
    return true
  }

  // Open bills oldest first
  let { data: bills } = await sb
    .from('bills')
    .select('*, bill_lines(*)')
    .eq('tenancy_account_id', params.tenancyAccountId)
    .in('status', ['open', 'partial', 'overdue'])
    .order('billing_period', { ascending: true })

  // Never apply a May payment onto a later unpaid September alone —
  // only periods on or before the payment's target end month (oldest first).
  if (params.billingPeriod) {
    bills = (bills || [])
      .filter((b: any) => b.billing_period <= params.billingPeriod!)
      .sort((a: any, b: any) =>
        String(a.billing_period).localeCompare(String(b.billing_period))
      )
  }

  let remaining = amount
  const allocations: Array<{
    bill_id: string
    bill_line_id: string
    label: string
    amount: number
  }> = []

  for (const bill of bills || []) {
    if (remaining <= 0) break
    const lines = [...(bill.bill_lines || [])].sort(
      (a: any, b: any) => (a.priority || 100) - (b.priority || 100)
    )

    let billPaidDelta = 0

    for (const line of lines) {
      if (remaining <= 0) break
      if (!lineAllowed(line.charge_type)) continue

      const outstanding = num(line.amount_outstanding ?? line.amount - line.amount_paid)
      if (outstanding <= 0) continue

      const apply = Math.min(remaining, outstanding)
      const newPaid = num(line.amount_paid + apply)
      const newOutstanding = num(line.amount - newPaid)

      await sb
        .from('bill_lines')
        .update({ amount_paid: newPaid, amount_outstanding: newOutstanding })
        .eq('id', line.id)

      await sb.from('payment_allocations').insert({
        payment_id: params.paymentId,
        bill_id: bill.id,
        bill_line_id: line.id,
        tenancy_account_id: params.tenancyAccountId,
        amount: apply,
        allocation_type: 'bill_line',
        notes: line.label,
      })

      allocations.push({
        bill_id: bill.id,
        bill_line_id: line.id,
        label: line.label,
        amount: apply,
      })

      remaining = num(remaining - apply)
      billPaidDelta = num(billPaidDelta + apply)
    }

    if (billPaidDelta > 0) {
      const newAmountPaid = num(bill.amount_paid + billPaidDelta)
      // Recompute still-due from lines so separate unpaid lines keep bill open
      const { data: freshLines } = await sb
        .from('bill_lines')
        .select('amount_outstanding, charge_type')
        .eq('bill_id', bill.id)
      const stillOutstanding = (freshLines || []).reduce(
        (s: number, l: any) => s + Math.max(0, num(l.amount_outstanding)),
        0
      )
      const status =
        stillOutstanding <= 0
          ? 'paid'
          : newAmountPaid > 0
            ? 'partial'
            : bill.status

      await sb
        .from('bills')
        .update({
          amount_paid: newAmountPaid,
          status,
          paid_at: stillOutstanding <= 0 ? new Date().toISOString() : bill.paid_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bill.id)
    }
  }

  // Overpayment: generate upcoming months and keep allocating (covers “paid ahead”)
  if (remaining > 0) {
    const { data: latestBill } = await sb
      .from('bills')
      .select('billing_period')
      .eq('tenancy_account_id', params.tenancyAccountId)
      .order('billing_period', { ascending: false })
      .limit(1)
      .maybeSingle()

    let cursor =
      latestBill?.billing_period ||
      params.billingPeriod ||
      new Date().toISOString().slice(0, 7)

    for (let i = 0; i < 6 && remaining > 0; i++) {
      const nextPeriod = addBillingMonths(cursor, 1)
      // Don't generate beyond an explicit end period if set and we're already there
      if (
        params.billingPeriod &&
        nextPeriod > params.billingPeriod &&
        i === 0 &&
        (bills || []).some((b: any) => b.billing_period === params.billingPeriod)
      ) {
        // still allow generating ahead when surplus remains after target period
      }

      try {
        await generateBillForPeriod(sb, params.tenancyAccountId, nextPeriod, {
          createdBy: params.createdBy,
        })
      } catch {
        break
      }

      const { data: nextBill } = await sb
        .from('bills')
        .select('*, bill_lines(*)')
        .eq('tenancy_account_id', params.tenancyAccountId)
        .eq('billing_period', nextPeriod)
        .maybeSingle()

      if (
        !nextBill ||
        !['open', 'partial', 'overdue'].includes(nextBill.status)
      ) {
        cursor = nextPeriod
        continue
      }

      const lines = [...(nextBill.bill_lines || [])].sort(
        (a: any, b: any) => (a.priority || 100) - (b.priority || 100)
      )
      let billPaidDelta = 0
      for (const line of lines) {
        if (remaining <= 0) break
        if (!lineAllowed(line.charge_type)) continue
        const outstanding = num(
          line.amount_outstanding ?? line.amount - line.amount_paid
        )
        if (outstanding <= 0) continue
        const apply = Math.min(remaining, outstanding)
        const newPaid = num(line.amount_paid + apply)
        const newOutstanding = num(line.amount - newPaid)
        await sb
          .from('bill_lines')
          .update({ amount_paid: newPaid, amount_outstanding: newOutstanding })
          .eq('id', line.id)
        await sb.from('payment_allocations').insert({
          payment_id: params.paymentId,
          bill_id: nextBill.id,
          bill_line_id: line.id,
          tenancy_account_id: params.tenancyAccountId,
          amount: apply,
          allocation_type: 'bill_line',
          notes: line.label,
        })
        allocations.push({
          bill_id: nextBill.id,
          bill_line_id: line.id,
          label: line.label,
          amount: apply,
        })
        remaining = num(remaining - apply)
        billPaidDelta = num(billPaidDelta + apply)
      }
      if (billPaidDelta > 0) {
        const newAmountPaid = num(nextBill.amount_paid + billPaidDelta)
        const stillDue = num(nextBill.amount_due - newAmountPaid)
        await sb
          .from('bills')
          .update({
            amount_paid: newAmountPaid,
            status:
              stillDue <= 0
                ? 'paid'
                : newAmountPaid > 0
                  ? 'partial'
                  : nextBill.status,
            paid_at:
              stillDue <= 0
                ? new Date().toISOString()
                : nextBill.paid_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', nextBill.id)
      }
      cursor = nextPeriod
    }
  }

  let creditAdded = 0
  if (remaining > 0) {
    creditAdded = remaining
    await sb
      .from('tenancy_accounts')
      .update({
        credit_balance: num(account.credit_balance + creditAdded),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.tenancyAccountId)

    await sb.from('payment_allocations').insert({
      payment_id: params.paymentId,
      tenancy_account_id: params.tenancyAccountId,
      amount: creditAdded,
      allocation_type: 'credit',
      notes: 'Overpayment carried as credit',
    })

    await appendLedger(sb, params.tenancyAccountId, {
      entry_type: 'credit_added',
      amount: creditAdded,
      balance_after: 0,
      reference_type: 'payment',
      reference_id: params.paymentId,
      description: `Credit KES ${creditAdded} from overpayment`,
      created_by: params.createdBy,
    })

    remaining = 0
  }

  await sb
    .from('payments')
    .update({
      tenancy_account_id: params.tenancyAccountId,
      unallocated_amount: 0,
    })
    .eq('id', params.paymentId)

  await appendLedger(sb, params.tenancyAccountId, {
    entry_type: 'payment',
    amount: -amount,
    balance_after: 0,
    reference_type: 'payment',
    reference_id: params.paymentId,
    description: `Payment of KES ${amount} allocated`,
    created_by: params.createdBy,
  })

  await refreshAccountBalances(sb, params.tenancyAccountId)

  const { data: updatedAccount } = await sb
    .from('tenancy_accounts')
    .select('*')
    .eq('id', params.tenancyAccountId)
    .single()

  return {
    allocated: allocations,
    creditAdded,
    account: updatedAccount,
    totalPaid: amount,
  }
}

/** Summary for My Bills / payment modal */
export async function getAccountSummary(sb: Sb, accountId: string) {
  const { data: account } = await sb
    .from('tenancy_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  const period = new Date().toISOString().slice(0, 7)

  // Link any confirmed tenant payments that never hit the ledger
  if (account?.tenant_id) {
    await reconcileTenantPayments(sb, account)
    await reopenPeriodIfNoPaymentThisMonth(sb, account, period)
    await recomputeCreditBalance(sb, accountId)
  }

  await refreshAccountBalances(sb, accountId)

  const { data: refreshedAccount } = await sb
    .from('tenancy_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  const { data: currentBill } = await sb
    .from('bills')
    .select('*, bill_lines(*)')
    .eq('tenancy_account_id', accountId)
    .eq('billing_period', period)
    .maybeSingle()

  const { data: openBills } = await sb
    .from('bills')
    .select('*, bill_lines(*)')
    .eq('tenancy_account_id', accountId)
    .in('status', ['open', 'partial', 'overdue'])
    .order('billing_period', { ascending: true })

  // Prefer payments linked to account; fall back to tenant_id so history shows
  let { data: recentPayments } = await sb
    .from('payments')
    .select('*, payment_allocations(*)')
    .eq('tenancy_account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  if ((!recentPayments || recentPayments.length === 0) && account?.tenant_id) {
    const { data: byTenant } = await sb
      .from('payments')
      .select('*, payment_allocations(*)')
      .eq('tenant_id', account.tenant_id)
      .order('created_at', { ascending: false })
      .limit(50)
    recentPayments = byTenant || []
  }

  // Deduplicate allocation display noise (same payment → many identical credits)
  recentPayments = (recentPayments || []).map((p: any) => ({
    ...p,
    payment_allocations: collapseAllocations(p.payment_allocations || []),
  }))

  const totalDue = (openBills || []).reduce(
    (s: number, b: any) => s + Math.max(0, num(b.amount_due) - num(b.amount_paid)),
    0
  )

  const acct = refreshedAccount || account

  let chargePlan: ChargePlanItem[] = []
  let paymentRules: PaymentRules = {
    allowAdvanceMonths: 0,
    allowTenantVariableEntry: true,
  }
  if (acct?.tenant_id) {
    const plan = await getChargePlanAndRules(sb, accountId, acct.tenant_id)
    chargePlan = plan.chargePlan
    paymentRules = plan.paymentRules
  }

  const separateTypeSet = new Set(
    chargePlan.filter((c) => c.pay_separately).map((c) => c.charge_type.toLowerCase())
  )
  separateTypeSet.add('wifi')

  const separateDues: SeparateDueItem[] = []
  let rentDue = 0
  for (const b of openBills || []) {
    for (const line of b.bill_lines || []) {
      const left = Math.max(0, num(line.amount_outstanding ?? line.amount - line.amount_paid))
      if (left <= 0) continue
      const t = String(line.charge_type).toLowerCase()
      if (separateTypeSet.has(t)) {
        const planItem = chargePlan.find(
          (c) => c.charge_type.toLowerCase() === t
        )
        separateDues.push({
          charge_type: line.charge_type,
          label: line.label,
          amount: left,
          billing_period: b.billing_period,
          bill_line_id: line.id,
          is_variable: !!planItem?.is_variable,
          tenant_can_enter: !!planItem?.tenant_can_enter,
        })
      } else {
        rentDue = num(rentDue + left)
      }
    }
  }

  return {
    account: acct,
    currentBill,
    openBills: openBills || [],
    recentPayments: recentPayments || [],
    totalDue: num(totalDue),
    rentDue: num(rentDue),
    separateDues,
    creditBalance: num(acct?.credit_balance),
    arrearsBalance: num(acct?.arrears_balance),
    runningBalance: num(acct?.running_balance),
    chargePlan,
    paymentRules,
  }
}

function collapseAllocations(allocs: any[]) {
  const map = new Map<string, any>()
  for (const a of allocs) {
    const key = `${a.allocation_type}|${a.bill_line_id || ''}|${a.notes || ''}|${a.amount}`
    const cur = map.get(key)
    if (cur) {
      cur._count = (cur._count || 1) + 1
    } else {
      map.set(key, { ...a, _count: 1 })
    }
  }
  return [...map.values()].map((a) =>
    a._count > 1
      ? { ...a, notes: `${a.notes || a.allocation_type} ×${a._count}` }
      : a
  )
}

/**
 * If there is no confirmed rent payment for this billing period, the period
 * bill must stay open/due — undo "paid via credit" false positives.
 */
async function reopenPeriodIfNoPaymentThisMonth(
  sb: Sb,
  account: TenancyAccountRow,
  period: string
) {
  const { data: monthPays } = await sb
    .from('payments')
    .select('id, status, notes, amount')
    .eq('tenant_id', account.tenant_id)
    .eq('payment_month', period)
    .in('status', ['confirmed', 'complete', 'success', 'partial'])

  const hasRealRentPayment = (monthPays || []).some((p: any) => {
    const notes = String(p.notes || '').toUpperCase()
    return !notes.includes('WIFI') && num(p.amount) > 0
  })

  if (hasRealRentPayment) return

  const { data: bill } = await sb
    .from('bills')
    .select('*, bill_lines(*)')
    .eq('tenancy_account_id', account.id)
    .eq('billing_period', period)
    .maybeSingle()

  if (!bill) return

  const lines = (bill.bill_lines || []).filter(
    (l: any) => String(l.charge_type).toLowerCase() !== 'wifi'
  )
  if (!lines.length) return

  const periodDue = lines.reduce((s: number, l: any) => s + num(l.amount), 0)
  if (periodDue <= 0) return

  // Already correctly open with full outstanding
  const outstanding = lines.reduce(
    (s: number, l: any) => s + num(l.amount_outstanding ?? l.amount - l.amount_paid),
    0
  )
  if (bill.status !== 'paid' && outstanding >= periodDue - 0.01) return

  // Restore credit that was auto-applied to this bill
  const creditToRestore = num(bill.credit_applied)
  if (creditToRestore > 0) {
    await sb
      .from('tenancy_accounts')
      .update({
        credit_balance: num(account.credit_balance + creditToRestore),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
  }

  for (const line of bill.bill_lines || []) {
    if (String(line.charge_type).toLowerCase() === 'wifi') {
      await sb.from('bill_lines').delete().eq('id', line.id)
      continue
    }
    await sb
      .from('bill_lines')
      .update({
        amount_paid: 0,
        amount_outstanding: num(line.amount),
      })
      .eq('id', line.id)
  }

  await sb
    .from('bills')
    .update({
      subtotal: periodDue,
      credit_applied: 0,
      amount_due: periodDue,
      amount_paid: 0,
      status: 'open',
      paid_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bill.id)
}

/** Rebuild credit_balance from unique credit allocations minus bill credit_applied. */
async function recomputeCreditBalance(sb: Sb, accountId: string) {
  const { data: credits } = await sb
    .from('payment_allocations')
    .select('payment_id, amount')
    .eq('tenancy_account_id', accountId)
    .eq('allocation_type', 'credit')

  // One credit row per payment (keep first amount if duplicates exist)
  const byPayment = new Map<string, number>()
  for (const c of credits || []) {
    if (!byPayment.has(c.payment_id)) {
      byPayment.set(c.payment_id, num(c.amount))
    }
  }
  const creditIn = [...byPayment.values()].reduce((s, n) => s + n, 0)

  const { data: bills } = await sb
    .from('bills')
    .select('credit_applied')
    .eq('tenancy_account_id', accountId)

  const creditOut = (bills || []).reduce(
    (s: number, b: any) => s + num(b.credit_applied),
    0
  )

  const balance = Math.max(0, num(creditIn - creditOut))
  await sb
    .from('tenancy_accounts')
    .update({
      credit_balance: balance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}

/** Allocate confirmed payments that were never attached to the tenancy ledger. */
async function reconcileTenantPayments(sb: Sb, account: TenancyAccountRow) {
  const { data: payments } = await sb
    .from('payments')
    .select('id, amount, status, tenancy_account_id, notes, payment_month')
    .eq('tenant_id', account.tenant_id)
    .in('status', ['confirmed', 'complete', 'success', 'partial'])
    .order('created_at', { ascending: true })
    .limit(50)

  for (const p of payments || []) {
    const notes = String(p.notes || '').toUpperCase()
    if (notes.includes('WIFI')) continue

    const { count } = await sb
      .from('payment_allocations')
      .select('id', { count: 'exact', head: true })
      .eq('payment_id', p.id)

    if ((count || 0) > 0) continue

    try {
      if (p.payment_month) {
        await generateBillForPeriod(sb, account.id, p.payment_month)
      }
      await allocatePayment(sb, {
        paymentId: p.id,
        tenancyAccountId: account.id,
        amount: num(p.amount),
        billingPeriod: p.payment_month || undefined,
      })
    } catch (e: any) {
      console.warn('[reconcileTenantPayments]', p.id, e?.message)
    }
  }
}
