'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, MapPin, BedDouble, Bath, Trash2, ShieldCheck, ShieldAlert, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Listing } from '@/app/listings/page'

interface ListingCardProps {
  listing: Listing
  viewMode: 'grid' | 'list'
  isOwner: boolean
  isVerified: boolean
  isFeatured: boolean
  riskFlags: string[]
  onDelete: () => void
  onView: (listing: Listing) => void
}

const isNew = (createdAt: string) => {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000
  return days <= 7
}

export default function ListingCard({ listing, viewMode, isOwner, isVerified, isFeatured, riskFlags, onDelete, onView }: ListingCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this listing?')) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('listings').delete().eq('id', listing.id)
      if (error) throw error
      onDelete()
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Failed to delete listing')
    } finally {
      setIsDeleting(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onView(listing)}
        className={`group bg-white border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex cursor-pointer ${
          isFeatured ? 'border-amber-300 ring-1 ring-amber-200' : 'border-neutral-200'
        }`}
      >
        <div className="relative w-48 h-40 overflow-hidden shrink-0">
          <Image src={listing.image_url} alt={listing.title} fill className="object-cover" />
        </div>
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 truncate">{listing.title}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {isFeatured && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                  </span>
                )}
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {riskFlags.length > 0 && (
                  <span title={riskFlags.join(' · ')} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    <ShieldAlert className="w-3 h-3" /> Review
                  </span>
                )}
                {isNew(listing.created_at) && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">New</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-500 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{listing.location}</span>
            </div>
            <div className="flex gap-4 text-sm text-neutral-500 mt-3">
              <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{listing.bedrooms} Beds</span>
              <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{listing.bathrooms} Baths</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xl font-bold text-neutral-900">
              KES {listing.price.toLocaleString()}
              <span className="text-xs font-normal text-neutral-400"> /month</span>
            </span>
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view — Landify-style card
  return (
    <div
      onClick={() => onView(listing)}
      className={`group bg-white border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
        isFeatured ? 'border-amber-300 ring-1 ring-amber-200' : 'border-neutral-200'
      }`}
    >
      <div className="relative h-52 overflow-hidden">
        <Image src={listing.image_url} alt={listing.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />

        <div className="absolute top-3 left-3 right-14 flex flex-wrap gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/90 text-neutral-700">For Rent</span>
          {isFeatured && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500 text-white">
              <Star className="w-3 h-3 fill-white" /> Featured
            </span>
          )}
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-600 text-white">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          )}
          {riskFlags.length > 0 && (
            <span title={riskFlags.join(' · ')} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500 text-white">
              <ShieldAlert className="w-3 h-3" /> Review
            </span>
          )}
          {isNew(listing.created_at) && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500 text-white">New</span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setIsFavorite(!isFavorite) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
        </button>

        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-neutral-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 truncate mb-1">{listing.title}</h3>
        <div className="flex items-center gap-1.5 text-neutral-500 text-sm mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{listing.location}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4 pb-4 border-b border-neutral-100">
          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{listing.bedrooms} Beds</span>
          <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{listing.bathrooms} Baths</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-neutral-900">
              KES {listing.price.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-400"> /month</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onView(listing) }}
            className="text-xs font-semibold px-4 py-2 rounded-full border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors shrink-0"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
