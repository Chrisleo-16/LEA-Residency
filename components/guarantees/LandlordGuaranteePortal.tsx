'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck, Loader2, Building2, AlertTriangle, Check, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fmtKES } from '@/components/developer-dashboard/helpers'
import {
  GUARANTEE_STATUS_LABEL,
  type RentGuarantee,
} from '@/lib/guarantees'
import { toast } from 'sonner'

interface PropertyRow {
  id: string
  property_name: string
  property_address: string
  guarantee_enabled?: boolean
  occupiedUnits?: number
  totalUnits?: number
  capacity?: number
}

export default function LandlordGuaranteePortal() {
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [guarantees, setGuarantees] = useState<RentGuarantee[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [propRes, gRes] = await Promise.all([
        fetch('/api/landlord/properties'),
        fetch('/api/guarantees'),
      ])
      const propJson = await propRes.json()
      const gJson = await gRes.json()
      if (propRes.ok && propJson.success) {
        setProperties(propJson.properties || [])
      }
      if (gRes.ok) {
        setGuarantees(gJson.guarantees || [])
      }
    } catch {
      toast.error('Could not load guarantee portfolio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleEnabled = async (prop: PropertyRow, enabled: boolean) => {
    setTogglingId(prop.id)
    try {
      const res = await fetch('/api/landlord/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: prop.id, guaranteeEnabled: enabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      toast.success(enabled ? 'Property opted into Rent Guarantee' : 'Guarantee disabled for property')
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  const fileClaim = async (g: RentGuarantee) => {
    setClaimingId(g.id)
    try {
      const res = await fetch(`/api/guarantees/${g.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'file_claim',
          claimAmount: g.monthly_rent,
          claimNotes: 'Landlord filed claim from Guarantee app',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Claim failed')
      toast.success('Claim filed — LEA ops will process payout')
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setClaimingId(null)
    }
  }

  const activeCovered = guarantees.filter((g) => g.status === 'active' || g.status === 'approved')
  const coveredRent = activeCovered.reduce((s, g) => s + Number(g.monthly_rent || 0), 0)
  const pendingClaims = guarantees.filter((g) => g.status === 'claimed' || g.status === 'defaulted')

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading guarantee portfolio…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Landlord Guarantee Portal</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Opt properties into LEA coverage, track underwritten tenants, and file claims — without touching your property management dashboard.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={load}>
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Covered units" value={String(activeCovered.length)} />
        <Stat label="Covered rent / mo" value={fmtKES(coveredRent)} />
        <Stat label="Open claims" value={String(pendingClaims.length)} className="col-span-2 sm:col-span-1" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="size-4 text-accent" />
          Properties eligible for guarantee
        </h2>
        <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {properties.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No properties yet. Create them in Property Management first, then return here to opt in.
            </p>
          ) : (
            properties.map((prop) => (
              <div key={prop.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{prop.property_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{prop.property_address}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {prop.occupiedUnits ?? 0}/{prop.totalUnits || prop.capacity || 0} occupied
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={prop.guarantee_enabled ? 'default' : 'outline'}
                  disabled={togglingId === prop.id}
                  onClick={() => toggleEnabled(prop, !prop.guarantee_enabled)}
                  className="h-9 gap-1.5 shrink-0"
                >
                  {togglingId === prop.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : prop.guarantee_enabled ? (
                    <Check className="size-3.5" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  {prop.guarantee_enabled ? 'Guarantee ON' : 'Enable Guarantee'}
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Coverage & claims</h2>
        {guarantees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No guarantee applications yet. Enable a property, then have tenants apply from the Guarantee app.
          </div>
        ) : (
          <div className="space-y-2">
            {guarantees.map((g) => (
              <div key={g.id} className="rounded-2xl border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {(g.tenant as { full_name?: string } | null)?.full_name || 'Tenant'} · {fmtKES(g.monthly_rent)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fee {fmtKES(g.monthly_fee_amount)} ({g.fee_percent}%)
                      {g.coverage_end ? ` · until ${g.coverage_end}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold rounded-full border px-2 py-0.5 bg-secondary text-muted-foreground shrink-0">
                    {GUARANTEE_STATUS_LABEL[g.status]}
                  </span>
                </div>
                {['active', 'defaulted'].includes(g.status) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={claimingId === g.id}
                    onClick={() => fileClaim(g)}
                    className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-700"
                  >
                    {claimingId === g.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <AlertTriangle className="size-3" />
                    )}
                    File unpaid-rent claim
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-bold mt-1 tracking-tight">{value}</p>
    </div>
  )
}
