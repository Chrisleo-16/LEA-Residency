'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { ShieldCheck, ShieldAlert, Clock, Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface VerificationSectionProps {
  user: User | null
}

interface VerificationRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  submitted_at: string
}

export default function VerificationSection({ user }: VerificationSectionProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [kycVerified, setKycVerified] = useState(false)
  const [latestRequest, setLatestRequest] = useState<VerificationRequest | null>(null)
  const [idNumber, setIdNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = async () => {
    if (!user) return
    setIsLoading(true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('kyc_verified')
      .eq('id', user.id)
      .maybeSingle()

    setKycVerified(!!profile?.kyc_verified)

    const { data: request } = await supabase
      .from('verification_requests')
      .select('id, status, notes, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setLatestRequest(request || null)
    setIsLoading(false)
  }

  useEffect(() => {
    loadStatus()
  }, [user])

  const handleSubmit = async () => {
    if (!user || !file) {
      setError('Please select an ID document to upload')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const fileExt = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('verification_requests').insert([
        {
          user_id: user.id,
          id_document_url: path,
          id_number: idNumber || null,
        },
      ])
      if (insertError) throw insertError

      setFile(null)
      setIdNumber('')
      await loadStatus()
    } catch (err) {
      console.error('Verification submission error:', err)
      setError('Failed to submit verification request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">Loading verification status...</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-accent" />
        </div>
        <h3 className="font-semibold text-foreground">Landlord Verification</h3>
      </div>

      {kycVerified ? (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Verified Landlord</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your listings show a Verified badge to tenants.
            </p>
          </div>
        </div>
      ) : latestRequest?.status === 'pending' ? (
        <div className="flex items-start gap-3 p-4 bg-secondary border border-border rounded-xl">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Under Review</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {new Date(latestRequest.submitted_at).toLocaleDateString()}. We'll notify you once it's reviewed.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {latestRequest?.status === 'rejected' && (
            <div className="flex items-start gap-3 p-4 bg-destructive/8 border border-destructive/20 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Verification Rejected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestRequest.notes || 'Please review your document and resubmit.'}
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Upload a national ID or business registration document to get a Verified badge on your listings.
          </p>

          <div>
            <label
              htmlFor="verification-upload"
              className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/40 transition-colors bg-secondary/50"
            >
              {file ? (
                <span className="text-sm text-foreground">{file.name}</span>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Click to upload ID document</span>
                </div>
              )}
            </label>
            <input
              id="verification-upload"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="ID / business registration number (optional)"
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </div>
      )}
    </div>
  )
}
