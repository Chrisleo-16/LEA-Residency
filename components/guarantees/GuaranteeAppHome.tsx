'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import GuaranteeAppShell from '@/components/guarantees/GuaranteeAppShell'
import LandlordGuaranteePortal from '@/components/guarantees/LandlordGuaranteePortal'
import TenantGuaranteeCard from '@/components/guarantees/TenantGuaranteeCard'
import { GuaranteesTab } from '@/components/developer-dashboard/GuaranteesTab'

export default function GuaranteeAppHome() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [monthlyRent, setMonthlyRent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login?next=/guarantee')
        return
      }

      setUserId(session.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      const userRole = profile?.role || null
      setRole(userRole)

      if (userRole === 'tenant') {
        const { data: rent } = await supabase
          .from('rent_settings')
          .select('monthly_amount')
          .eq('tenant_id', session.user.id)
          .maybeSingle()
        setMonthlyRent(rent?.monthly_amount != null ? Number(rent.monthly_amount) : null)
      }

      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <GuaranteeAppShell role={role}>
      {role === 'developer' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Underwriting Console</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manual review queue for the rent-guarantee pilot. Property Management stays untouched.
            </p>
          </div>
          <GuaranteesTab />
        </div>
      )}

      {role === 'landlord' && <LandlordGuaranteePortal />}

      {role === 'tenant' && userId && (
        <div className="space-y-6 max-w-xl">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your Rent Guarantee</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Apply here for LEA coverage. This is separate from your rent ledger and chat in Property Management.
            </p>
          </div>
          <TenantGuaranteeCard userId={userId} monthlyRent={monthlyRent} />
        </div>
      )}

      {!role && (
        <div className="rounded-2xl border border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Your account needs a role before using Rent Guarantee.</p>
          <button
            type="button"
            className="text-sm font-semibold text-accent underline"
            onClick={() => router.push('/select-role')}
          >
            Choose role
          </button>
        </div>
      )}
    </GuaranteeAppShell>
  )
}
