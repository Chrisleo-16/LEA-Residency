'use client'

import { useState, useEffect } from 'react'
import { Plus, Clock, Loader2, CheckCircle, X, Wrench, Shield, FileText, Zap, LogOut, Sparkles } from 'lucide-react'
import { generateDemoRequests, DemoRequest } from '@/lib/demo/demoData'

interface DemoRequestsPageProps {
  demoName: string
  demoRole: 'tenant' | 'landlord'
}

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'lease', label: 'Lease', icon: FileText },
  { value: 'utility', label: 'Utility', icon: Zap },
  { value: 'moveout', label: 'Move Out', icon: LogOut },
  { value: 'cleaning', label: 'Cleaning', icon: Sparkles },
]

export default function DemoRequestsPage({ demoName, demoRole }: DemoRequestsPageProps) {
  const [requests, setRequests] = useState<DemoRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)

  useEffect(() => {
    setRequests(generateDemoRequests(demoRole, demoName))
  }, [demoRole, demoName])

  const activeCount = requests.filter(r => r.status !== 'resolved').length

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { icon: <Clock className="w-3 h-3" />, style: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending' }
      case 'in_progress': return { icon: <Loader2 className="w-3 h-3" />, style: 'bg-blue-50 text-blue-700 border-blue-200', label: 'In Progress' }
      case 'resolved': return { icon: <CheckCircle className="w-3 h-3" />, style: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Resolved' }
      default: return { icon: null, style: '', label: status }
    }
  }

  const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value) || CATEGORIES[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setRequests(prev => [{
      id: `demo-request-new-${Date.now()}`,
      title,
      description,
      category,
      status: 'pending',
      created_at: new Date().toISOString(),
      tenant_name: demoName,
    }, ...prev])
    setTitle('')
    setDescription('')
    setShowForm(false)
  }

  const updateStatus = (id: string, status: DemoRequest['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-3xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {demoRole === 'landlord' ? 'All Requests' : 'My Requests'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {demoRole === 'landlord' ? `${requests.length} total requests` : `${activeCount} of 5 active slots used`}
            </p>
          </div>
          {demoRole === 'tenant' && (
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={activeCount >= 5}
              className="bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl shadow-md shadow-accent/20 shrink-0 px-4 py-2.5 text-sm font-medium flex items-center disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          )}
        </div>

        {demoRole === 'tenant' && showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Submit a Request</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium ${
                        category === cat.value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
              <input
                placeholder="e.g. Water heater not working"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-secondary border border-border text-foreground rounded-xl h-11 px-3 text-sm"
              />
              <textarea
                placeholder="Describe your request in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-accent text-white rounded-xl py-2.5 text-sm font-medium">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {requests.map((request) => {
            const sc = getStatusConfig(request.status)
            const cc = getCategoryConfig(request.category)
            const CatIcon = cc.icon
            return (
              <div key={request.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl border border-border bg-secondary flex items-center justify-center shrink-0">
                    <CatIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {demoRole === 'landlord' && (
                      <p className="text-xs text-muted-foreground mb-1.5">
                        <span className="font-medium text-foreground">{request.tenant_name}</span>
                      </p>
                    )}
                    <h4 className="font-semibold text-foreground text-sm">{request.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(request.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.style}`}>
                      {sc.icon} {sc.label}
                    </span>
                    {demoRole === 'landlord' && (
                      <select
                        value={request.status}
                        onChange={(e) => updateStatus(request.id, e.target.value as any)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-secondary text-foreground"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}