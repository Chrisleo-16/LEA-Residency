export type GuaranteeStatus =
  | 'applied'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'defaulted'
  | 'claimed'
  | 'ended'

export const DEFAULT_FEE_PERCENT = 5
export const DEFAULT_COVERAGE_MONTHS = 12
export const MAX_MONTHLY_RENT_KES = 25000

export interface RentGuarantee {
  id: string
  tenant_id: string
  landlord_id: string
  property_id: string | null
  tenant_slot_id: string | null
  monthly_rent: number
  fee_percent: number
  monthly_fee_amount: number
  coverage_months: number
  status: GuaranteeStatus
  phone_number: string | null
  employer_name: string | null
  declared_income: number | null
  mpesa_statement_path: string | null
  tenant_notes: string | null
  ops_notes: string | null
  rejection_reason: string | null
  applied_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  activated_at: string | null
  coverage_start: string | null
  coverage_end: string | null
  claim_filed_at: string | null
  claim_amount: number | null
  claim_notes: string | null
  claim_resolved_at: string | null
  claim_payout_reference: string | null
  created_at: string
  updated_at: string
  // Joined fields (optional)
  tenant?: { full_name: string | null; email: string | null; phone_number?: string | null } | null
  landlord?: { full_name: string | null; email: string | null } | null
  property?: { property_name: string | null; property_address: string | null } | null
}

export function calcMonthlyFee(monthlyRent: number, feePercent = DEFAULT_FEE_PERCENT) {
  return Math.round(Number(monthlyRent) * (Number(feePercent) / 100))
}

export function isOpenGuaranteeStatus(status: GuaranteeStatus) {
  return ['applied', 'under_review', 'approved', 'active', 'defaulted', 'claimed'].includes(status)
}

export function isCoveredStatus(status: GuaranteeStatus) {
  return status === 'active' || status === 'approved'
}

export const GUARANTEE_STATUS_LABEL: Record<GuaranteeStatus, string> = {
  applied: 'Applied',
  under_review: 'Under review',
  approved: 'Approved',
  active: 'Active coverage',
  rejected: 'Rejected',
  defaulted: 'Default flagged',
  claimed: 'Claim filed',
  ended: 'Ended',
}
