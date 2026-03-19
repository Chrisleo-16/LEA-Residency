'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertCircle, Clock, CheckCircle, Loader2,
  Wrench, Shield, FileText, Zap, LogOut,
  Sparkles, Plus, ChevronDown, X, AlertTriangle
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
  { value: 'maintenance', label: 'Maintenance',    icon: Wrench,    color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { value: 'security',    label: 'Security',       icon: Shield,    color: 'text-red-500 bg-red-50 border-red-200' },
  { value: 'lease',       label: 'Lease',          icon: FileText,  color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'utility',     label: 'Utility',        icon: Zap,       color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { value: 'moveout',     label: 'Move Out',       icon: LogOut,    color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { value: 'cleaning',    label: 'Cleaning',       icon: Sparkles,  color: 'text-teal-500 bg-teal-50 border-teal-200' },
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

  useEffect(() => { if (!user) return; fetchData() }, [user])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
    setRole(profile?.role)

    if (profile?.role === 'landlord') {
      const { data } = await supabase.from('requests')
        .select('*, profiles(full_name, email)').order('created_at', { ascending: false })
      setRequests(data || [])
    } else {
      const { data } = await supabase.from('requests').select('*')
        .eq('tenant_id', user!.id).order('created_at', { ascending: false })
      setRequests(data || [])
      setActiveCount((data || []).filter(r => r.status !== 'resolved').length)
    }
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setIsSubmitting(true)
    try {
      const { count } = await supabase.from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user!.id).in('status', ['pending', 'in_progress'])
      if (count !== null && count >= 5) throw new Error('You have 5 active requests. Please wait for at least one to be resolved.')
      const { error } = await supabase.from('requests').insert({ tenant_id: user!.id, title, description, category, status: 'pending' })
      if (error) throw error
      setSuccess('Request submitted successfully!')
      setTitle(''); setDescription(''); setCategory(CATEGORIES[0].value); setShowForm(false); fetchData()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  const updateStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    await supabase.from('requests').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value) || CATEGORIES[0]

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':     return { icon: <Clock className="w-3 h-3" />,       style: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-400',   label: 'Pending' }
      case 'in_progress': return { icon: <Loader2 className="w-3 h-3" />,     style: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-400',    label: 'In Progress' }
      case 'resolved':    return { icon: <CheckCircle className="w-3 h-3" />, style: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', label: 'Resolved' }
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
              {role === 'landlord' ? 'All Requests' : 'My Requests'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {role === 'landlord'
                ? `${requests.length} total request${requests.length !== 1 ? 's' : ''}`
                : `${activeCount} of 5 active slots used`
              }
            </p>
          </div>
          {role === 'tenant' && (
            <Button
              onClick={() => setShowForm(!showForm)}
              disabled={activeCount >= 5}
              className="bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl shadow-md shadow-accent/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          )}
        </div>

        {/* Progress */}
        {role === 'tenant' && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">Active Requests</p>
              <p className="text-xs text-muted-foreground">{activeCount}/5</p>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < activeCount ? 'bg-accent' : 'bg-secondary'}`} />
              ))}
            </div>
            {activeCount >= 5 && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Maximum active requests reached
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
              <h3 className="font-semibold text-foreground">Submit a Request</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = category === cat.value
                    return (
                      <button
                        key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                          isSelected ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : ''}`} />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                <Input
                  placeholder="e.g. Water heater not working"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  required disabled={isSubmitting}
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea
                  placeholder="Describe your request in detail..."
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  required disabled={isSubmitting} rows={3}
                  className="w-full rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border-border">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20">
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Requests list */}
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-foreground">No requests found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {role === 'tenant' ? 'Tap "New Request" to submit one' : 'No tenant requests yet'}
              </p>
            </div>
          ) : (
            requests.map((request) => {
              const sc = getStatusConfig(request.status)
              const cc = getCategoryConfig(request.category)
              const CatIcon = cc.icon
              return (
                <div key={request.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Category icon */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cc.color}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {role === 'landlord' && request.profiles && (
                        <p className="text-xs text-muted-foreground mb-1.5">
                          <span className="font-medium text-foreground">{request.profiles.full_name}</span>
                          <span className="hidden sm:inline"> · {request.profiles.email}</span>
                        </p>
                      )}
                      <h4 className="font-semibold text-foreground text-sm sm:text-base">{request.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(request.created_at).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi'
                        })}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.style}`}>
                        {sc.icon}
                        <span className="hidden sm:inline">{sc.label}</span>
                      </span>
                      {role === 'landlord' && (
                        <div className="relative">
                          <select
                            value={request.status}
                            onChange={(e) => updateStatus(request.id, e.target.value as any)}
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
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}