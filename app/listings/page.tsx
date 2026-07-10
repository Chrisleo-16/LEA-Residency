'use client'

import { useState, useEffect, useMemo } from 'react'
import { Inter } from 'next/font/google'
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Plus, Grid, List,
  Home, Building2, Trees, Waves, DollarSign, ShieldCheck, ShieldAlert,
  ArrowLeftToLine, TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CreateListingDialog from '@/components/listings/CreateListingDialog'
import ListingCard from '@/components/listings/ListingCard'
import FeatureListingDialog from '@/components/listings/FeatureListingDialog'

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

export default function ListingsPage() {
  const supabase = createClient()
  const [listings, setListings] = useState<Listing[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [section, setSection] = useState<'marketplace' | 'portfolio'>('marketplace')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [portfolioSearch, setPortfolioSearch] = useState('')
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({})
  const [featureListing, setFeatureListing] = useState<Listing | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const session = await supabase.auth.getSession()
      const user = session.data.session?.user
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        const role = profile?.role || null
        setUserRole(role)
        if (role === 'landlord') setSection('portfolio')
      }
    }
    fetchUser()
  }, [])

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
          .select('id, kyc_verified')
          .in('id', ownerIds)

        const map: Record<string, boolean> = {}
        for (const owner of owners || []) {
          map[owner.id] = !!owner.kyc_verified
        }
        setVerifiedMap(map)
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

      return matchesSearch && matchesFilter
    }).sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)))
  }, [listings, searchQuery, activeFilter])

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
            <ArrowLeftToLine/>
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
                  onDelete={fetchListings}
                  onView={setSelectedListing}
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
        <DialogContent className="max-w-lg bg-white">
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
                <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4" />{selectedListing.bedrooms} Beds</span>
                <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" />{selectedListing.bathrooms} Baths</span>
                <span className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4" />{selectedListing.area} m²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-neutral-900">
                  KES {selectedListing.price.toLocaleString()}
                  <span className="text-sm font-normal text-neutral-400"> /month</span>
                </span>
                {isOwner(selectedListing) && (
                  <div className="flex items-center gap-2">
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
    </div>
  )
}
