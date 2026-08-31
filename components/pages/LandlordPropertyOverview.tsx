'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import {
  Building2,
  Home,
  Users,
  Search,
  Plus,
  TrendingUp,
  ShieldCheck,
  Phone,
  Mail,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Newspaper,
  Calendar,
  Layers,
  ChevronDown,
  X,
  CreditCard,
  AlertTriangle,
  ArrowRightLeft,
  Edit3,
  MapPin,
  Sparkles,
  Share2,
  MessageCircle,
  Settings2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatBar } from '@/components/developer-dashboard/StatCard'
import { DonutBreakdown } from '@/components/developer-dashboard/DonutBreakdown'
import { SkeletonRows } from '@/components/developer-dashboard/DataRow'
import { fmt, fmtKES, timeAgo } from '@/components/developer-dashboard/helpers'
import { toast } from 'sonner'

interface DashboardProps {
  user: User | null
  onNavigateTab?: (tab: string) => void
}

interface PropertyItem {
  id: string
  landlord_block_id: string
  property_name: string
  property_address: string
  capacity: number
  used: number
  landlord_code?: string
  totalUnits?: number
  occupiedUnits?: number
  slots?: any[]
}

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  snippet: string
  publishedAt: string
  category: string
  tag: string
}

// Kenyan Counties & Popular Real Estate Neighborhoods / Towns
const KENYA_COUNTIES = [
  'Nairobi',
  'Kiambu',
  'Machakos',
  'Kajiado',
  'Mombasa',
  'Nakuru',
  'Kisumu',
  'Uasin Gishu (Eldoret)',
  'Kilifi',
  'Nyeri',
  'Laikipia (Nanyuki)',
  'Meru',
  'Kakamega',
] as const

const KENYA_LOCATIONS_BY_COUNTY: Record<string, string[]> = {
  Nairobi: [
    'Kilimani',
    'Kileleshwa',
    'Westlands',
    'Lavington',
    'Parklands',
    'South B',
    'South C',
    'Roysambu',
    'Kahawa West / Wendani',
    'Ngara / Pangani',
    'Karen',
    'Runda',
    'Langata / Nairobi West',
    'Kasarani',
    'Embakasi / Fedha',
    'Donholm / Buruburu',
    'Upper Hill',
    'CBD / Central',
  ],
  Kiambu: [
    'Ruaka',
    'Thika Town',
    'Kikuyu',
    'Juja',
    'Ruiru',
    'Kiambu Town',
    'Banana / Karuri',
    'Limuru',
    'Kahawa Sukari',
    'Tatu City / Oaklands',
  ],
  Machakos: [
    'Syokimau',
    'Athi River / Mavoko',
    'Mlolongo',
    'Machakos Town',
    'Kitengela (Machakos side)',
  ],
  Kajiado: [
    'Kitengela',
    'Ongata Rongai',
    'Ngong',
    'Kiserian',
  ],
  Mombasa: [
    'Nyali',
    'Bamburi',
    'Shanzu',
    'Mtwapa (Border)',
    'Tudor',
    'Kizingo',
    'Diani / South Coast',
  ],
  Nakuru: [
    'Nakuru CBD / Milimani',
    'Naka',
    'Section 58',
    'Lanet',
    'Naivasha',
  ],
  Kisumu: [
    'Milimani, Kisumu',
    'Riat Hills',
    'Tom Mboya',
    'Mamboleo',
    'Kondele',
  ],
  'Uasin Gishu (Eldoret)': [
    'Elgon View',
    'Eldoret CBD',
    'Kapsoya',
    'Pioneer',
  ],
  Kilifi: [
    'Mtwapa',
    'Vipingo',
    'Kilifi Town',
    'Malindi',
    'Watamu',
  ],
  Nyeri: ['Nyeri Town', 'Ring Road', 'Skuta'],
  'Laikipia (Nanyuki)': ['Nanyuki Town', 'Muthaiga Nanyuki', 'Equator'],
  Meru: ['Meru CBD', 'Makutano', 'Milimani Meru'],
  Kakamega: ['Kakamega CBD', 'Amalemba', 'Lurambi', 'Kefinco'],
}

export default function LandlordPropertyOverview({ user, onNavigateTab }: DashboardProps) {
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [allSlots, setAllSlots] = useState<any[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsPage, setNewsPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)

  // Filters
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all')
  const [unitStatusFilter, setUnitStatusFilter] = useState<'all' | 'occupied' | 'vacant'>('all')
  const [unitSearchQuery, setUnitSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Add Property Modal State
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [newPropertyName, setNewPropertyName] = useState('')
  const [newPropertyCounty, setNewPropertyCounty] = useState<string>('Nairobi')
  const [newPropertyArea, setNewPropertyArea] = useState<string>('Kilimani')
  const [newPropertyStreet, setNewPropertyStreet] = useState('')
  const [isCustomArea, setIsCustomArea] = useState(false)
  const [customAreaName, setCustomAreaName] = useState('')
  const [newPropertyUnits, setNewPropertyUnits] = useState('6')
  const [isSubmittingProperty, setIsSubmittingProperty] = useState(false)

  // Edit Property Modal State
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null)
  const [editPropName, setEditPropName] = useState('')
  const [editPropAddress, setEditPropAddress] = useState('')
  const [editPropUnits, setEditPropUnits] = useState('')
  const [isSavingProperty, setIsSavingProperty] = useState(false)

  // Edit Tenant / Move Property Modal State
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRentAmount, setEditRentAmount] = useState('')
  const [editUnitNumber, setEditUnitNumber] = useState('')
  const [editTargetPropertyId, setEditTargetPropertyId] = useState('')
  const [isSavingTenant, setIsSavingTenant] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/landlord/properties')
      const json = await res.json()
      if (res.ok && json.success) {
        setProperties(json.properties || [])
        setAllSlots(json.allSlots || [])
      }
    } catch (err: any) {
      console.error('Failed to load properties dashboard:', err)
      toast.error('Could not load properties data')
    } finally {
      setLoading(false)
    }
  }

  const loadNews = async () => {
    try {
      setNewsLoading(true)
      const res = await fetch('/api/news/kenya-real-estate')
      const json = await res.json()
      if (json.success && Array.isArray(json.news)) {
        setNews(json.news)
        setNewsPage(1)
      }
    } catch (err) {
      console.error('Failed to load real estate news:', err)
    } finally {
      setNewsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
      loadNews()
    }
  }, [user])

  const handleCountyChange = (county: string) => {
    setNewPropertyCounty(county)
    const areas = KENYA_LOCATIONS_BY_COUNTY[county] || []
    if (areas.length > 0) {
      setNewPropertyArea(areas[0])
      setIsCustomArea(false)
    } else {
      setIsCustomArea(true)
    }
  }

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedArea = isCustomArea ? customAreaName.trim() : newPropertyArea
    if (!newPropertyName.trim() || !selectedArea || !newPropertyUnits) {
      toast.error('Please enter property name, Kenyan location, and unit count')
      return
    }

    const fullAddress = newPropertyStreet.trim()
      ? `${newPropertyStreet.trim()}, ${selectedArea}, ${newPropertyCounty}, Kenya`
      : `${selectedArea}, ${newPropertyCounty}, Kenya`

    try {
      setIsSubmittingProperty(true)
      const res = await fetch('/api/landlord/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName: newPropertyName.trim(),
          propertyAddress: fullAddress,
          totalUnits: newPropertyUnits,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create property')
      }

      toast.success('Property registered with dedicated units!')
      setShowAddPropertyModal(false)
      setNewPropertyName('')
      setNewPropertyCounty('Nairobi')
      setNewPropertyArea('Kilimani')
      setNewPropertyStreet('')
      setIsCustomArea(false)
      setCustomAreaName('')
      setNewPropertyUnits('6')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error creating property')
    } finally {
      setIsSubmittingProperty(false)
    }
  }

  // Open Property Editor Modal
  const handleOpenEditPropertyModal = (prop: PropertyItem) => {
    setEditingProperty(prop)
    setEditPropName(prop.property_name)
    setEditPropAddress(prop.property_address)
    setEditPropUnits(String(prop.totalUnits || prop.capacity || 0))
  }

  // Save Property Updates (PATCH)
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProperty) return

    if (!editPropName.trim() || !editPropAddress.trim() || !editPropUnits) {
      toast.error('Please provide name, address, and total units')
      return
    }

    try {
      setIsSavingProperty(true)
      const res = await fetch('/api/landlord/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: editingProperty.id,
          propertyName: editPropName.trim(),
          propertyAddress: editPropAddress.trim(),
          totalUnits: parseInt(editPropUnits, 10),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update property')
      }

      toast.success('Property details and unit slots updated!')
      setEditingProperty(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error updating property')
    } finally {
      setIsSavingProperty(false)
    }
  }

  // 1-Click WhatsApp Property Invite
  const handleSharePropertyWhatsApp = (prop: PropertyItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://learesidency.com'
    const joinUrl = `${origin}/join?ref=${prop.landlord_block_id}`
    const message = `Hi! Welcome to ${prop.property_name}. Access zero-deposit rent guarantee, M-Pesa receipts, and our tenant portal directly here: ${joinUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  // Copy Direct Property Join Link
  const handleCopyPropertyLink = (prop: PropertyItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://learesidency.com'
    const joinUrl = `${origin}/join?ref=${prop.landlord_block_id}`
    navigator.clipboard.writeText(joinUrl)
    toast.success(`Copied invite link for ${prop.property_name}!`)
  }

  // Open unit editor and populate current fields
  const handleOpenUnitModal = (slot: any) => {
    setSelectedUnit(slot)
    if (slot.is_occupied && slot.tenant) {
      setEditFullName(slot.tenant.full_name || '')
      setEditPhone(slot.tenant.phone_number || '')
      setEditRentAmount(String(slot.rent_setting?.monthly_amount || slot.monthly_rent || ''))
      setEditUnitNumber(slot.rent_setting?.unit_number || `Unit ${slot.slot_number}`)
      
      const currentProp = properties.find((p) => p.landlord_block_id === slot.landlord_block_id)
      setEditTargetPropertyId(currentProp?.id || '')
    } else {
      setEditRentAmount(String(slot.monthly_rent || ''))
      setEditUnitNumber(`Unit ${slot.slot_number}`)
    }
  }

  // Save Tenant Details & Property Transfer
  const handleSaveTenantDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnit) return

    try {
      setIsSavingTenant(true)
      const currentProp = properties.find((p) => p.landlord_block_id === selectedUnit.landlord_block_id)
      const isSwitchingProperty = editTargetPropertyId && editTargetPropertyId !== currentProp?.id

      const res = await fetch('/api/landlord/tenants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedUnit.tenant?.id || selectedUnit.tenant_id,
          currentSlotId: selectedUnit.id,
          fullName: editFullName,
          phoneNumber: editPhone,
          monthlyRent: editRentAmount ? parseFloat(editRentAmount) : 0,
          unitNumber: editUnitNumber,
          targetPropertyId: isSwitchingProperty ? editTargetPropertyId : undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update tenant details')
      }

      toast.success(
        isSwitchingProperty
          ? 'Tenant successfully switched to new property!'
          : 'Tenant details updated successfully!'
      )

      setSelectedUnit(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error updating tenant details')
    } finally {
      setIsSavingTenant(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    toast.success('Copied invite code to clipboard')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Calculated aggregated portfolio metrics
  const totalPropertiesCount = properties.length
  const totalUnitsAcrossAll = properties.reduce((acc, p) => acc + (p.totalUnits || p.capacity || 0), 0)
  const totalOccupiedUnits = properties.reduce((acc, p) => acc + (p.occupiedUnits || 0), 0)
  const totalVacantUnits = Math.max(0, totalUnitsAcrossAll - totalOccupiedUnits)
  const occupancyRate = totalUnitsAcrossAll > 0 ? Math.round((totalOccupiedUnits / totalUnitsAcrossAll) * 100) : 0

  const totalMonthlyGuaranteedInflow = useMemo(() => {
    return allSlots
      .filter((s) => s.is_occupied && s.tenant_id)
      .reduce((sum, s) => {
        const amt = s.rent_setting?.monthly_amount || s.monthly_rent || 0
        return sum + Number(amt)
      }, 0)
  }, [allSlots])

  // Filtered units list
  const displayUnits = useMemo(() => {
    let list = allSlots
    if (selectedPropertyFilter !== 'all') {
      const prop = properties.find((p) => p.id === selectedPropertyFilter)
      if (prop) {
        list = list.filter((s) => s.landlord_block_id === prop.landlord_block_id)
      }
    }

    if (unitStatusFilter === 'occupied') {
      list = list.filter((s) => s.is_occupied && s.tenant_id)
    } else if (unitStatusFilter === 'vacant') {
      list = list.filter((s) => !(s.is_occupied && s.tenant_id))
    }

    if (unitSearchQuery.trim()) {
      const q = unitSearchQuery.toLowerCase()
      list = list.filter((slot) => {
        const unitNum = (slot.rent_setting?.unit_number || `Unit ${slot.slot_number}`).toLowerCase()
        const tenantName = (slot.tenant?.full_name || '').toLowerCase()
        const tenantEmail = (slot.tenant?.email || '').toLowerCase()
        const tenantPhone = (slot.tenant?.phone_number || '').toLowerCase()
        const code = (slot.tenant_code || '').toLowerCase()
        const prop = properties.find((p) => p.landlord_block_id === slot.landlord_block_id)
        const propName = (prop?.property_name || '').toLowerCase()
        return (
          unitNum.includes(q) ||
          tenantName.includes(q) ||
          tenantEmail.includes(q) ||
          tenantPhone.includes(q) ||
          code.includes(q) ||
          propName.includes(q)
        )
      })
    }
    return list
  }, [allSlots, selectedPropertyFilter, unitStatusFilter, properties, unitSearchQuery])

  const NEWS_PER_PAGE = 6
  const totalNewsPages = Math.max(1, Math.ceil(news.length / NEWS_PER_PAGE))
  const paginatedNews = useMemo(() => {
    const start = (newsPage - 1) * NEWS_PER_PAGE
    return news.slice(start, start + NEWS_PER_PAGE)
  }, [news, newsPage])

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-24">
      {/* ── TOP STATBAR (DEVELOPER OVERVIEW TAB DESIGN) ── */}
      <StatBar
        loading={loading}
        items={[
          { label: 'Properties', value: loading ? '—' : fmt(totalPropertiesCount), icon: Building2, tone: 'purple' },
          { label: 'Total Units', value: loading ? '—' : fmt(totalUnitsAcrossAll), icon: Layers, tone: 'blue' },
          { label: 'Occupied Units', value: loading ? '—' : fmt(totalOccupiedUnits), icon: Home, tone: 'teal' },
          { label: 'Vacant Units', value: loading ? '—' : fmt(totalVacantUnits), icon: Users, tone: totalVacantUnits > 0 ? 'amber' : 'slate' },
          {
            label: 'Guaranteed Rent',
            value: loading ? '—' : fmtKES(totalMonthlyGuaranteedInflow),
            icon: TrendingUp,
            tone: 'green',
          },
          {
            label: 'Occupancy Rate',
            value: loading ? '—' : `${occupancyRate}%`,
            icon: ShieldCheck,
            tone: occupancyRate >= 80 ? 'green' : 'amber',
          },
        ]}
      />

      {/* ── ACTIONS & PROPERTY SELECTOR ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          {/* <div className="size-2 rounded-full bg-emerald-500 animate-pulse" /> */}
          <span className="text-xs sm:text-sm font-semibold text-foreground">Multi-Property Portfolio & Tenant Management</span>
          <span className="text-[11px] sm:text-xs text-muted-foreground hidden sm:inline">
            • {properties.length} registered propert{properties.length === 1 ? 'y' : 'ies'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Property Selector */}
          {properties.length > 0 && (
            <div className="relative flex-1 min-w-[140px] sm:min-w-[190px]">
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-xs font-semibold text-foreground outline-none transition-all hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-accent cursor-pointer truncate"
              >
                <option value="all"> All Properties ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_name} ({p.totalUnits || p.capacity} Units)
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            </div>
          )}

          {/* Add Property Button */}
          <Button
            size="sm"
            onClick={() => setShowAddPropertyModal(true)}
            className="h-8 px-2.5 sm:px-3 gap-1 sm:gap-1.5 text-xs font-semibold shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Add Property</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadData()
              loadNews()
            }}
            className="h-8 px-2.5 sm:px-3 gap-1 text-xs shrink-0"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── 2-COLUMN SECTION: BREAKDOWN CHART & UNITS LIST ── */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-12 items-start w-full min-w-0">
        {/* Left: Donut Breakdown & Registered Properties */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5 w-full min-w-0">
          <DonutBreakdown
            title="Portfolio Occupancy Breakdown"
            description="Real-time tenant distribution across all properties"
            centerValue={`${occupancyRate}%`}
            centerLabel="Occupied"
            segments={[
              { label: 'Occupied Units', value: totalOccupiedUnits, colorHex: '#10b981' },
              { label: 'Vacant Units', value: totalVacantUnits, colorHex: '#f59e0b' },
            ]}
            highlight={{
              icon: <ShieldCheck className="size-4 text-emerald-500 shrink-0" />,
              title: '12-Month Rent Guarantee',
              description: `${totalOccupiedUnits} occupied units backed by automated M-Pesa payouts.`,
            }}
          />

          {/* Property Block Codes Card */}
          <Card className="gap-0 overflow-hidden py-0 shadow-xs w-full min-w-0">
            <div className="border-b border-border px-3.5 sm:px-4 py-3 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-foreground">Registered Properties</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium">
                {properties.length} total
              </span>
            </div>
            <div className="divide-y divide-border">
              {properties.map((prop) => {
                const propSlots = allSlots.filter((s) => s.landlord_block_id === prop.landlord_block_id)
                const occupied = propSlots.filter((s) => s.is_occupied && s.tenant_id).length
                const total = propSlots.length || prop.capacity || 0
                return (
                  <div key={prop.id} className="p-3 sm:p-3.5 hover:bg-muted/30 transition-colors space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate">{prop.property_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{prop.property_address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block">
                          {occupied}/{total} Units
                        </span>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{prop.landlord_code || 'LEA'}</p>
                      </div>
                    </div>

                    {/* Quick Action & 1-Click WhatsApp Share */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-border/40 sm:flex sm:flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditPropertyModal(prop)}
                        className="h-7 px-2 text-xs gap-1 text-foreground/80 hover:text-muted bg-secondary/40 border-border w-full sm:w-auto"
                        title="Edit Property Details & Capacity"
                      >
                        <Edit3 className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">Edit</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSharePropertyWhatsApp(prop)}
                        className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 border-emerald-500/20 w-full sm:w-auto"
                        title="Share WhatsApp Invite Link"
                      >
                        <MessageCircle className="size-3 text-emerald-600 shrink-0" />
                        <span className="truncate">WhatsApp</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPropertyLink(prop)}
                        className="h-7 px-2 text-xs gap-1 text-foreground/80 hover:text-muted bg-secondary/40 border-border w-full sm:w-auto"
                        title="Copy direct invite link"
                      >
                        <Copy className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">Link</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right: Units & Tenant Slots Explorer */}
        <div className="lg:col-span-7 w-full min-w-0">
          <Card className="gap-0 overflow-hidden py-0 shadow-xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-3.5 sm:px-4 py-3">
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Home className="size-4 text-accent" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground">Units & Tenant Slots</span>
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium">
                  {displayUnits.length} units
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Status Toggle filter */}
                <div className="grid grid-cols-3 sm:flex rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
                  <button
                    onClick={() => setUnitStatusFilter('all')}
                    className={`py-1 sm:px-2 rounded-md font-medium text-center transition-all ${unitStatusFilter === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setUnitStatusFilter('occupied')}
                    className={`py-1 sm:px-2 rounded-md font-medium text-center transition-all ${unitStatusFilter === 'occupied' ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Occupied
                  </button>
                  <button
                    onClick={() => setUnitStatusFilter('vacant')}
                    className={`py-1 sm:px-2 rounded-md font-medium text-center transition-all ${unitStatusFilter === 'vacant' ? 'bg-card text-amber-600 dark:text-amber-400 shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Vacant
                  </button>
                </div>

                <div className="relative w-full sm:w-48">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={unitSearchQuery}
                    onChange={(e) => setUnitSearchQuery(e.target.value)}
                    placeholder="Search unit, tenant..."
                    className="h-8 w-full rounded-lg border border-border bg-muted/40 pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/50"
                  />
                </div>
              </div>
            </div>

            {/* ── MOBILE VIEW: Touch Cards (< 640px) ── */}
            <div className="sm:hidden divide-y divide-border max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="divide-y divide-border"><SkeletonRows count={4} /></div>
              ) : displayUnits.length === 0 ? (
                <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                  No units found matching your filter criteria.
                </div>
              ) : (
                displayUnits.map((slot) => {
                  const unitLabel = slot.rent_setting?.unit_number || `Unit ${slot.slot_number}`
                  const rentAmount = slot.rent_setting?.monthly_amount || slot.monthly_rent || 0
                  const matchedProp = properties.find((p) => p.landlord_block_id === slot.landlord_block_id)
                  const isSlotOccupied = Boolean(slot.is_occupied && slot.tenant_id && slot.tenant)

                  return (
                    <div key={slot.id} className="p-3.5 space-y-2.5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <span>{unitLabel}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              • {matchedProp?.property_name || 'Property'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${
                            isSlotOccupied
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isSlotOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>

                      {isSlotOccupied ? (
                        <div className="flex items-center justify-between text-xs bg-muted/30 rounded-xl p-2.5">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-semibold text-foreground truncate">{slot.tenant.full_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {slot.tenant.phone_number || slot.tenant.email || 'No phone'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-foreground">{rentAmount > 0 ? fmtKES(rentAmount) : '—'}</p>
                            <p className="text-[10px] text-muted-foreground">monthly rent</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs bg-muted/30 rounded-xl p-2.5">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Invite Code</p>
                            <p className="font-mono text-xs text-foreground font-bold truncate">{slot.tenant_code}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(slot.tenant_code, slot.id)}
                            className="h-7 px-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-accent hover:bg-muted/50 flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            {copiedCode === slot.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                            <span>{copiedCode === slot.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}

                      <div className="pt-0.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUnitModal(slot)}
                          className="h-7 w-full text-xs gap-1 hover:bg-accent/10 hover:text-accent border-border"
                        >
                          {isSlotOccupied ? (
                            <>
                              <Edit3 className="size-3 text-accent" />
                              <span>Edit Details / Move Tenant</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="size-3" />
                              <span>Manage Unit Slot</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* ── DESKTOP & TABLET VIEW: Full Table (>= 640px) ── */}
            <div className="hidden sm:block overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin w-full">
              {loading ? (
                <div className="divide-y divide-border"><SkeletonRows count={6} /></div>
              ) : displayUnits.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No units found matching your filter criteria.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-card sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Unit & Property</th>
                      <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Tenant Details</th>
                      <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Rent</th>
                      <th className="px-3 sm:px-4 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayUnits.map((slot) => {
                      const unitLabel = slot.rent_setting?.unit_number || `Unit ${slot.slot_number}`
                      const rentAmount = slot.rent_setting?.monthly_amount || slot.monthly_rent || 0
                      const matchedProp = properties.find((p) => p.landlord_block_id === slot.landlord_block_id)
                      const isSlotOccupied = Boolean(slot.is_occupied && slot.tenant_id && slot.tenant)

                      return (
                        <tr key={slot.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-xs text-foreground">
                              {unitLabel}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-[150px]">
                               {matchedProp?.property_name || 'Property'}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                            {isSlotOccupied ? (
                              <div>
                                <div className="font-semibold text-xs text-foreground">{slot.tenant.full_name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {slot.tenant.phone_number || slot.tenant.email || 'No phone'}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] text-muted-foreground">{slot.tenant_code}</span>
                                <button
                                  onClick={() => copyToClipboard(slot.tenant_code, slot.id)}
                                  title="Copy Invite Code"
                                  className="text-muted-foreground hover:text-accent p-0.5 rounded"
                                >
                                  {copiedCode === slot.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-right font-semibold text-xs whitespace-nowrap">
                            {rentAmount > 0 ? fmtKES(rentAmount) : '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                isSlotOccupied
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {isSlotOccupied ? 'Occupied' : 'Vacant'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenUnitModal(slot)}
                              className="h-7 text-xs gap-1 hover:bg-accent/10 hover:text-accent border-border px-2 sm:px-2.5"
                            >
                              {isSlotOccupied ? (
                                <>
                                  <Edit3 className="size-3 text-accent" />
                                  <span>Edit / Move</span>
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="size-3" />
                                  <span>Manage</span>
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── REAL-TIME KENYAN REAL ESTATE & PROPERTY NEWS FEED (AT BOTTOM) ── */}
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Kenya Real Estate & Property Intelligence Feed</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">• Real-Time Market Telemetry</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden md:inline">
              {news.length} updates
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadNews}
              disabled={newsLoading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
              Refresh News
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {newsLoading ? (
            <div className="divide-y divide-border"><SkeletonRows count={4} /></div>
          ) : news.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No real estate news available at this moment.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedNews.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between hover:border-accent/40 hover:shadow-sm transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span className="font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                          {item.category}
                        </span>
                        <span className="text-muted-foreground shrink-0">{timeAgo(item.publishedAt)}</span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-accent transition-colors line-clamp-2">
                        {item.title}
                      </h4>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {item.snippet}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs gap-2">
                      <span className="text-muted-foreground font-semibold text-[11px] truncate max-w-[130px] sm:max-w-[160px]">
                        {item.source}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-accent hover:underline shrink-0 text-xs"
                      >
                        Read Article <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* News Pagination Controls */}
              {totalNewsPages > 1 && (
                <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <p className="text-muted-foreground">
                    Showing {(newsPage - 1) * NEWS_PER_PAGE + 1} to{' '}
                    {Math.min(newsPage * NEWS_PER_PAGE, news.length)} of {news.length} market briefings
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewsPage((p) => Math.max(1, p - 1))}
                      disabled={newsPage === 1}
                      className="h-8 px-2.5 gap-1 text-xs"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Previous</span>
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalNewsPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewsPage(p)}
                          className={`size-7 rounded-lg text-xs font-semibold transition-all ${
                            newsPage === p
                              ? 'bg-accent text-accent-foreground font-bold shadow-xs'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewsPage((p) => Math.min(totalNewsPages, p + 1))}
                      disabled={newsPage === totalNewsPages}
                      className="h-8 px-2.5 gap-1 text-xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* ── MODAL: ADD NEW PROPERTY WITH DESIGNATED UNITS ── */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-accent" />
                <h3 className="font-bold text-foreground">Add New Property</h3>
              </div>
              <button
                onClick={() => setShowAddPropertyModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Property Name
                </label>
                <Input
                  placeholder="e.g. Madura Cabin & Residences"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  required
                  className="rounded-xl bg-muted/40"
                />
              </div>

              {/* Kenyan Location Picker */}
              <div className="space-y-2 rounded-xl bg-muted/30 border border-border/60 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <MapPin className="size-3.5 text-accent" />
                  <span>Kenya Location & Area</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">County</label>
                    <div className="relative">
                      <select
                        value={newPropertyCounty}
                        onChange={(e) => handleCountyChange(e.target.value)}
                        className="w-full h-9 appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                      >
                        {KENYA_COUNTIES.map((county) => (
                          <option key={county} value={county}>
                            {county}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Neighborhood / Town</label>
                    {!isCustomArea ? (
                      <div className="relative">
                        <select
                          value={newPropertyArea}
                          onChange={(e) => {
                            if (e.target.value === '__other__') {
                              setIsCustomArea(true)
                              setCustomAreaName('')
                            } else {
                              setNewPropertyArea(e.target.value)
                            }
                          }}
                          className="w-full h-9 appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                        >
                          {(KENYA_LOCATIONS_BY_COUNTY[newPropertyCounty] || []).map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                          <option value="__other__">+ Other Area...</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="e.g. Tigoni"
                          value={customAreaName}
                          onChange={(e) => setCustomAreaName(e.target.value)}
                          className="h-9 text-xs rounded-lg bg-card"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCustomArea(false)
                            const areas = KENYA_LOCATIONS_BY_COUNTY[newPropertyCounty] || []
                            if (areas.length > 0) setNewPropertyArea(areas[0])
                          }}
                          className="h-9 px-2 text-[10px]"
                        >
                          List
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Street / Building / Landmark <span className="text-[10px] text-muted-foreground/80">(Optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. Dennis Pritt Rd, Near Yaya Centre"
                    value={newPropertyStreet}
                    onChange={(e) => setNewPropertyStreet(e.target.value)}
                    className="h-8 text-xs rounded-lg bg-card"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Number of Units in this Property
                </label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  placeholder="e.g. 10"
                  value={newPropertyUnits}
                  onChange={(e) => setNewPropertyUnits(e.target.value)}
                  required
                  className="rounded-xl bg-muted/40"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  LEA will initialize tenant slots and invite codes automatically for all units.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingProperty}
                  className="flex-1 rounded-xl font-bold"
                >
                  {isSubmittingProperty ? 'Registering...' : 'Register Property'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT PROPERTY DETAILS ── */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Edit3 className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Edit Property Details</h3>
                  <p className="text-[11px] text-muted-foreground">{editingProperty.property_name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProperty(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Property Name
                </label>
                <Input
                  value={editPropName}
                  onChange={(e) => setEditPropName(e.target.value)}
                  placeholder="e.g. LEA Residency Kilimani"
                  className="h-9 text-xs rounded-lg bg-card"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Property Address / Location
                </label>
                <Input
                  value={editPropAddress}
                  onChange={(e) => setEditPropAddress(e.target.value)}
                  placeholder="e.g. Dennis Pritt Rd, Kilimani, Nairobi, Kenya"
                  className="h-9 text-xs rounded-lg bg-card"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Total Units / Capacity
                </label>
                <Input
                  type="number"
                  min="1"
                  max="5000"
                  value={editPropUnits}
                  onChange={(e) => setEditPropUnits(e.target.value)}
                  placeholder="e.g. 100"
                  className="h-9 text-xs rounded-lg bg-card"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Adjusting capacity updates available slots without affecting existing active tenant leases.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProperty(null)}
                  className="flex-1 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingProperty}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  {isSavingProperty ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT TENANT DETAILS & SWITCH PROPERTY (TRANSFER) ── */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <Edit3 className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    {selectedUnit.is_occupied && selectedUnit.tenant
                      ? `Manage Tenant: ${selectedUnit.tenant.full_name}`
                      : `Manage ${selectedUnit.rent_setting?.unit_number || `Unit ${selectedUnit.slot_number}`}`}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {properties.find((p) => p.landlord_block_id === selectedUnit.landlord_block_id)?.property_name || 'Property'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {selectedUnit.is_occupied && selectedUnit.tenant ? (
              <form onSubmit={handleSaveTenantDetails} className="space-y-4">
                {/* 1. Tenant Personal Info */}
                <div className="space-y-3 bg-muted/20 border border-border/60 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Users className="size-3.5 text-accent" />
                    <span>Tenant Profile Details</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Full Name</label>
                    <Input
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                      placeholder="e.g. John Doe"
                      className="h-9 text-xs rounded-lg bg-card"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Phone Number</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="h-9 text-xs rounded-lg bg-card"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Email</label>
                      <Input
                        value={selectedUnit.tenant.email || ''}
                        disabled
                        className="h-9 text-xs rounded-lg bg-muted/60 cursor-not-allowed text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Rent & Unit Info */}
                <div className="space-y-3 bg-muted/20 border border-border/60 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Home className="size-3.5 text-accent" />
                    <span>Unit & Rent Assignment</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Unit / House No.</label>
                      <Input
                        value={editUnitNumber}
                        onChange={(e) => setEditUnitNumber(e.target.value)}
                        placeholder="e.g. A3, 102"
                        className="h-9 text-xs rounded-lg bg-card"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Monthly Rent (KES)</label>
                      <Input
                        type="number"
                        value={editRentAmount}
                        onChange={(e) => setEditRentAmount(e.target.value)}
                        placeholder="e.g. 25000"
                        className="h-9 text-xs rounded-lg bg-card"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. SWITCH PROPERTY (TRANSFER TENANT) */}
                <div className="space-y-3 bg-accent/5 border border-accent/20 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <ArrowRightLeft className="size-3.5" />
                      <span>Switch Assigned Property</span>
                    </div>
                    <span className="text-[10px] bg-accent/10 text-accent font-medium px-2 py-0.5 rounded-full">
                      Cross-Property Transfer
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Move Tenant To Property:
                    </label>
                    <div className="relative">
                      <select
                        value={editTargetPropertyId}
                        onChange={(e) => setEditTargetPropertyId(e.target.value)}
                        className="w-full h-9 appearance-none rounded-lg border border-accent/30 bg-card pl-3 pr-8 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                      >
                        {properties.map((prop) => {
                          const isCurrent = prop.landlord_block_id === selectedUnit.landlord_block_id
                          return (
                            <option key={prop.id} value={prop.id}>
                              {prop.property_name} {isCurrent ? '(Current Location)' : ''}
                            </option>
                          )
                        })}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    </div>

                    {editTargetPropertyId &&
                      editTargetPropertyId !== properties.find((p) => p.landlord_block_id === selectedUnit.landlord_block_id)?.id && (
                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px]">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span>
                            Moving this tenant will automatically allocate a slot at <strong>{properties.find((p) => p.id === editTargetPropertyId)?.property_name}</strong> and vacate the current unit.
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedUnit(null)}
                    className="flex-1 rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingTenant}
                    className="flex-1 rounded-xl text-xs font-bold"
                  >
                    {isSavingTenant ? 'Saving...' : 'Save & Update'}
                  </Button>
                </div>
              </form>
            ) : (
              /* Vacant Unit Slot Details */
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <ShieldCheck className="size-4" />
                    <span>Vacant Unit Slot</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This unit slot is available for new lease activation. Prospective tenants can onboard directly using the code below.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Onboarding Tenant Invite Code
                  </label>
                  <div className="bg-muted/50 p-3 rounded-xl flex items-center justify-between border border-border">
                    <span className="font-mono text-xs font-bold text-foreground">{selectedUnit.tenant_code}</span>
                    <button
                      onClick={() => copyToClipboard(selectedUnit.tenant_code, selectedUnit.id)}
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedCode === selectedUnit.id ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                      {copiedCode === selectedUnit.id ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedUnit(null)}
                    className="w-full rounded-xl text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
