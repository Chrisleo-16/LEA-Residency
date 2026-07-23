'use client'

import { useState, useEffect, useMemo } from 'react'
import { Inter } from 'next/font/google'
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Plus, Grid, List,
  Home, Building2, Trees, Waves, DollarSign, ShieldCheck, ShieldAlert,
  ArrowLeftToLine, TrendingUp, CalendarClock, HandHeart,
  Signpost, Landmark, Phone, Mail, UserRound, View, Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CreateListingDialog from '@/components/listings/CreateListingDialog'
import ListingCard from '@/components/listings/ListingCard'
import FeatureListingDialog from '@/components/listings/FeatureListingDialog'
import EditListingDialog from '@/components/listings/EditListingDialog'
import TourViewer from '@/components/listings/TourViewer'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export interface Listing {
  id: string
  title: string
  description: string
  location: string
  price: number
  bedrooms: number
  bathrooms: number
  area: number
  image_url: string
  created_by: string
  created_at: string
  updated_at: string
  featured_until: string | null
  listing_type: 'sale' | 'long_term_rent' | 'short_term_rent' | 'commercial' | 'land'
  amenities: string[]
  virtual_tour_url: string | null
  virtual_tour_image_url: string | null
  details: Record<string, unknown>
}

const isFeatured = (listing: Listing) =>
  !!listing.featured_until && new Date(listing.featured_until).getTime() > Date.now()

const quickFilters = [
  { id: 'all',     label: 'All',        icon: Home },
  { id: '1bed',    label: '1 Bed',      icon: Building2 },
  { id: '2bed',    label: '2 Bed',      icon: Building2 },
  { id: '3bed',    label: '3+ Bed',     icon: Trees },
  { id: 'budget',  label: 'Under 30K',  icon: DollarSign },
  { id: 'mid',     label: '30K – 60K',  icon: DollarSign },
  { id: 'premium', label: '60K+',       icon: Waves },
]

const typeFilters: { id: 'all' | Listing['listing_type']; label: string }[] = [
  { id: 'all', label: 'All Types' },
  { id: 'sale', label: 'For Sale' },
  { id: 'long_term_rent', label: 'For Rent' },
  { id: 'short_term_rent', label: 'Short-let' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'land', label: 'Land' },
]

const PRICE_SUFFIX: Record<Listing['listing_type'], string> = {
  sale: '',
  long_term_rent: '/month',
  short_term_rent: '/night',
  commercial: '/month',
  land: '',
}

const isResidentialListing = (type: Listing['listing_type']) =>
  type === 'sale' || type === 'long_term_rent' || type === 'short_term_rent'

export default function ListingsPage() {
  const supabase = createClient()
  const [listings, setListings] = useState<Listing[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | Listing['listing_type']>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [section, setSection] = useState<'marketplace' | 'portfolio'>('marketplace')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [portfolioSearch, setPortfolioSearch] = useState('')
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({})
  const [ownerContactMap, setOwnerContactMap] = useState<Record<string, { full_name: string | null; phone_number: string | null; email: string | null }>>({})
  const [featureListing, setFeatureListing] = useState<Listing | null>(null)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set())
  const [needsPhone, setNeedsPhone] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const session = await supabase.auth.getSession()
      const user = session.data.session?.user
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, phone_number')
          .eq('id', user.id)
          .maybeSingle()
        const role = profile?.role || null
        setUserRole(role)
        if (role === 'landlord') {
          setSection('portfolio')
          setNeedsPhone(!profile?.phone_number)
        }

        const { data: saved } = await supabase
          .from('saved_listings')
          .select('listing_id')
          .eq('user_id', user.id)
        setSavedIds(new Set((saved || []).map((s) => s.listing_id)))

        const { data: interested } = await supabase
          .from('listing_interests')
          .select('listing_id')
          .eq('tenant_id', user.id)
        setInterestedIds(new Set((interested || []).map((i) => i.listing_id)))
      }
    }
    fetchUser()
  }, [])

  const toggleSave = async (listingId: string) => {
    if (!userId) {
      toast.error('Please log in to save listings')
      return
    }
    const wasSaved = savedIds.has(listingId)
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(listingId)
      else next.add(listingId)
      return next
    })
    try {
      if (wasSaved) {
        await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId)
      } else {
        await supabase.from('saved_listings').insert({ user_id: userId, listing_id: listingId })
      }
    } catch (error) {
      console.error('Error toggling saved listing:', error)
    }
  }

  const expressInterest = async (listingId: string) => {
    if (!userId) {
      toast.error('Please log in to express interest')
      return
    }
    setInterestedIds((prev) => new Set(prev).add(listingId))
    try {
      const res = await fetch('/api/listings/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to express interest')
      }
      toast.success('Owner notified — they have your name and number')
    } catch (error) {
      console.error('Error expressing interest:', error)
      setInterestedIds((prev) => {
        const next = new Set(prev)
        next.delete(listingId)
        return next
      })
      toast.error('Could not notify the owner — please try again')
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const fetched = data || []
      setListings(fetched)

      const ownerIds = Array.from(new Set(fetched.map((l) => l.created_by)))
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('id, kyc_verified, full_name, phone_number, email')
          .in('id', ownerIds)

        const map: Record<string, boolean> = {}
        const contactMap: Record<string, { full_name: string | null; phone_number: string | null; email: string | null }> = {}
        for (const owner of owners || []) {
          map[owner.id] = !!owner.kyc_verified
          contactMap[owner.id] = { full_name: owner.full_name, phone_number: owner.phone_number, email: owner.email }
        }
        setVerifiedMap(map)
        setOwnerContactMap(contactMap)
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Honest, rule-based fraud-risk signals — not fabricated, computed from real listing data
  const riskFlags = useMemo(() => {
    const flags: Record<string, string[]> = {}

    const byBedrooms: Record<number, number[]> = {}
    for (const l of listings) {
      byBedrooms[l.bedrooms] = byBedrooms[l.bedrooms] || []
      byBedrooms[l.bedrooms].push(l.price)
    }

    const listingsByOwner: Record<string, Listing[]> = {}
    for (const l of listings) {
      listingsByOwner[l.created_by] = listingsByOwner[l.created_by] || []
      listingsByOwner[l.created_by].push(l)
    }

    for (const listing of listings) {
      const reasons: string[] = []

      const comparable = byBedrooms[listing.bedrooms] || []
      if (comparable.length >= 3) {
        const avg = comparable.reduce((s, p) => s + p, 0) / comparable.length
        if (listing.price < avg * 0.5) {
          reasons.push('Price is far below similar listings — verify before paying anything upfront')
        }
      }

      if (listing.description.trim().length < 40) {
        reasons.push('Listing has minimal details')
      }

      const ownerListings = listingsByOwner[listing.created_by] || []
      if (ownerListings.length >= 3) {
        const allRecent = ownerListings.every(
          (l) => Date.now() - new Date(l.created_at).getTime() < 3 * 86_400_000,
        )
        if (allRecent) {
          reasons.push('New account posted multiple listings within days')
        }
      }

      if (reasons.length > 0) flags[listing.id] = reasons
    }

    return flags
  }, [listings])

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch =
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === '1bed' && listing.bedrooms === 1) ||
        (activeFilter === '2bed' && listing.bedrooms === 2) ||
        (activeFilter === '3bed' && listing.bedrooms >= 3) ||
        (activeFilter === 'budget' && listing.price < 30000) ||
        (activeFilter === 'mid' && listing.price >= 30000 && listing.price <= 60000) ||
        (activeFilter === 'premium' && listing.price > 60000)

      const matchesType = typeFilter === 'all' || listing.listing_type === typeFilter

      return matchesSearch && matchesFilter && matchesType
    }).sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)))
  }, [listings, searchQuery, activeFilter, typeFilter])

  const myListings = useMemo(
    () => listings.filter((l) => l.created_by === userId),
    [listings, userId],
  )

  const filteredMyListings = useMemo(() => {
    return myListings.filter(
      (l) =>
        l.title.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
        l.location.toLowerCase().includes(portfolioSearch.toLowerCase()),
    )
  }, [myListings, portfolioSearch])

  const isOwner = (listing: Listing) => listing.created_by === userId

  const handleListingCreated = () => {
    setIsCreateDialogOpen(false)
    fetchListings()
  }

  return (
    <div className={`${inter.className} min-h-screen bg-neutral-50`}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-100">
        <div className="px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-1">
            <Link href='/'>
            <ArrowLeftToLine/>
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900">Property Listings</h1>
            <div className="flex items-center gap-3">
              {userRole === 'landlord' && (
                <div className="hidden sm:flex items-center rounded-full bg-neutral-100 p-1">
                  <button
                    onClick={() => setSection('marketplace')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      section === 'marketplace' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    Marketplace
                  </button>
                  <button
                    onClick={() => setSection('portfolio')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      section === 'portfolio' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    My Properties
                  </button>
                </div>
              )}
              {userRole === 'landlord' && (
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  List your home
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-neutral-500">Browse verified properties across Kenya</p>
        </div>
      </div>

      {needsPhone && (
        <div className="px-6 pt-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Add a phone number so tenants can actually reach you — without it, &quot;Interested&quot; alerts and viewing requests can&apos;t notify you.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold px-4 py-1.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
            >
              Add in Settings
            </Link>
          </div>
        </div>
      )}

      {section === 'marketplace' ? (
        <div className="px-6 py-8 max-w-7xl mx-auto">
          {/* Find the best place bar */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">Find The Best Place</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {quickFilters.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    activeFilter === id
                      ? 'border-neutral-900 text-neutral-900 bg-neutral-100'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100">
              {typeFilters.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTypeFilter(id)}
                  className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-colors ${
                    typeFilter === id
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Properties header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-neutral-900">
              Properties <span className="text-neutral-400 font-normal">({filteredListings.length})</span>
            </h2>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  placeholder="Search location or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-64 bg-neutral-100 text-neutral-900
                   border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                />
              </div>
              <div className="flex bg-neutral-100 rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-full ${viewMode === 'grid' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full ${viewMode === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900 mb-4" />
                <p className="text-neutral-500">Loading listings...</p>
              </div>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-lg font-semibold text-neutral-900 mb-2">No listings found</p>
                <p className="text-neutral-500">
                  {searchQuery || activeFilter !== 'all' ? 'Try adjusting your search or filters' : 'Be the first to list a property'}
                </p>
              </div>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  viewMode={viewMode}
                  isOwner={isOwner(listing)}
                  isVerified={!!verifiedMap[listing.created_by]}
                  isFeatured={isFeatured(listing)}
                  riskFlags={riskFlags[listing.id] || []}
                  isSaved={savedIds.has(listing.id)}
                  isInterested={interestedIds.has(listing.id)}
                  onDelete={fetchListings}
                  onView={setSelectedListing}
                  onToggleSave={toggleSave}
                  onExpressInterest={expressInterest}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-neutral-100">
              <span className="text-sm font-semibold text-neutral-900 shrink-0">
                My Properties Total {myListings.length}
              </span>
              <div className="relative flex-1 min-w-50">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                <input
                  value={portfolioSearch}
                  onChange={(e) => setPortfolioSearch(e.target.value)}
                  placeholder="Search your properties"
                  className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>

            {filteredMyListings.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500">
                  {myListings.length === 0 ? 'You have not listed any properties yet.' : 'No properties match your search.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-400 border-b border-neutral-100">
                      <th className="px-5 py-3 font-medium">Property</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Rent</th>
                      <th className="px-5 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMyListings.map((listing) => (
                      <tr key={listing.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-md bg-neutral-100 shrink-0 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-neutral-900 truncate max-w-45">{listing.title}</p>
                              <p className="text-xs text-neutral-400 flex items-center gap-1 truncate max-w-45">
                                <MapPin className="w-3 h-3 shrink-0" />{listing.location}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-neutral-500">
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{listing.bedrooms}</span>
                            <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{listing.bathrooms}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Live
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-neutral-900">KES {listing.price.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setSelectedListing(listing)}
                            className="text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Listing Dialog */}
      <CreateListingDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onListingCreated={handleListingCreated}
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white">
          {selectedListing && (
            <>
              <div className="relative h-56 -mx-6 -mt-6 mb-2 rounded-t-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedListing.image_url} alt={selectedListing.title} className="w-full h-full object-cover" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                  {selectedListing.title}
                  {isFeatured(selectedListing) && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Featured
                    </span>
                  )}
                  {verifiedMap[selectedListing.created_by] && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-1.5 text-neutral-500 text-sm -mt-2">
                <MapPin className="w-3.5 h-3.5" />
                {selectedListing.location}
              </div>

              {riskFlags[selectedListing.id]?.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Review carefully</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
                      {riskFlags[selectedListing.id].map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <p className="text-sm text-neutral-600 leading-relaxed">{selectedListing.description}</p>
              <div className="flex items-center gap-6 text-sm text-neutral-600 py-4 border-y border-neutral-100">
                {isResidentialListing(selectedListing.listing_type) && (
                  <>
                    <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4" />{selectedListing.bedrooms} Beds</span>
                    <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" />{selectedListing.bathrooms} Baths</span>
                  </>
                )}
                <span className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4" />{selectedListing.area} m²</span>
              </div>

              {(selectedListing.virtual_tour_image_url || selectedListing.virtual_tour_url) && (
                <div className="py-4 border-b border-neutral-100">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 uppercase tracking-wide mb-2">
                    <View className="w-3.5 h-3.5" />
                    360° Virtual Tour
                  </p>
                  <div className="rounded-xl overflow-hidden border border-neutral-200 aspect-video">
                    {selectedListing.virtual_tour_image_url ? (
                      <TourViewer imageUrl={selectedListing.virtual_tour_image_url} className="w-full h-full" />
                    ) : (
                      <iframe
                        src={selectedListing.virtual_tour_url!}
                        title={`360 virtual tour of ${selectedListing.title}`}
                        className="w-full h-full"
                        allow="xr-spatial-tracking; gyroscope; accelerometer"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )}

              {(() => {
                const d = (selectedListing.details || {}) as Record<string, unknown>
                const exactLocation = typeof d.exact_location === 'string' ? d.exact_location : null
                const distanceToRoad = typeof d.distance_to_road === 'string' ? d.distance_to_road : null
                const nearby = Array.isArray(d.nearby) ? (d.nearby as unknown[]).filter((n): n is string => typeof n === 'string') : []
                const caretakerName = typeof d.caretaker_name === 'string' ? d.caretaker_name : null
                const caretakerPhone = typeof d.caretaker_phone === 'string' ? d.caretaker_phone : null
                const listingContactPhone = typeof d.contact_phone === 'string' ? d.contact_phone : null
                const owner = ownerContactMap[selectedListing.created_by]
                const landlordPhone = listingContactPhone || owner?.phone_number || null
                const amenities = selectedListing.amenities || []

                const hasAnything =
                  exactLocation || distanceToRoad || nearby.length > 0 || amenities.length > 0 ||
                  landlordPhone || owner?.email || caretakerName || caretakerPhone

                if (!hasAnything) return null

                return (
                  <div className="space-y-3 py-4 border-b border-neutral-100">
                    <p className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">Location &amp; Contact</p>

                    {exactLocation && (
                      <div className="flex items-start gap-2 text-sm text-neutral-700">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
                        <span>{exactLocation}</span>
                      </div>
                    )}
                    {distanceToRoad && (
                      <div className="flex items-start gap-2 text-sm text-neutral-700">
                        <Signpost className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
                        <span>{distanceToRoad}</span>
                      </div>
                    )}
                    {nearby.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-neutral-700">
                        <Landmark className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
                        <span>{nearby.join(' · ')}</span>
                      </div>
                    )}
                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {amenities.map((a) => (
                          <span key={a} className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">{a}</span>
                        ))}
                      </div>
                    )}

                    {(landlordPhone || owner?.email || caretakerName || caretakerPhone) && (
                      <div className="pt-2 mt-2 border-t border-neutral-100 space-y-1.5">
                        {landlordPhone && (
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <Phone className="w-4 h-4 shrink-0 text-neutral-400" />
                            <span>{owner?.full_name ? `${owner.full_name} — ` : 'Landlord — '}{landlordPhone}</span>
                          </div>
                        )}
                        {owner?.email && (
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <Mail className="w-4 h-4 shrink-0 text-neutral-400" />
                            <span>{owner.email}</span>
                          </div>
                        )}
                        {(caretakerName || caretakerPhone) && (
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <UserRound className="w-4 h-4 shrink-0 text-neutral-400" />
                            <span>Caretaker{caretakerName ? ` — ${caretakerName}` : ''}{caretakerPhone ? ` · ${caretakerPhone}` : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-neutral-900">
                  KES {selectedListing.price.toLocaleString()}
                  <span className="text-sm font-normal text-neutral-400"> {PRICE_SUFFIX[selectedListing.listing_type]}</span>
                </span>
                {isOwner(selectedListing) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingListing(selectedListing)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setFeatureListing(selectedListing)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      {isFeatured(selectedListing) ? 'Extend Feature' : 'Feature Listing'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this listing?')) return
                        await supabase.from('listings').delete().eq('id', selectedListing.id)
                        setSelectedListing(null)
                        fetchListings()
                      }}
                      className="text-sm font-medium px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete Listing
                    </button>
                  </div>
                )}
              </div>
              {!isOwner(selectedListing) && (
                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href={`/viewing?listingId=${selectedListing.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                  >
                    <CalendarClock className="w-4 h-4" />
                    Schedule Viewing
                  </Link>
                  <button
                    onClick={() => expressInterest(selectedListing.id)}
                    disabled={interestedIds.has(selectedListing.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${
                      interestedIds.has(selectedListing.id)
                        ? 'bg-green-50 text-green-700 cursor-default'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    <HandHeart className="w-4 h-4" />
                    {interestedIds.has(selectedListing.id) ? 'Interest sent' : "I'm Interested"}
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {featureListing && (
        <FeatureListingDialog
          listing={featureListing}
          open={!!featureListing}
          onOpenChange={(open) => !open && setFeatureListing(null)}
          onSubmitted={() => {
            setFeatureListing(null)
          }}
        />
      )}

      <EditListingDialog
        listing={editingListing}
        onOpenChange={(open) => !open && setEditingListing(null)}
        onListingUpdated={() => {
          setEditingListing(null)
          setSelectedListing(null)
          fetchListings()
        }}
      />
    </div>
  )
}
