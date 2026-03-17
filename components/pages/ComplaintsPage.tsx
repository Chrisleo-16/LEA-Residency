'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle, Clock, CheckCircle, Loader2, Plus, ChevronDown } from 'lucide-react'

interface Complaint {
  id: string
  tenant_id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  profiles?: { full_name: string; email: string }
}

interface ComplaintsPageProps {
  user: User | null
}

export default function ComplaintsPage({ user }: ComplaintsPageProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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
        .from('complaints')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
      setComplaints(data || [])
    } else {
      const { data } = await supabase
        .from('complaints').select('*')
        .eq('tenant_id', user!.id)
        .order('created_at', { ascending: false })
      setComplaints(data || [])

      const active = (data || []).filter(c => c.status !== 'resolved').length
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
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user!.id)
        .in('status', ['pending', 'in_progress'])

      if (count !== null && count >= 3) {
        throw new Error(
          'You have 3 active complaints. Please wait for at least one to be reviewed or call the landlord for further directives.'
        )
      }

      const { error } = await supabase.from('complaints').insert({
        tenant_id: user!.id, title, description, status: 'pending',
      })

      if (error) throw error
      setSuccess('Complaint submitted successfully!')
      setTitle('')
      setDescription('')
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    await supabase.from('complaints').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':     return { icon: <Clock className="w-3.5 h-3.5" />,     style: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' }
      case 'in_progress': return { icon: <Loader2 className="w-3.5 h-3.5" />,   style: 'bg-blue-100 text-blue-700 border-blue-200',       label: 'In Progress' }
      case 'resolved':    return { icon: <CheckCircle className="w-3.5 h-3.5" />, style: 'bg-green-100 text-green-700 border-green-200',   label: 'Resolved' }
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
              {role === 'landlord' ? 'All Complaints' : 'My Complaints'}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              {role === 'landlord'
                ? 'Manage and update tenant complaints'
                : `${activeCount}/3 active complaints`}
            </p>
          </div>

          {/* Tenant submit button */}
          {role === 'tenant' && (
            <Button
              onClick={() => setShowForm(!showForm)}
              disabled={activeCount >= 3}
              className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 gap-2 text-sm h-9"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>

        {/* Active complaints bar */}
        {role === 'tenant' && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
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
            <h3 className="text-base font-semibold text-foreground mb-4">Submit a Complaint</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                <Input
                  type="text"
                  placeholder="e.g. Broken pipe in bathroom"
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
                  placeholder="Describe your complaint in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={4}
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

        {/* Complaints List */}
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No complaints found</p>
              <p className="text-sm mt-1">
                {role === 'tenant' ? 'Tap the + button to submit one' : 'No tenant complaints yet'}
              </p>
            </div>
          ) : (
            complaints.map((complaint) => {
              const statusConfig = getStatusConfig(complaint.status)
              return (
                <Card key={complaint.id} className="p-4 sm:p-5 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {role === 'landlord' && complaint.profiles && (
                        <p className="text-xs text-muted-foreground mb-1.5">
                          From: <span className="font-medium">{complaint.profiles.full_name}</span>
                          <span className="hidden sm:inline"> · {complaint.profiles.email}</span>
                        </p>
                      )}
                      <h4 className="font-semibold text-foreground text-sm sm:text-base">{complaint.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{complaint.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(complaint.created_at).toLocaleDateString('en-US', {
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
                            value={complaint.status}
                            onChange={(e) => updateStatus(complaint.id, e.target.value as any)}
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
