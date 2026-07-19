'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  Sparkles, CalendarDays, MapPin, Home, Send, CheckCircle, AlertCircle,
} from 'lucide-react'

interface LeadListing {
  id: string
  title: string
  alreadyPitched: boolean
}

interface Lead {
  wishlistId: string
  firstName: string
  lastName: string
  maxBudget: number
  neighborhoods: string[]
  bedrooms: string
  moveInDate: string
  amenities: string[]
  notes: string | null
  createdAt: string
  listings: LeadListing[]
}

interface LeadsPageProps {
  user: User | null
}

const bedroomLabel = (b: string) => (b === 'studio' ? 'Studio' : b === '3+' ? '3+ Bed' : `${b} Bed`)

export default function LeadsPage({ user }: LeadsPageProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [pitchingKey, setPitchingKey] = useState<string | null>(null)
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({})
  const [openComposerKey, setOpenComposerKey] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchLeads()
  }, [user])

  const fetchLeads = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/wishlist/leads')
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load leads')
      setLeads(payload.leads || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePitch = async (wishlistId: string, listingId: string) => {
    const key = `${wishlistId}:${listingId}`
    setPitchingKey(key)
    setError('')
    try {
      const res = await fetch('/api/wishlist/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishlistId,
          listingId,
          message: messageDrafts[key]?.trim() || undefined,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to send pitch')

      setLeads((prev) =>
        prev.map((lead) =>
          lead.wishlistId !== wishlistId
            ? lead
            : {
                ...lead,
                listings: lead.listings.map((l) =>
                  l.id === listingId ? { ...l, alreadyPitched: true } : l
                ),
              }
        )
      )
      setOpenComposerKey(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPitchingKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-3xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tenant Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} tenant{leads.length !== 1 ? 's' : ''} looking for a place matching your listings
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {leads.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">No matching tenants yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              We&apos;ll notify you the moment a tenant wishlist matches one of your listings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.wishlistId} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {lead.firstName} {lead.lastName.charAt(0)}.
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi',
                      })}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-foreground shrink-0">
                    KES {lead.maxBudget.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-foreground">
                    <Home className="w-3 h-3" /> {bedroomLabel(lead.bedrooms)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-foreground">
                    <CalendarDays className="w-3 h-3" /> Move in{' '}
                    {new Date(lead.moveInDate).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi',
                    })}
                  </span>
                  {lead.neighborhoods.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-foreground">
                      <MapPin className="w-3 h-3" /> {n}
                    </span>
                  ))}
                </div>

                {lead.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.amenities.map((a) => (
                      <span key={a} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {lead.notes && (
                  <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                    &ldquo;{lead.notes}&rdquo;
                  </p>
                )}

                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Matching listings
                  </p>
                  {lead.listings.map((listing) => {
                    const key = `${lead.wishlistId}:${listing.id}`
                    const isComposerOpen = openComposerKey === key
                    return (
                      <div key={listing.id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-foreground truncate">{listing.title}</span>
                          {listing.alreadyPitched ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                              <CheckCircle className="w-3.5 h-3.5" /> Pitched
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setOpenComposerKey(isComposerOpen ? null : key)}
                              className="bg-accent hover:bg-accent/90 text-white rounded-full gap-1.5 shrink-0 dark:text-accent-foreground"
                            >
                              <Send className="w-3.5 h-3.5" /> Pitch My Room
                            </Button>
                          )}
                        </div>
                        {isComposerOpen && (
                          <div className="flex items-start gap-2">
                            <textarea
                              value={messageDrafts[key] || ''}
                              onChange={(e) =>
                                setMessageDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder="Optional message to include with your pitch..."
                              rows={2}
                              className="flex-1 rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                            />
                            <Button
                              size="sm"
                              disabled={pitchingKey === key}
                              onClick={() => handlePitch(lead.wishlistId, listing.id)}
                              className="bg-accent hover:bg-accent/90 text-white rounded-xl shrink-0 dark:text-accent-foreground"
                            >
                              {pitchingKey === key ? '...' : 'Send'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
