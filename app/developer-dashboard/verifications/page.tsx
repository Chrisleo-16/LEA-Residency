'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inter } from 'next/font/google'
import { ShieldCheck, ShieldX, FileText, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

interface VerificationRequest {
  id: string
  user_id: string
  id_document_url: string
  id_number: string | null
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  submitted_at: string
  profiles: { full_name: string; email: string } | null
}

export default function VerificationsAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'developer') {
        router.push('/dashboard')
        return
      }

      setIsAuthorized(true)
      await fetchRequests()
    }
    init()
  }, [])

  const fetchRequests = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*, profiles(full_name, email)')
      .order('submitted_at', { ascending: false })

    if (!error) setRequests((data as any) || [])
    setIsLoading(false)
  }

  const viewDocument = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(path, 60 * 5)
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleApprove = async (req: VerificationRequest) => {
    setActioningId(req.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('profiles').update({ kyc_verified: true }).eq('id', req.user_id)
      await supabase
        .from('verification_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id })
        .eq('id', req.id)
      await fetchRequests()
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (req: VerificationRequest) => {
    const reason = prompt('Reason for rejection (shown to the landlord):')
    if (reason === null) return
    setActioningId(req.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase
        .from('verification_requests')
        .update({ status: 'rejected', notes: reason, reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id })
        .eq('id', req.id)
      await fetchRequests()
    } finally {
      setActioningId(null)
    }
  }

  const filteredRequests = requests.filter((r) => r.status === filter)

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`${inter.className} min-h-screen bg-background`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push('/developer-dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Developer Dashboard
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">Landlord Verification Requests</h1>
        <p className="text-sm text-muted-foreground mb-6">Review submitted ID documents and approve or reject verification.</p>

        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === s ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {s} ({requests.filter((r) => r.status === s).length})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-sm text-muted-foreground">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">No {filter} requests.</div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {filteredRequests.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {req.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{req.profiles?.email}</p>
                  {req.id_number && <p className="text-xs text-muted-foreground mt-0.5">ID: {req.id_number}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitted {new Date(req.submitted_at).toLocaleDateString()}
                  </p>
                  {req.status === 'rejected' && req.notes && (
                    <p className="text-xs text-destructive mt-1">Reason: {req.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => viewDocument(req.id_document_url)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:border-foreground/30 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Document
                  </button>
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actioningId === req.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        disabled={actioningId === req.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                      >
                        <ShieldX className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
