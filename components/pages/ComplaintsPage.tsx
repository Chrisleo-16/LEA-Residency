'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertCircle, Clock, CheckCircle, Loader2,
  Plus, ChevronDown, ChevronUp, X, AlertTriangle, Image as ImageIcon
} from 'lucide-react'
import { generateUploadUrl } from '@/app/actions/chat-media'
import { supabase } from '@/lib/supabase'

// NOTE: complaint images are uploaded to this storage bucket. Change to match
// whichever public/readable bucket your project uses for complaint attachments.
const COMPLAINTS_BUCKET = 'complaints'

interface Complaint {
  id: string
  tenant_id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  image_path?: string | null
  profiles?: { full_name: string; email: string }
}

interface ComplaintsPageProps {
  user: User | null
}

function getImageUrl(path?: string | null) {
  if (!path) return null
  return supabase.storage.from(COMPLAINTS_BUCKET).getPublicUrl(path).data.publicUrl
}

export default function ComplaintsPage({ user }: ComplaintsPageProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeCount, setActiveCount] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/complaints')
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load complaints')
      setRole(payload.role ?? null)
      setComplaints(payload.complaints || [])
      setActiveCount((payload.complaints || []).filter((c: Complaint) => c.status !== 'resolved').length)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setError('')
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadComplaintImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null
    const fileExt = imageFile.name.split('.').pop()
    const path = `complaints/${user.id}/${crypto.randomUUID()}.${fileExt}`

    const uploadResult = await generateUploadUrl(path)
    if (!uploadResult.success || !uploadResult.signedUrl) {
      throw new Error(uploadResult.error || 'Failed to get upload URL')
    }

    const uploadResponse = await fetch(uploadResult.signedUrl, {
      method: 'PUT',
      body: imageFile,
      headers: { 'Content-Type': imageFile.type },
    })
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image')
    }

    return path
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setIsSubmitting(true)
    try {
      let imagePath: string | null = null
      if (imageFile) {
        imagePath = await uploadComplaintImage()
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, imagePath }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to submit complaint')
      setSuccess('Complaint submitted successfully!')
      setTitle(''); setDescription(''); removeImage(); setShowForm(false)
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    try {
      const res = await fetch('/api/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId: id, status: newStatus }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to update complaint')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':     return { icon: <Clock className="w-3 h-3" />,        style: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400',  label: 'Pending' }
      case 'in_progress': return { icon: <Loader2 className="w-3 h-3" />,      style: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-400',   label: 'In Progress' }
      case 'resolved':    return { icon: <CheckCircle className="w-3 h-3" />,  style: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', label: 'Resolved' }
      default:            return { icon: null, style: '', dot: '', label: status }
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

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {role === 'landlord' ? 'All Complaints' : 'My Complaints'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {role === 'landlord'
                ? `${complaints.length} total complaint${complaints.length !== 1 ? 's' : ''}`
                : `${activeCount} of 3 active slots used`
              }
            </p>
          </div>
          {role === 'tenant' && (
            <Button
              onClick={() => setShowForm(!showForm)}
              disabled={activeCount >= 3}
              className="bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl shadow-md shadow-accent/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Complaint
            </Button>
          )}
        </div>

        {/* Progress bar — tenants only */}
        {role === 'tenant' && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">Active Complaints</p>
              <p className="text-xs text-muted-foreground">{activeCount}/3</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${
                  i < activeCount ? 'bg-accent' : 'bg-secondary'
                }`} />
              ))}
            </div>
            {activeCount >= 3 && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Maximum active complaints reached
              </p>
            )}
          </div>
        )}

        {/* Feedback */}
        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-800">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}

        {/* Submit Form */}
        {role === 'tenant' && showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Submit a Complaint</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                <Input
                  placeholder="e.g. Broken pipe in bathroom"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  required disabled={isSubmitting}
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea
                  placeholder="Describe the issue in detail..."
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  required disabled={isSubmitting} rows={4}
                  className="w-full rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>

              {/* Image attachment */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Photo (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Attachment preview"
                      className="max-h-48 rounded-xl object-contain border border-border"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Attach a photo
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border-border">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20">
                  {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Complaints list */}
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-foreground">No complaints found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {role === 'tenant' ? 'Tap "New Complaint" to submit one' : 'No tenant complaints yet'}
              </p>
            </div>
          ) : (
            complaints.map((complaint) => {
              const sc = getStatusConfig(complaint.status)
              const isExpanded = expandedId === complaint.id
              const imageUrl = getImageUrl(complaint.image_path)
              return (
                <div key={complaint.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status dot */}
                      <div className="mt-1.5 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {role === 'landlord' && complaint.profiles && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-accent">
                                {complaint.profiles.full_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{complaint.profiles.full_name}</span>
                              <span className="hidden sm:inline"> · {complaint.profiles.email}</span>
                            </p>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground text-sm sm:text-base">{complaint.title}</h4>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className={`text-sm text-muted-foreground mt-1 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                          {complaint.description}
                        </p>
                        {!isExpanded && imageUrl && (
                          <p className="text-xs text-accent mt-1.5 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Photo attached
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(complaint.created_at).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric',
                            timeZone: 'Africa/Nairobi'
                          })}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.style}`}>
                          {sc.icon}
                          <span className="hidden sm:inline">{sc.label}</span>
                        </span>
                        {role === 'landlord' && (
                          <div className="relative">
                            <select
                              value={complaint.status}
                              onChange={(e) => updateStatus(complaint.id, e.target.value as any)}
                              className="text-xs border border-border rounded-lg pl-2.5 pr-7 py-1.5 bg-secondary text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/40"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded photo */}
                  {isExpanded && imageUrl && (
                    <div className="px-5 pb-5">
                      <img
                        src={imageUrl}
                        alt="Complaint attachment"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxImage(imageUrl)
                        }}
                        className="max-h-64 rounded-xl object-contain border border-border cursor-zoom-in"
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Lightbox for full-size image view */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size attachment"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}