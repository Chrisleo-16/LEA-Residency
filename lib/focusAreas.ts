// Shared between the setup wizard (app/complete-setup) and Settings' menu
// customization card, and consumed by the Sidebar to decide which menu
// items to show a given landlord.

export interface FocusArea {
  id: string
  label: string
  description: string
  menuIds: string[]
}

export const FOCUS_AREAS: FocusArea[] = [
  {
    id: 'rent',
    label: 'Collect rent',
    description: 'Track payments and your rent ledger',
    menuIds: ['payments'],
  },
  {
    id: 'tenants',
    label: 'Find tenants',
    description: 'Matched tenant leads',
    menuIds: ['leads'],
  },
  {
    id: 'maintenance',
    label: 'Handle requests',
    description: 'Complaints and maintenance requests',
    menuIds: ['complaints', 'requests'],
  },
  {
    id: 'staff',
    label: 'Manage staff',
    description: 'Assign and track your team',
    menuIds: ['staff'],
  },
  {
    id: 'policy',
    label: 'Policies & docs',
    description: 'Rules, guidelines and announcements',
    menuIds: ['policy'],
  },
]

// Always visible regardless of what the landlord picked — core comms and
// their own LEA subscription, not a "focus area" choice.
export const ALWAYS_ON_MENU_IDS = ['chat', 'community', 'billing']

/**
 * Returns the set of sidebar menu ids a landlord should see, or null to mean
 * "show everything" (no focus areas chosen — legacy default / skipped setup).
 */
export function getVisibleMenuIds(focusAreas: string[] | null | undefined): Set<string> | null {
  if (!focusAreas || focusAreas.length === 0) return null

  const ids = new Set<string>(ALWAYS_ON_MENU_IDS)
  for (const areaId of focusAreas) {
    const area = FOCUS_AREAS.find((a) => a.id === areaId)
    area?.menuIds.forEach((id) => ids.add(id))
  }
  return ids
}
