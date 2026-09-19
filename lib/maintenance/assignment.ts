/**
 * Smart maintenance assignment — rule-based v1.
 * Maps issue category → staff specialty, prefers property-assigned + available staff.
 */

export type StaffSpecialty =
  | 'plumbing'
  | 'electrical'
  | 'carpentry'
  | 'painting'
  | 'hvac'
  | 'general'
  | 'cleaning'
  | 'pest_control'
  | 'landscaping'
  | 'security'
  | 'other'

export type IssueCategory =
  | 'plumbing'
  | 'electrical'
  | 'water'
  | 'garbage'
  | 'cleaning'
  | 'carpentry'
  | 'painting'
  | 'hvac'
  | 'pest_control'
  | 'landscaping'
  | 'security'
  | 'appliance'
  | 'structural'
  | 'general'
  | 'other'

export interface AssignableStaff {
  id: string
  first_name: string
  last_name: string
  phone: string
  whatsapp_number?: string | null
  specialty: string
  availability: string
  is_active: boolean
  landlord_block_id?: string | null
  rating?: number | null
  /** True if actively assigned to this property/tenant via staff_assignments */
  propertyMatched?: boolean
}

const CATEGORY_TO_SPECIALTIES: Record<string, StaffSpecialty[]> = {
  plumbing: ['plumbing', 'general'],
  electrical: ['electrical', 'general'],
  water: ['plumbing', 'general'],
  garbage: ['cleaning', 'general'],
  cleaning: ['cleaning', 'general'],
  carpentry: ['carpentry', 'general'],
  painting: ['painting', 'general'],
  hvac: ['hvac', 'general'],
  pest_control: ['pest_control', 'general'],
  landscaping: ['landscaping', 'general'],
  security: ['security', 'general'],
  appliance: ['electrical', 'general'],
  structural: ['carpentry', 'general'],
  general: ['general'],
  other: ['general', 'other'],
}

export const MAINTENANCE_CATEGORIES: { id: IssueCategory; label: string }[] = [
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'water', label: 'Water' },
  { id: 'garbage', label: 'Garbage / Cleaning' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'general', label: 'General Maintenance' },
  { id: 'security', label: 'Security' },
  { id: 'carpentry', label: 'Carpentry' },
  { id: 'painting', label: 'Painting' },
  { id: 'other', label: 'Other' },
]

export const MAINTENANCE_STATUSES = [
  { id: 'pending', label: 'Requested', alias: ['requested'] },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Resolved', alias: ['resolved'] },
  { id: 'closed', label: 'Closed' },
  { id: 'cancelled', label: 'Cancelled' },
] as const

export function normalizeStatus(status: string): string {
  if (status === 'requested') return 'pending'
  if (status === 'resolved') return 'completed'
  return status
}

export function statusLabel(status: string): string {
  const n = normalizeStatus(status)
  return MAINTENANCE_STATUSES.find((s) => s.id === n)?.label || status
}

export function specialtiesForCategory(category: string): StaffSpecialty[] {
  return CATEGORY_TO_SPECIALTIES[category] || ['general', 'other']
}

/**
 * Rank staff for a maintenance request.
 * Score: property match (100) + specialty exact (50) + specialty related (20)
 * + available (30) + rating*5 − busy (10)
 */
export function suggestStaffForRequest(
  category: string,
  staff: AssignableStaff[],
  opts?: { landlordBlockId?: string | null }
): AssignableStaff[] {
  const specialties = specialtiesForCategory(category)
  const primary = specialties[0]

  return staff
    .filter((s) => s.is_active)
    .map((s) => {
      let score = 0
      if (s.specialty === primary) score += 50
      else if (specialties.includes(s.specialty as StaffSpecialty)) score += 20
      else score -= 40

      if (s.propertyMatched) score += 100
      if (
        opts?.landlordBlockId &&
        s.landlord_block_id &&
        s.landlord_block_id === opts.landlordBlockId
      ) {
        score += 40
      }

      if (s.availability === 'available') score += 30
      else if (s.availability === 'busy') score -= 10
      else score -= 50

      score += (Number(s.rating) || 0) * 5
      return { staff: s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.staff)
}

export function pickBestStaff(
  category: string,
  staff: AssignableStaff[],
  opts?: { landlordBlockId?: string | null }
): AssignableStaff | null {
  return suggestStaffForRequest(category, staff, opts)[0] || null
}
