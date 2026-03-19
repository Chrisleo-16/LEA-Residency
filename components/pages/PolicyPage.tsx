'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  AlertCircle, FileText, Home, DollarSign,
  Wrench, LogOut, Shield, BookOpen,
  Trash2, Upload, ChevronDown, ChevronUp, Plus, Pencil, X
} from 'lucide-react'

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
  { value: 'house_rules',  label: 'House Rules',       icon: Home       },
  { value: 'rent_payment', label: 'Rent & Payment',    icon: DollarSign },
  { value: 'maintenance',  label: 'Maintenance',       icon: Wrench     },
  { value: 'move_in_out',  label: 'Move In & Out',     icon: LogOut     },
  { value: 'security',     label: 'Security & Safety', icon: Shield     },
  { value: 'lease',        label: 'Lease Agreement',   icon: BookOpen   },
]

export default function PolicyPage({ user }: PolicyPageProps) {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [role, setRole] = useState<string | null>(null)
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
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user!.id).single()
    setRole(profile?.role)

    const { data } = await supabase
      .from('policies').select('*')
      .neq('category', 'announcement')
      .order('created_at', { ascending: false })
    setPolicies(data || [])
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      let fileUrl: string | null = null

      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('policy-docs').upload(fileName, pdfFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage
          .from('policy-docs').getPublicUrl(uploadData.path)
        fileUrl = urlData.publicUrl
      }

      const { error } = await supabase.from('policies').insert({
        title, content, category, file_url: fileUrl, created_by: user!.id,
      })
      if (error) throw error

      setSuccess('Policy published successfully!')
      setTitle('')
      setContent('')
      setCategory(CATEGORIES[0].value)
      setPdfFile(null)
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
      fetchData()
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
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

    const { error } = await supabase
      .from('policies')
      .update({ title: editTitle, content: editContent })
      .eq('id', editingPolicy.id)

    setIsSavingEdit(false)

    if (!error) {
      setEditingPolicy(null)
      setSuccess('Policy updated successfully!')
      fetchData()
    } else {
      setError(error.message)
    }
  }

  const getCategoryConfig = (value: string) =>
    CATEGORIES.find(c => c.value === value) || CATEGORIES[0]

  const filteredPolicies = activeCategory === 'all'
    ? policies
    : policies.filter(p => p.category === activeCategory)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {role === 'landlord' ? 'Manage Policies' : 'Policy & Documents'}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              {role === 'landlord'
                ? 'Publish and manage policies'
                : 'Read all policies from LEA Executive'}
            </p>
          </div>
          {role === 'landlord' && (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 gap-2 text-sm h-9"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>

        {/* Feedback */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Publish Form */}
        {role === 'landlord' && showForm && (
          <Card className="p-4 sm:p-6 border border-border">
            <h3 className="text-base font-semibold text-foreground mb-4">Publish a Policy</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-md border text-xs transition-colors ${
                          category === cat.value
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-foreground hover:bg-secondary'
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
                  type="text"
                  placeholder="e.g. Noise Policy 2024"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Content</label>
                <textarea
                  placeholder="Write the full policy content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                  rows={5}
                  className="w-full rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Attach PDF (optional)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-md p-4 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <Upload className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {pdfFile ? pdfFile.name : 'Click to upload PDF'}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors shrink-0 ${
              activeCategory === 'all'
                ? 'bg-accent text-accent-foreground border-accent'
                : 'border-border text-foreground hover:bg-secondary'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors shrink-0 ${
                activeCategory === cat.value
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-foreground hover:bg-secondary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Policies List */}
        <div className="space-y-3">
          {filteredPolicies.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No policies found</p>
              <p className="text-sm mt-1">
                {role === 'landlord' ? 'Tap + to publish one' : 'No policies published yet'}
              </p>
            </div>
          ) : (
            filteredPolicies.map((policy) => {
              const catConfig = getCategoryConfig(policy.category)
              const CatIcon = catConfig.icon
              return (
                <Card key={policy.id} className="border border-border overflow-hidden">
                  <div
                    className="p-4 sm:p-5 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedId(expandedId === policy.id ? null : policy.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <CatIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{catConfig.label}</span>
                        </div>
                        <h4 className="font-semibold text-foreground text-sm sm:text-base">
                          {policy.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Published {new Date(policy.created_at).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {role === 'landlord' && (
                          <>
                            {/* Edit button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingPolicy(policy)
                                setEditTitle(policy.title)
                                setEditContent(policy.content)
                              }}
                              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                              title="Edit policy"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(policy.id, policy.file_url)
                              }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                              title="Delete policy"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {expandedId === policy.id
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                    </div>
                  </div>

                  {expandedId === policy.id && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border pt-4 space-y-3">
                      {policy.content && (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {policy.content}
                        </p>
                      )}
                      {policy.file_url && (
                        
                          <a href={policy.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          View / Download PDF
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground text-lg">Edit Policy</h3>
              <button
                onClick={() => setEditingPolicy(null)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Content</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={7}
                  className="w-full rounded-md border border-border bg-input text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPolicy(null)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
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

// **What was fixed across all three files:**
// ```
// ChatArea.tsx
//   ✅ Message import added from useChat
//   ✅ replyingTo state declared before useChat call
//   ✅ editMessage added to useChat destructure
//   ✅ Reply preview bar moved INSIDE the chat section (above input)
//   ✅ onReply + onEdit passed to MessageBubble
//   ✅ handleSend captures replyId before clearing state
//   ✅ selectTenant resets replyingTo when switching tenants
//   ✅ Commented out code removed

// CommunityPage.tsx
//   ✅ Message imported from useChat
//   ✅ replyingTo state added
//   ✅ editMessage added to useChat destructure
//   ✅ Reply preview bar added above input
//   ✅ onReply + onEdit passed to MessageBubble
//   ✅ handleSend captures replyId before clearing
//   ✅ Commented out code removed

// PolicyPage.tsx
//   ✅ Pencil + X imported from lucide
//   ✅ editingPolicy, editTitle, editContent states added
//   ✅ handleEdit function added
//   ✅ Edit button added next to delete on each card
//   ✅ Edit modal added at bottom of return
//   ✅ Commented out code removed