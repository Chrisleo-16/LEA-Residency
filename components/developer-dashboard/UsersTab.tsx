'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Minus, Trash2, Users2, Building2, Home, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatBar } from './StatCard'
import { DataRow, EmptyRow, SkeletonRows } from './DataRow'
import { DeleteUserDialog, type DeletableUser } from './DeleteUserDialog'
import { fmt, fmtKES, fmtTime, statusBadgeClass } from './helpers'

const supabase = createClient()

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  phone_number: string | null
  avatar_url: string | null
  created_at: string
  blockchain_verified: boolean
}

interface LandlordBlockRow {
  id: string
  landlord_name: string
  landlord_code: string
  block_hash: string | null
  property_capacity: number
  property_used: number
  is_active: boolean
}

interface RentSettingRow {
  id: string
  tenant_id: string
  unit_number: string | null
  monthly_amount: number | null
}

interface UsersTabProps {
  refreshKey: number
}

export function UsersTab({ refreshKey }: UsersTabProps) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [blocks, setBlocks] = useState<LandlordBlockRow[]>([])
  const [rentSettings, setRentSettings] = useState<RentSettingRow[]>([])
  const [counts, setCounts] = useState({ total: 0, landlords: 0, tenants: 0, verified: 0 })
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeletableUser | null>(null)
  const [localRefresh, setLocalRefresh] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [profilesRes, allProfilesRes, blocksRes, rentRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, phone_number, avatar_url, created_at, blockchain_verified')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('profiles').select('role, blockchain_verified'),
        supabase
          .from('landlord_blocks')
          .select('id, landlord_name, landlord_code, block_hash, property_capacity, property_used, is_active'),
        supabase.from('rent_settings').select('id, tenant_id, unit_number, monthly_amount'),
      ])
      if (profilesRes.error) throw profilesRes.error
      if (allProfilesRes.error) throw allProfilesRes.error
      if (blocksRes.error) throw blocksRes.error
      if (rentRes.error) throw rentRes.error

      const all = allProfilesRes.data || []
      setUsers(profilesRes.data || [])
      setBlocks(blocksRes.data || [])
      setRentSettings(rentRes.data || [])
      setCounts({
        total: all.length,
        landlords: all.filter((p: any) => p.role === 'landlord').length,
        tenants: all.filter((p: any) => p.role === 'tenant').length,
        verified: all.filter((p: any) => p.blockchain_verified).length,
      })
    } catch (err: any) {
      toast.error('Failed to load users', { description: err?.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey, localRefresh])

  return (
    <div className="space-y-6">
      <StatBar
        items={[
          { label: 'Total Accounts', value: loading ? '—' : fmt(counts.total), icon: Users2, tone: 'purple' },
          { label: 'Landlords', value: loading ? '—' : fmt(counts.landlords), icon: Building2, tone: 'blue' },
          { label: 'Tenants', value: loading ? '—' : fmt(counts.tenants), icon: Home, tone: 'teal' },
          { label: 'Blockchain Verified', value: loading ? '—' : fmt(counts.verified), icon: ShieldCheck, tone: 'green' },
        ]}
        loading={loading}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Recent Users</div>
        <div>
          {loading ? (
            <SkeletonRows />
          ) : users.length === 0 ? (
            <EmptyRow>No users yet</EmptyRow>
          ) : (
            users.map((u) => (
              <DataRow
                key={u.id}
                avatar={
                  u.avatar_url ? (
                    <img src={u.avatar_url} className="size-8 shrink-0 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold">
                      {(u.full_name || u.email || '?')[0]?.toUpperCase()}
                    </div>
                  )
                }
                primary={u.full_name || '—'}
                secondary={u.email}
                fields={[
                  { label: 'Role', value: <Badge variant="outline" className="capitalize">{u.role || '—'}</Badge> },
                  { label: 'Phone', value: u.phone_number || '—', mono: true },
                  { label: 'Joined', value: fmtTime(u.created_at) },
                ]}
                status={
                  u.blockchain_verified ? (
                    <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Minus className="size-4 text-muted-foreground/40" />
                  )
                }
                actions={
                  u.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete user"
                      onClick={() => setDeleteTarget({ id: u.id, full_name: u.full_name, email: u.email, role: u.role })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )
                }
              />
            ))
          )}
        </div>
      </Card>

      {blocks.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Landlord Blocks</div>
          <div>
            {blocks.map((b) => {
              const occupancy = b.property_capacity > 0 ? Math.round((b.property_used / b.property_capacity) * 100) : 0
              return (
                <DataRow
                  key={b.id}
                  primary={b.landlord_name}
                  secondary={`Code: ${b.landlord_code}${b.block_hash ? ` · #${b.block_hash.slice(0, 16)}…` : ''}`}
                  fields={[
                    {
                      label: 'Occupancy',
                      value: (
                        <div className="flex w-28 items-center gap-2">
                          <Progress value={occupancy} className="h-1.5 bg-primary/10 [&>div]:bg-teal-500" />
                          <span className="w-16 shrink-0 text-xs">{b.property_used}/{b.property_capacity}</span>
                        </div>
                      ),
                    },
                  ]}
                  status={
                    <Badge variant="outline" className={statusBadgeClass(b.is_active ? 'active' : 'inactive')}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                />
              )
            })}
          </div>
        </Card>
      )}

      {rentSettings.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Rent Settings</div>
          <div>
            {rentSettings.map((r) => (
              <DataRow
                key={r.id}
                primary={r.unit_number || '—'}
                secondary={`Tenant: ${r.tenant_id.slice(0, 8)}…`}
                fields={[{ label: 'Monthly Rent', value: r.monthly_amount ? fmtKES(r.monthly_amount) : '—' }]}
              />
            ))}
          </div>
        </Card>
      )}

      <DeleteUserDialog
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => setLocalRefresh((n) => n + 1)}
      />
    </div>
  )
}
