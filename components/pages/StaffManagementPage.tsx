'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Phone,
  Mail,
  Users,
  Plus,
  Edit,
  Trash2,
  Clock,
  UserPlus,
  Link2Off,
  Building2,
  Loader2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { readJsonResponse } from '@/lib/api/readJsonResponse'

interface Staff {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  whatsapp_number?: string | null
  specialty: string
  company_name?: string
  experience_years?: number
  hourly_rate?: number
  availability: string
  rating?: number
  total_jobs?: number
  is_active: boolean
  notes?: string
  created_at: string
  assigned_tenants?: Array<{
    id: string
    tenant_id: string
    property_id?: string
    unit_id?: string
    assigned_at: string
    status: string
    profiles: {
      id: string
      full_name: string
      email: string
      phone: string
    }
  }>
  recent_assignments?: Array<{
    id: string
    title: string
    status: string
    created_at?: string
  }>
}

interface StaffManagementPageProps {
  user: any
}

const specialties = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'general', label: 'General Maintenance' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
]

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  whatsapp_number: '',
  specialty: '',
  company_name: '',
  experience_years: '',
  hourly_rate: '',
  availability: 'available',
  notes: '',
}

function availabilityTone(status: string) {
  if (status === 'available') return 'bg-emerald-50 text-emerald-800 border-emerald-100'
  if (status === 'busy') return 'bg-amber-50 text-amber-900 border-amber-100'
  return 'bg-muted text-muted-foreground border-border'
}

export default function StaffManagementPage({ user }: StaffManagementPageProps) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [availableTenants, setAvailableTenants] = useState<any[]>([])
  const [landlordBlockId, setLandlordBlockId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('all')
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'busy' | 'unavailable'>('all')
  const [formData, setFormData] = useState(emptyForm)
  const [assignmentData, setAssignmentData] = useState({
    staff_id: '',
    tenant_id: '',
    property_id: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchStaff()
      fetchTenants()
    }
  }, [user])

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (filterAvailability !== 'all' && s.availability !== filterAvailability) return false
      if (filterSpecialty !== 'all' && s.specialty !== filterSpecialty) return false
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(searchTerm) ||
        s.specialty.toLowerCase().includes(q)
      )
    })
  }, [staff, searchTerm, filterSpecialty, filterAvailability])

  const counts = useMemo(
    () => ({
      total: staff.length,
      available: staff.filter((s) => s.availability === 'available').length,
      busy: staff.filter((s) => s.availability === 'busy').length,
    }),
    [staff]
  )

  const fetchTenants = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, landlord_block_id')
        .eq('id', user?.id)
        .single()

      if (profile?.role !== 'landlord' || !profile.landlord_block_id) {
        setAvailableTenants([])
        return
      }

      setLandlordBlockId(profile.landlord_block_id)

      const { data: tenantSlots } = await supabase
        .from('tenant_slots')
        .select('tenant_id')
        .eq('landlord_block_id', profile.landlord_block_id)
        .not('tenant_id', 'is', null)

      const tenantIds = (tenantSlots || []).map((s: any) => s.tenant_id).filter(Boolean)
      if (!tenantIds.length) {
        setAvailableTenants([])
        return
      }

      const { data: tenantProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number, role')
        .in('id', tenantIds)
        .eq('role', 'tenant')
        .order('full_name', { ascending: true })

      setAvailableTenants(
        (tenantProfiles || []).map((p) => ({
          ...p,
          phone: p.phone_number || 'No phone',
        }))
      )
    } catch {
      setAvailableTenants([])
    }
  }

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const result = await fetch('/api/staff')
      const { ok, data, error } = await readJsonResponse<any>(result)
      if (!ok) throw new Error(error || 'Failed to load staff')

      const staffData: Staff[] = data.staff || []
      const { data: profileData } = await supabase
        .from('profiles')
        .select('landlord_block_id')
        .eq('id', user?.id)
        .single()

      const blockId = profileData?.landlord_block_id || landlordBlockId
      if (blockId) setLandlordBlockId(blockId)

      const staffWithAssignments = await Promise.all(
        staffData.map(async (member) => {
          try {
            const { data: assignmentData } = await supabase
              .from('staff_assignments')
              .select('id, tenant_id, property_id, unit_id, assigned_at, status')
              .eq('staff_id', member.id)
              .eq('status', 'active')

            const tenantIds = (assignmentData || []).map((a) => a.tenant_id)
            let profilesById: Record<string, any> = {}
            if (tenantIds.length) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone_number')
                .in('id', tenantIds)
              for (const p of profiles || []) profilesById[p.id] = p
            }

            const assigned_tenants = (assignmentData || []).map((item) => ({
              id: item.id,
              tenant_id: item.tenant_id,
              property_id: item.property_id,
              unit_id: item.unit_id,
              assigned_at: item.assigned_at,
              status: item.status,
              profiles: {
                id: item.tenant_id,
                full_name: profilesById[item.tenant_id]?.full_name || 'Tenant',
                email: profilesById[item.tenant_id]?.email || '',
                phone: profilesById[item.tenant_id]?.phone_number || '',
              },
            }))

            const { data: recent } = await supabase
              .from('maintenance_requests')
              .select('id, title, status, created_at')
              .eq('assigned_staff_id', member.id)
              .order('created_at', { ascending: false })
              .limit(3)

            return {
              ...member,
              assigned_tenants,
              recent_assignments: recent || [],
            }
          } catch {
            return { ...member, assigned_tenants: [], recent_assignments: [] }
          }
        })
      )

      setStaff(staffWithAssignments)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff')
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingStaff(null)
    setFormData(emptyForm)
    setIsAddDialogOpen(true)
  }

  const handleEdit = (member: Staff) => {
    setEditingStaff(member)
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone,
      whatsapp_number: member.whatsapp_number || member.phone || '',
      specialty: member.specialty,
      company_name: member.company_name || '',
      experience_years: member.experience_years?.toString() || '',
      hourly_rate: member.hourly_rate?.toString() || '',
      availability: member.availability || 'available',
      notes: member.notes || '',
    })
    setIsAddDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const submitData = {
        ...formData,
        whatsapp_number: formData.whatsapp_number || formData.phone,
        experience_years: formData.experience_years
          ? parseInt(formData.experience_years)
          : null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      }

      const response = await fetch('/api/staff', {
        method: editingStaff ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingStaff ? { staffId: editingStaff.id, ...submitData } : submitData
        ),
      })
      const { ok, error } = await readJsonResponse(response)
      if (!ok) throw new Error(error || 'Failed to save staff member')

      toast.success(editingStaff ? 'Staff updated' : 'Staff added')
      setIsAddDialogOpen(false)
      setEditingStaff(null)
      setFormData(emptyForm)
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save staff member')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this staff member?')) return
    try {
      const response = await fetch(`/api/staff?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const { ok, error } = await readJsonResponse(response)
      if (!ok) throw new Error(error || 'Failed to delete')
      toast.success('Staff deactivated')
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff')
    }
  }

  const handleAssign = async () => {
    if (!assignmentData.staff_id || !assignmentData.tenant_id) {
      toast.error('Select staff and tenant')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/staff-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData),
      })
      const { ok, error } = await readJsonResponse(response)
      if (!ok) throw new Error(error || 'Failed to assign')
      toast.success('Staff assigned to tenant')
      setIsAssignDialogOpen(false)
      setAssignmentData({ staff_id: '', tenant_id: '', property_id: '', notes: '' })
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign staff')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return
    try {
      const response = await fetch(
        `/api/staff-assignments?id=${encodeURIComponent(assignmentId)}`,
        { method: 'DELETE' }
      )
      const { ok, error } = await readJsonResponse(response)
      if (!ok) throw new Error(error || 'Failed to remove assignment')
      toast.success('Assignment removed')
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove assignment')
    }
  }

  const specialtyLabel = (v: string) =>
    specialties.find((s) => s.value === v)?.label || v

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header — matches Maintenance / Payments */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Staff & Services
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plumbers, electricians, cleaners and caretakers — ready to assign on
            maintenance requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={() => {
              setSelectedStaff(null)
              setAssignmentData({
                staff_id: '',
                tenant_id: '',
                property_id: '',
                notes: '',
              })
              setIsAssignDialogOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
          <Button onClick={openAdd} className="rounded-xl bg-accent text-accent-foreground gap-1.5">
            <Plus className="h-4 w-4" />
            Add staff
          </Button>
        </div>
      </div>

      {/* Quiet stats — no loud cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: counts.total },
          { label: 'Available', value: counts.available },
          { label: 'Busy', value: counts.busy },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-popover px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-0.5 text-xl font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Soft segmented filter — replaces red/green pills */}
      <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1">
        {(
          [
            ['all', `All (${counts.total})`],
            ['available', `Available (${counts.available})`],
            ['busy', `Busy (${counts.busy})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilterAvailability(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              filterAvailability === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + specialty */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, phone, or specialty…"
          className="rounded-xl bg-background h-11"
        />
        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
          <SelectTrigger className="rounded-xl h-11 sm:w-48">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialties</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Staff list */}
      {filteredStaff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">No staff yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Add your plumber, electrician, cleaner or caretaker so maintenance requests
            can be assigned without you being the middleman.
          </p>
          <Button onClick={openAdd} className="mt-4 rounded-xl gap-1.5">
            <Plus className="h-4 w-4" /> Add first staff member
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((member) => {
            const wa = (member.whatsapp_number || member.phone || '').replace(/\D/g, '')
            const waHref = wa
              ? `https://wa.me/${wa.replace(/^0/, '254')}`
              : null

            return (
              <div
                key={member.id}
                className="rounded-2xl border border-border bg-popover p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {member.first_name} {member.last_name}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${availabilityTone(
                          member.availability
                        )}`}
                      >
                        {member.availability}
                      </span>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {specialtyLabel(member.specialty)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {member.phone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {member.email}
                      </span>
                      {member.company_name && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {member.company_name}
                        </span>
                      )}
                      {member.hourly_rate != null && (
                        <span>KES {member.hourly_rate}/hr</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                    <a href={`tel:${member.phone}`}>
                      <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 gap-1"
                      onClick={() => {
                        setSelectedStaff(member)
                        setAssignmentData({
                          staff_id: member.id,
                          tenant_id: '',
                          property_id: '',
                          notes: '',
                        })
                        setIsAssignDialogOpen(true)
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Assign
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9"
                      onClick={() => handleEdit(member)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {member.notes && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">
                    {member.notes}
                  </p>
                )}

                {(member.assigned_tenants?.length || 0) > 0 && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Assigned tenants
                    </p>
                    {member.assigned_tenants!.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {a.profiles.full_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Since {new Date(a.assigned_at).toLocaleDateString('en-KE')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAssignment(a.id)}
                        >
                          <Link2Off className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {(member.recent_assignments?.length || 0) > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Recent jobs
                    </p>
                    {member.recent_assignments!.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="text-foreground font-medium">{job.title}</span>
                        <span className="capitalize inline-flex items-center gap-1">
                          {job.status === 'completed' && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          )}
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? 'Edit staff member' : 'Add staff member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">First name</Label>
                <Input
                  className="mt-1 rounded-xl"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last name</Label>
                <Input
                  className="mt-1 rounded-xl"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  className="mt-1 rounded-xl"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                <Input
                  className="mt-1 rounded-xl"
                  value={formData.whatsapp_number}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp_number: e.target.value })
                  }
                  placeholder="Defaults to phone"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                className="mt-1 rounded-xl"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Role / specialty</Label>
                <Select
                  value={formData.specialty}
                  onValueChange={(v) => setFormData({ ...formData, specialty: v })}
                  required
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Availability</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(v) => setFormData({ ...formData, availability: v })}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Company (optional)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                className="mt-1 rounded-xl"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Covers blocks A–C, evenings only…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingStaff ? 'Save' : 'Add staff'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign staff to a tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Staff member</Label>
              <Select
                value={assignmentData.staff_id}
                onValueChange={(v) =>
                  setAssignmentData({ ...assignmentData, staff_id: v })
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select staff…" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} · {specialtyLabel(s.specialty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tenant</Label>
              <Select
                value={assignmentData.tenant_id}
                onValueChange={(v) =>
                  setAssignmentData({ ...assignmentData, tenant_id: v })
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select tenant…" />
                </SelectTrigger>
                <SelectContent>
                  {availableTenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name || t.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
              <Textarea
                className="mt-1 rounded-xl"
                rows={2}
                value={assignmentData.notes}
                onChange={(e) =>
                  setAssignmentData({ ...assignmentData, notes: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="rounded-xl" onClick={handleAssign} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
