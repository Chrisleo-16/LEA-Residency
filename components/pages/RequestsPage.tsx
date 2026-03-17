'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  AlertCircle, Clock, CheckCircle, Loader2,
  Wrench, Shield, FileText, Zap, LogOut,
  Sparkles, Plus, ChevronDown
} from 'lucide-react'

interface Request {
  id: string
  tenant_id: string
  title: string
  description: string
  category: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  profiles?: { full_name: string; email: string }
}

interface RequestsPageProps {
  user: User | null
}

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance & Repairs',    icon: Wrench   },
  { value: 'security',    label: 'Security Issues',          icon: Shield   },
  { value: 'lease',       label: 'Lease & Tenancy',          icon: FileText },
  { value: 'utility',     label: 'Utility Issues',           icon: Zap      },
  { value: 'moveout',     label: 'Move Out Request',         icon: LogOut   },
  { value: 'cleaning',    label: 'Cleaning Services',        icon: Sparkles },
]

export default function RequestsPage({ user }: RequestsPageProps) {
  const [requests, setRequests] = useState<Request[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setIsLoading(true)

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user!.id).single()
    setRole(profile?.role)

    if (profile?.role === 'landlord') {
      const { data } = await supabase
        .from('requests')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
      setRequests(data || [])
    } else {
      const { data } = await supabase
        .from('requests').select('*')
        .eq('tenant_id', user!.id)
        .order('created_at', { ascending: false })
      setRequests(data || [])
      const active = (data || []).filter(r => r.status !== 'resolved').length
      setActiveCount(active)
    }

    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user!.id)
        .in('status', ['pending', 'in_progress'])

      if (count !== null && count >= 5) {
        throw new Error(
          'You have 5 active requests. Please wait for at least one to be reviewed or call the landlord for further directives.'
        )
      }

      const { error } = await supabase.from('requests').insert({
        tenant_id: user!.id, title, description, category, status: 'pending',
      })

      if (error) throw error
      setSuccess('Request submitted successfully!')
      setTitle('')
      setDescription('')
      setCategory(CATEGORIES[0].value)
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    await supabase.from('requests').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  const getCategoryConfig = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value)
    return cat || CATEGORIES[0]
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':     return { icon: <Clock className="w-3.5 h-3.5" />,       style: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' }
      case 'in_progress': return { icon: <Loader2 className="w-3.5 h-3.5" />,     style: 'bg-blue-100 text-blue-700 border-blue-200',       label: 'In Progress' }
      case 'resolved':    return { icon: <CheckCircle className="w-3.5 h-3.5" />, style: 'bg-green-100 text-green-700 border-green-200',    label: 'Resolved' }
      default:            return { icon: null, style: '', label: status }
    }
  }

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
              {role === 'landlord' ? 'All Requests' : 'My Requests'}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              {role === 'landlord'
                ? 'Manage and update tenant requests'
                : `${activeCount}/5 active requests`}
            </p>
          </div>
          {role === 'tenant' && (
            <Button
              onClick={() => setShowForm(!showForm)}
              disabled={activeCount >= 5}
              className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 gap-2 text-sm h-9"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>

        {/* Active requests progress bar */}
        {role === 'tenant' && (
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < activeCount ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
        )}

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

        {/* Submit Form */}
        {role === 'tenant' && showForm && (
          <Card className="p-4 sm:p-6 border border-border">
            <h3 className="text-base font-semibold text-foreground mb-4">Submit a Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Category grid */}
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
                        className={`flex items-center gap-2 p-2.5 rounded-md border text-xs sm:text-sm transition-colors ${
                          category === cat.value
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
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
                  placeholder="e.g. Water heater not working"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea
                  placeholder="Describe your request in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
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
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Requests List */}
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No requests found</p>
              <p className="text-sm mt-1">
                {role === 'tenant' ? 'Tap the + button to submit one' : 'No tenant requests yet'}
              </p>
            </div>
          ) : (
            requests.map((request) => {
              const statusConfig = getStatusConfig(request.status)
              const catConfig = getCategoryConfig(request.category)
              const CatIcon = catConfig.icon
              return (
                <Card key={request.id} className="p-4 sm:p-5 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <CatIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{catConfig.label}</span>
                      </div>
                      {role === 'landlord' && request.profiles && (
                        <p className="text-xs text-muted-foreground mb-1">
                          From: <span className="font-medium">{request.profiles.full_name}</span>
                          <span className="hidden sm:inline"> · {request.profiles.email}</span>
                        </p>
                      )}
                      <h4 className="font-semibold text-foreground text-sm sm:text-base">{request.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${statusConfig.style}`}>
                        {statusConfig.icon}
                        <span className="hidden sm:inline">{statusConfig.label}</span>
                      </span>
                      {role === 'landlord' && (
                        <div className="relative">
                          <select
                            value={request.status}
                            onChange={(e) => updateStatus(request.id, e.target.value as any)}
                            className="text-xs border border-border rounded-md pl-2 pr-6 py-1 bg-input text-foreground appearance-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
