'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, TrendingUp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { POCHI_NUMBER } from '@/components/billing/SubscriptionModal'
import type { Listing } from '@/app/listings/page'

const PLANS = [
  { days: 7 as const, price: 300 },
  { days: 14 as const, price: 600 },
]

interface FeatureListingDialogProps {
  listing: Listing
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted: () => void
}

export default function FeatureListingDialog({ listing, open, onOpenChange, onSubmitted }: FeatureListingDialogProps) {
  const supabase = createClient()
  const [duration, setDuration] = useState<7 | 14>(7)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const plan = PLANS.find((p) => p.days === duration)!

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(POCHI_NUMBER.replace(/\s+/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — user can still copy the number manually
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { error: insertError } = await supabase.from('featured_listing_requests').insert([
        {
          listing_id: listing.id,
          landlord_id: session.user.id,
          duration_days: duration,
          amount: plan.price,
        },
      ])
      if (insertError) throw insertError

      onSubmitted()
      onOpenChange(false)
    } catch (err) {
      console.error('Featured listing request error:', err)
      setError('Failed to submit your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neutral-900">
            <TrendingUp className="w-5 h-5" /> Feature This Listing
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Featured listings appear first in search results and get a highlighted badge.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {PLANS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDuration(p.days)}
              className={`p-4 rounded-xl border text-left transition-colors ${
                duration === p.days ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              <p className="text-sm font-semibold text-neutral-900">{p.days} days</p>
              <p className="text-xs text-neutral-500 mt-1">KES {p.price.toLocaleString()}</p>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 mb-2">Send via Pochi la Biashara to:</p>
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-neutral-900">{POCHI_NUMBER}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2">Amount: KES {plan.price.toLocaleString()}</p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-neutral-900 text-white text-sm font-semibold py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : "I've Paid — Submit for Review"}
        </button>
        <p className="text-[11px] text-neutral-400 text-center">
          A team member confirms your payment against the Pochi till, usually within a day.
        </p>
      </DialogContent>
    </Dialog>
  )
}
