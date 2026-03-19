'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertCircle, FileText, Home, DollarSign,
  Wrench, LogOut, Shield, BookOpen,
  Trash2, Upload, ChevronDown, ChevronUp,
  Plus, Pencil, X, Search, ExternalLink,
  CheckCircle2, ScrollText, Download,
  BadgeCheck, ChevronRight, AlertTriangle
} from 'lucide-react'

const TZ = 'Africa/Nairobi'

const toUTC = (dateStr: string) =>
  new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')

interface Policy {
  id: string
  title: string
  content: string
  category: string
  file_url: string | null
  created_at: string
}

interface PolicyPageProps {
  user: User | null
}

const CATEGORIES = [
  { value: 'house_rules',  label: 'House Rules',       icon: Home,      color: 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
  { value: 'rent_payment', label: 'Rent & Payment',    icon: DollarSign, color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' },
  { value: 'maintenance',  label: 'Maintenance',       icon: Wrench,    color: 'text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' },
  { value: 'move_in_out',  label: 'Move In & Out',     icon: LogOut,    color: 'text-purple-500 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800' },
  { value: 'security',     label: 'Security & Safety', icon: Shield,    color: 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' },
  { value: 'lease',        label: 'Lease Agreement',   icon: BookOpen,  color: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800' },
]

export default function PolicyPage({ user }: PolicyPageProps) {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [readPolicies, setReadPolicies] = useState<Set<string>>(new Set())
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // ── Tenancy Agreement states ──
  const [showAgreement, setShowAgreement] = useState(false)
  const [agreedToAll, setAgreedToAll] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tenantNationalId, setTenantNationalId] = useState('')
  const [agreementGenerated, setAgreementGenerated] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
  if (!user) return
  fetchData()
  const stored = localStorage.getItem(`read-policies-${user.id}`)
  if (stored) setReadPolicies(new Set(JSON.parse(stored)))
  const agreed = localStorage.getItem(`agreement-signed-${user.id}`)
  if (agreed) setAgreementGenerated(true)

  // ✅ Hot reload
  const channel = supabase
    .channel('policies-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'policies',
    }, () => {
      fetchData()
    })
    .subscribe()

  return () => { channel.unsubscribe() }
}, [user])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: profile } = await supabase
      .from('profiles').select('role, full_name, email').eq('id', user!.id).single()
    setRole(profile?.role || null)
    setFullName(profile?.full_name || '')
    setEmail(profile?.email || '')

    const { data } = await supabase
      .from('policies').select('*')
      .neq('category', 'announcement')
      .order('created_at', { ascending: false })
    setPolicies(data || [])
    setIsLoading(false)
  }

  const markAsRead = (policyId: string) => {
    const updated = new Set(readPolicies)
    updated.add(policyId)
    setReadPolicies(updated)
    if (user) localStorage.setItem(`read-policies-${user.id}`, JSON.stringify([...updated]))
  }

  const handleExpand = (policyId: string) => {
    if (expandedId === policyId) {
      setExpandedId(null)
    } else {
      setExpandedId(policyId)
      markAsRead(policyId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setIsSubmitting(true)
    try {
      let fileUrl: string | null = null
      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('policy-docs').upload(fileName, pdfFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('policy-docs').getPublicUrl(uploadData.path)
        fileUrl = urlData.publicUrl
      }
      const { error } = await supabase.from('policies').insert({
        title, content, category, file_url: fileUrl, created_by: user!.id,
      })
      if (error) throw error
      setSuccess('Policy published successfully!')
      setTitle(''); setContent(''); setCategory(CATEGORIES[0].value)
      setPdfFile(null); setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
      fetchData()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  const handleDelete = async (id: string, fileUrl: string | null) => {
    if (fileUrl) {
      const fileName = fileUrl.split('/').pop()
      if (fileName) await supabase.storage.from('policy-docs').remove([fileName])
    }
    await supabase.from('policies').delete().eq('id', id)
    fetchData()
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPolicy) return
    setIsSavingEdit(true)
    const { error } = await supabase.from('policies')
      .update({ title: editTitle, content: editContent }).eq('id', editingPolicy.id)
    setIsSavingEdit(false)
    if (!error) { setEditingPolicy(null); setSuccess('Policy updated!'); fetchData() }
    else setError(error.message)
  }

  const handleDownloadAgreement = async () => {
    if (!agreedToAll) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: fullName || 'Tenant',
          tenantId: tenantNationalId,
          tenantEmail: email,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `LEA_Tenancy_Agreement_${(fullName || 'Tenant').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setAgreementGenerated(true)
      localStorage.setItem(`agreement-signed-${user?.id}`, new Date().toISOString())
    } catch (err: any) {
      setError('Could not generate agreement. Please try again.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const getCategoryConfig = (value: string) =>
    CATEGORIES.find(c => c.value === value) || CATEGORIES[0]

  const formatDate = (dateStr: string) =>
    toUTC(dateStr).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
    })

  const filteredPolicies = policies
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .filter(p =>
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const unreadCount = policies.filter(p => !readPolicies.has(p.id)).length

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

        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {role === 'landlord' ? 'Manage Policies' : 'Policy & Documents'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {role === 'landlord'
                ? `${policies.length} published document${policies.length !== 1 ? 's' : ''}`
                : unreadCount > 0
                  ? <span className="text-accent font-medium">{unreadCount} unread document{unreadCount !== 1 ? 's' : ''}</span>
                  : <span className="text-emerald-600 font-medium">All documents read ✓</span>
              }
            </p>
          </div>
          {role === 'landlord' && (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl shadow-md shadow-accent/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Policy
            </Button>
          )}
        </div>

        {/* ── Search ─────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-foreground rounded-xl h-11"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Feedback ───────────────────────────────── */}
        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}

        {/* ── Publish Form — landlord only ────────────── */}
        {role === 'landlord' && showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground text-base">Publish a Policy</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          category === cat.value
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                <Input
                  placeholder="e.g. Noise Policy 2024"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  required disabled={isSubmitting}
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Content</label>
                <textarea
                  placeholder="Write the full policy content here..."
                  value={content} onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting} rows={5}
                  className="w-full rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Attach PDF (optional)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:bg-secondary/50 hover:border-accent/30 transition-all group"
                >
                  <Upload className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground group-hover:text-accent transition-colors" />
                  <p className="text-sm text-muted-foreground">
                    {pdfFile
                      ? <span className="text-accent font-medium">{pdfFile.name}</span>
                      : 'Click to upload PDF'
                    }
                  </p>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border-border">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20">
                  {isSubmitting ? 'Publishing...' : 'Publish Policy'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Category tabs ───────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all shrink-0 font-medium ${
              activeCategory === 'all'
                ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            All
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
            }`}>
              {policies.length}
            </span>
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count = policies.filter(p => p.category === cat.value).length
            if (count === 0 && role !== 'landlord') return null
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all shrink-0 font-medium ${
                  activeCategory === cat.value
                    ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
                    : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeCategory === cat.value ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search result count */}
        {searchQuery && (
          <p className="text-xs text-muted-foreground">
            {filteredPolicies.length} result{filteredPolicies.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </p>
        )}

        {/* ── Policies List ───────────────────────────── */}
        <div className="space-y-3">
          {filteredPolicies.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-foreground">No policies found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : role === 'landlord'
                    ? 'Tap "New Policy" to publish one'
                    : 'No policies published yet'
                }
              </p>
            </div>
          ) : (
            filteredPolicies.map((policy) => {
              const catConfig = getCategoryConfig(policy.category)
              const CatIcon = catConfig.icon
              const isExpanded = expandedId === policy.id
              const isRead = readPolicies.has(policy.id)

              return (
                <div
                  key={policy.id}
                  className={`bg-card border rounded-2xl overflow-hidden hover:shadow-sm transition-all ${
                    !isRead && role === 'tenant' ? 'border-accent/30' : 'border-border'
                  }`}
                >
                  {/* Card header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => handleExpand(policy.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${catConfig.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground text-sm sm:text-base">
                                {policy.title}
                              </h4>
                              {!isRead && role === 'tenant' && (
                                <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20 shrink-0">
                                  UNREAD
                                </span>
                              )}
                              {isRead && role === 'tenant' && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              📅 {formatDate(policy.created_at)} · {catConfig.label}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {role === 'landlord' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingPolicy(policy)
                                    setEditTitle(policy.title)
                                    setEditContent(policy.content)
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(policy.id, policy.file_url) }}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                        {!isExpanded && policy.content && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                            {policy.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
  <div className="border-t border-border">

    {/* ✅ Show image if file_url is an image (not PDF) */}
    {policy.file_url && !policy.file_url.endsWith('.pdf') && (
      <div className="px-5 pt-4 pb-2">
        <img
          src={policy.file_url}
          alt={policy.title}
          className="w-full rounded-xl border border-border object-contain max-h-[600px]"
          loading="lazy"
        />
      </div>
    )}

    {/* Text content */}
    {policy.content && (
      <div className="px-5 py-4">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {policy.content}
        </p>
      </div>
    )}

    {/* PDF download — only for actual PDFs */}
    {policy.file_url && policy.file_url.endsWith('.pdf') && (
      <div className="px-5 pb-4 pt-1">
        
          <a href={policy.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 bg-accent/10 border border-accent/20 px-4 py-2 rounded-xl transition-colors hover:bg-accent/15"
        >
          <FileText className="w-4 h-4" />
          View / Download PDF
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      </div>
    )}

    {/* Mark as read */}
    {role === 'tenant' && !isRead && (
      <div className="border-t border-border px-5 py-3 bg-secondary/30">
        <button
          onClick={() => markAsRead(policy.id)}
          className="text-xs font-medium text-accent hover:text-accent/80 flex items-center gap-1.5 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark as read
        </button>
      </div>
    )}
  </div>
)}
                </div>
              )
            })
          )}
        </div>

        {/* ── Reading progress — tenants only ─────────── */}
        {role === 'tenant' && policies.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">Documents Read</p>
              <p className="text-xs text-muted-foreground">{readPolicies.size}/{policies.length}</p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${policies.length > 0 ? (readPolicies.size / policies.length) * 100 : 0}%` }}
              />
            </div>
            {readPolicies.size === policies.length && policies.length > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                You&apos;ve read all documents — great job!
              </p>
            )}
          </div>
        )}

        {/* ── Tenancy Agreement — tenants only ─────────── */}
        {role === 'tenant' && (
          <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">

            {/* Header */}
            <div
              className="p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => setShowAgreement(!showAgreement)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <ScrollText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground">📜 Tenancy Agreement</h3>
                    {agreementGenerated && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
                        ✓ DOWNLOADED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Read all terms, agree, and download your pre-filled agreement to print and sign
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${showAgreement ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* Expanded agreement */}
            {showAgreement && (
              <div className="border-t border-border">
                <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">

                  {/* Welcome intro */}
                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                    <p className="text-sm text-foreground font-semibold mb-1">👋 Welcome to LEA Executive Residency!</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Before you settle in, please read through your tenancy agreement carefully below.
                      Once you have read all policies above and agree to all terms, you can download
                      your pre-filled agreement, print it, and sign it physically to submit to management.
                    </p>
                  </div>

                  {/* Section 1: General Terms */}
                  <div>
                    <h4 className="font-bold text-foreground text-sm mb-3">📋 General Lease Terms</h4>
                    <div className="space-y-2">
                      {[
                        { emoji: '📅', title: 'Lease Period', desc: 'Your lease runs for 12 months and is renewable. Both parties must provide 30 days written notice to terminate early.' },
                        { emoji: '💰', title: 'Rent Payment', desc: 'Rent is due by the 5th of every month. Late payment incurs a 10% penalty. Bounced cheques attract KShs 3,500 in bank charges.' },
                        { emoji: '💧', title: 'Utility Bills', desc: 'Electricity and water are NOT included in your rent — you pay these separately. Refundable deposits for both utilities are paid on signing.' },
                        { emoji: '🔐', title: 'Security Deposit', desc: 'A refundable 2-month deposit is required before moving in. It CANNOT be used as rent under any circumstances whatsoever.' },
                        { emoji: '📝', title: 'Agreement Fees', desc: 'You are responsible for stamp duty and any charges related to the preparation and execution of this tenancy agreement.' },
                      ].map(item => (
                        <div key={item.title} className="flex gap-3 p-3 bg-secondary/40 rounded-xl">
                          <span className="text-lg shrink-0 mt-0.5">{item.emoji}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Tenant Responsibilities */}
                  <div>
                    <h4 className="font-bold text-foreground text-sm mb-3">🏠 Your Responsibilities as a Tenant</h4>
                    <div className="space-y-2">
                      {[
                        { emoji: '🧹', title: 'Keep It Clean', desc: 'Maintain the premises and surrounding area in good condition at your own expense. Return it in the same state when you leave (fair wear and tear excepted).' },
                        { emoji: '🏡', title: 'Residential Use Only', desc: 'The property is strictly for living — no businesses, trades, or commercial activities are allowed on the premises.' },
                        { emoji: '🚫', title: 'No Subletting', desc: 'You cannot rent out the property or any part of it to someone else without the landlord\'s prior written consent.' },
                        { emoji: '🔨', title: 'No Structural Changes', desc: 'No alterations, nails into walls, or modifications are permitted without written permission from estate management.' },
                        { emoji: '🔥', title: 'No Charcoal or Firewood', desc: 'Cooking with charcoal or firewood inside the house is strictly prohibited. Use only gas or electric appliances.' },
                        { emoji: '🐜', title: 'Report Defects Quickly', desc: 'Immediately report in writing any structural problems, pest infestations (ants, termites, bees), wet rot, or dry rot.' },
                        { emoji: '🤝', title: 'Be a Good Neighbor', desc: 'Avoid noise, nuisance, or anything that disturbs fellow residents or damages the reputation of LEA Executive Residency.' },
                        { emoji: '💸', title: 'Pay for Damages', desc: 'You are fully responsible for any damage caused during your tenancy. Replace or repair any broken, damaged, or lost items with similar quality.' },
                        { emoji: '🗑️', title: 'Pay Estate Fees', desc: 'Pay garbage collection fees, security charges, and any other estate levies to the relevant parties as required.' },
                        { emoji: '👥', title: 'Attend Estate Meetings', desc: 'Participate in estate welfare meetings and cooperate positively with neighbors and management.' },
                        { emoji: '🎨', title: 'Paint Before Leaving', desc: 'One month before your lease ends, professionally repaint the entire premises with two coats of quality paint to the Landlord\'s satisfaction.' },
                        { emoji: '🏁', title: 'Clean Handover', desc: 'Return the premises in good order with all fixtures, fittings, and equipment intact, functional, and in good condition.' },
                      ].map(item => (
                        <div key={item.title} className="flex gap-3 p-3 bg-secondary/40 rounded-xl">
                          <span className="text-lg shrink-0 mt-0.5">{item.emoji}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Landlord Obligations */}
                  <div>
                    <h4 className="font-bold text-foreground text-sm mb-3">🏢 What We Promise You</h4>
                    <div className="space-y-2">
                      {[
                        { emoji: '✅', title: 'Peaceful Enjoyment', desc: 'You have the right to live peacefully in your home without any unlawful interference from management or the landlord.' },
                        { emoji: '🏗️', title: 'Structural Maintenance', desc: 'We maintain the outer walls, roof, and main structure of the property in good and safe condition.' },
                        { emoji: '📜', title: 'We Pay Land Rates', desc: 'All land rates and rent charges on the property are paid by the landlord — these are never passed to you.' },
                        { emoji: '🔄', title: 'Renewal Priority', desc: 'If you wish to renew, notify us 3 months before your lease ends in writing. You receive first priority to renew at a negotiated rate.' },
                        { emoji: '⚖️', title: 'Fair Enforcement', desc: 'Repossession is only lawful if rent is 10+ days overdue or if you have breached any agreement terms herein.' },
                      ].map(item => (
                        <div key={item.title} className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                          <span className="text-lg shrink-0 mt-0.5">{item.emoji}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Sign & Download section ── */}
                  <div className="border-t border-border pt-5 space-y-4">
                    <h4 className="font-bold text-foreground text-sm">✍️ Sign Your Agreement</h4>

                    {/* National ID */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        Your National ID Number
                      </label>
                      <Input
                        placeholder="e.g. 12345678"
                        value={tenantNationalId}
                        onChange={(e) => setTenantNationalId(e.target.value)}
                        className="bg-secondary border-border text-foreground rounded-xl h-11"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be printed on your tenancy agreement document.
                      </p>
                    </div>

                    {/* Unread warning */}
                    {unreadCount > 0 && (
                      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-900 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 dark:text-amber-900 leading-relaxed">
                          You still have <b>{unreadCount} unread</b> policy document{unreadCount !== 1 ? 's' : ''} above.
                          Please read all policies before agreeing to and downloading your tenancy agreement.
                        </p>
                      </div>
                    )}

                    {/* Agreement checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer p-4 bg-secondary/40 rounded-xl border border-border hover:bg-secondary/60 transition-colors">
                      <div className="mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={agreedToAll}
                          onChange={(e) => setAgreedToAll(e.target.checked)}
                          disabled={unreadCount > 0}
                          className="w-4 h-4 cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
                        />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        I, <span className="font-bold text-accent">{fullName || 'the tenant'}</span>, confirm that I have
                        carefully read and fully understood all the policies and terms stated above. I voluntarily
                        agree to all terms and conditions of this Tenancy Agreement with LEA Executive Residency.
                        I understand that by downloading this document I am committing to these terms and will
                        submit the physically signed copy to management.
                      </p>
                    </label>

                    {/* Download button */}
                    <Button
                      onClick={handleDownloadAgreement}
                      disabled={!agreedToAll || isGenerating || unreadCount > 0}
                      className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-12 gap-2 shadow-md shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating your agreement...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download &amp; Print Agreement
                        </>
                      )}
                    </Button>

                    {/* Success state */}
                    {agreementGenerated && (
                      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 rounded-xl">
                        <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            Agreement downloaded! 🎉
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 leading-relaxed">
                            Print the document and sign where indicated at the bottom.
                            Submit the signed physical copy to LEA Executive management to complete your onboarding.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Edit Policy Modal ──────────────────────────── */}
      {editingPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground text-lg">Edit Policy</h3>
              <button
                onClick={() => setEditingPolicy(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                <Input
                  value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Content</label>
                <textarea
                  value={editContent} onChange={e => setEditContent(e.target.value)} rows={8}
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditingPolicy(null)} className="flex-1 rounded-xl border-border">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
// ```

// ---

// **Also make sure you have the API route at `app/api/generate-agreement/route.ts`** — that's the file from the previous response. Without it the download button will fail.

// **What's included in this full file:**
// ```
// ✅ toUTC() helper — fixes 3-hour timestamp issue
// ✅ fetchData fetches full_name + email for agreement
// ✅ All policy features: search, read tracking, categories, edit, delete
// ✅ Reading progress bar for tenants
// ✅ Full Tenancy Agreement section at bottom:
//      📋 5 General Terms with emojis
//      🏠 12 Tenant Responsibilities with emojis
//      🏢 5 Landlord Obligations with emojis
//      National ID input field
//      Unread warning if policies not all read
//      Agreement checkbox disabled until all read
//      Download button → calls API → generates PDF
//      Success state after download
// ✅ Edit modal for landlord
// ✅ All dates use Africa/Nairobi timezone via toUTC()