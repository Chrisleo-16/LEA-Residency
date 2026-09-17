import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { DEFAULT_COVERAGE_MONTHS } from '@/lib/guarantees'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body as { action?: string }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const service = serviceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const { data: guarantee, error: fetchError } = await service
      .from('rent_guarantees')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !guarantee) {
      return NextResponse.json({ error: 'Guarantee not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    let updatePayload: Record<string, unknown> = { updated_at: now }

    // ── Developer actions ──────────────────────────────────────────
    if (['approve', 'reject', 'activate', 'resolve_claim', 'end'].includes(action)) {
      if (profile?.role !== 'developer') {
        return NextResponse.json({ error: 'Only developers can perform this action' }, { status: 403 })
      }

      if (action === 'approve') {
        if (!['applied', 'under_review'].includes(guarantee.status)) {
          return NextResponse.json({ error: 'Can only approve pending applications' }, { status: 400 })
        }
        const start = new Date()
        const end = new Date(start)
        end.setMonth(end.getMonth() + (guarantee.coverage_months || DEFAULT_COVERAGE_MONTHS))
        updatePayload = {
          ...updatePayload,
          status: 'active',
          reviewed_at: now,
          reviewed_by: user.id,
          activated_at: now,
          coverage_start: start.toISOString().slice(0, 10),
          coverage_end: end.toISOString().slice(0, 10),
          ops_notes: body.opsNotes || guarantee.ops_notes,
        }
      }

      if (action === 'reject') {
        if (!['applied', 'under_review'].includes(guarantee.status)) {
          return NextResponse.json({ error: 'Can only reject pending applications' }, { status: 400 })
        }
        updatePayload = {
          ...updatePayload,
          status: 'rejected',
          reviewed_at: now,
          reviewed_by: user.id,
          rejection_reason: body.rejectionReason || 'Does not meet underwriting criteria',
          ops_notes: body.opsNotes || guarantee.ops_notes,
        }
      }

      if (action === 'activate') {
        if (guarantee.status !== 'approved') {
          return NextResponse.json({ error: 'Can only activate approved guarantees' }, { status: 400 })
        }
        const start = new Date()
        const end = new Date(start)
        end.setMonth(end.getMonth() + (guarantee.coverage_months || DEFAULT_COVERAGE_MONTHS))
        updatePayload = {
          ...updatePayload,
          status: 'active',
          activated_at: now,
          coverage_start: start.toISOString().slice(0, 10),
          coverage_end: end.toISOString().slice(0, 10),
        }
      }

      if (action === 'resolve_claim') {
        if (guarantee.status !== 'claimed') {
          return NextResponse.json({ error: 'No open claim to resolve' }, { status: 400 })
        }
        updatePayload = {
          ...updatePayload,
          status: body.markEnded ? 'ended' : 'active',
          claim_resolved_at: now,
          claim_payout_reference: body.payoutReference || null,
          ops_notes: body.opsNotes || guarantee.ops_notes,
        }
      }

      if (action === 'end') {
        updatePayload = {
          ...updatePayload,
          status: 'ended',
          ops_notes: body.opsNotes || guarantee.ops_notes,
        }
      }
    }

    // ── Landlord claim ─────────────────────────────────────────────
    else if (action === 'file_claim') {
      if (guarantee.landlord_id !== user.id && profile?.role !== 'developer') {
        return NextResponse.json({ error: 'Only the landlord can file a claim' }, { status: 403 })
      }
      if (!['active', 'defaulted'].includes(guarantee.status)) {
        return NextResponse.json(
          { error: 'Claims can only be filed on active or defaulted guarantees' },
          { status: 400 },
        )
      }
      const claimAmount = Number(body.claimAmount || guarantee.monthly_rent)
      updatePayload = {
        ...updatePayload,
        status: 'claimed',
        claim_filed_at: now,
        claim_amount: claimAmount,
        claim_notes: body.claimNotes || null,
      }
    }

    // ── Landlord / ops mark default ────────────────────────────────
    else if (action === 'flag_default') {
      if (guarantee.landlord_id !== user.id && profile?.role !== 'developer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (guarantee.status !== 'active') {
        return NextResponse.json({ error: 'Only active guarantees can be flagged' }, { status: 400 })
      }
      updatePayload = {
        ...updatePayload,
        status: 'defaulted',
        ops_notes: body.opsNotes || guarantee.ops_notes,
      }
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const { data: updated, error: updateError } = await service
      .from('rent_guarantees')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update guarantee' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, guarantee: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
