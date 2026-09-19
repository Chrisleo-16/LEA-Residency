'use client'

import { useCallback, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wrench,
  Plus,
  Phone,
  MessageCircle,
  Loader2,
  Send,
  UserCheck,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MAINTENANCE_CATEGORIES,
  statusLabel,
} from '@/lib/maintenance/assignment'
import { readJsonResponse } from '@/lib/api/readJsonResponse'

interface Props {
  user: User | null
}

const STATUS_FLOW = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'closed',
] as const

function waLink(phone?: string | null, text?: string) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '').replace(/^0/, '254')
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${q}`
}

function telLink(phone?: string | null) {
  if (!phone) return null
  return `tel:${phone}`
}

export default function MaintenancePage({ user }: Props) {
  const [role, setRole] = useState<'tenant' | 'landlord' | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [msgBody, setMsgBody] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium',
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      setRole((profile?.role as any) || 'tenant')

      const res = await fetch('/api/maintenance')
      const { ok, data, error: apiError } = await readJsonResponse<any>(res)
      if (!ok) throw new Error(apiError || 'Failed to load requests')
      setRequests(data.requests || [])

      if (profile?.role === 'landlord') {
        const sRes = await fetch('/api/staff')
        const sParsed = await readJsonResponse<any>(sRes)
        if (sParsed.ok) setStaff(sParsed.data.staff || [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const openRequest = async (req: any) => {
    setSelected(req)
    setSuggestions([])
    try {
      const [msgRes, sugRes] = await Promise.all([
        fetch(`/api/maintenance/messages?request_id=${req.id}`),
        role === 'landlord'
          ? fetch(`/api/maintenance?suggest_for=${req.id}`)
          : Promise.resolve(null),
      ])
      const msgData = await msgRes.json()
      if (msgRes.ok) setMessages(msgData.messages || [])
      if (sugRes) {
        const sugData = await sugRes.json()
        if (sugRes.ok) setSuggestions(sugData.suggestions || [])
      }
    } catch {
      setMessages([])
    }
  }

  const submitRequest = async () => {
    if (!form.title.trim() || !form.description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      setShowForm(false)
      setForm({
        title: '',
        description: '',
        category: 'plumbing',
        priority: 'medium',
      })
      await load()
      if (data.request) openRequest(data.request)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const updateRequest = async (payload: Record<string, unknown>) => {
    if (!selected) return
    const res = await fetch('/api/maintenance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: selected.id, ...payload }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Update failed')
      return
    }
    setSelected(data.request)
    await load()
  }

  const sendMessage = async () => {
    if (!selected || !msgBody.trim()) return
    const res = await fetch('/api/maintenance/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: selected.id, body: msgBody }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Message failed')
      return
    }
    setMsgBody('')
    setMessages((prev) => [...prev, data.message])
  }

  const statusColor = (s: string) => {
    const n = s === 'resolved' ? 'completed' : s === 'requested' ? 'pending' : s
    if (n === 'pending') return 'bg-amber-100 text-amber-800'
    if (n === 'assigned') return 'bg-blue-100 text-blue-800'
    if (n === 'in_progress') return 'bg-indigo-100 text-indigo-800'
    if (n === 'completed') return 'bg-emerald-100 text-emerald-800'
    if (n === 'closed') return 'bg-neutral-100 text-neutral-600'
    return 'bg-neutral-100 text-neutral-700'
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  const staffMember = selected?.staff
  const wa = waLink(
    staffMember?.whatsapp_number || staffMember?.phone,
    `Hi ${staffMember?.first_name || ''}, regarding maintenance: ${selected?.title || ''}`
  )
  const call = telLink(staffMember?.phone)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-accent" />
            {role === 'landlord' ? 'Maintenance & Service' : 'My Maintenance'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === 'landlord'
              ? 'Track requests, assign your team, and stay out of the middle.'
              : 'Report an issue, see who is handling it, and message them directly.'}
          </p>
        </div>
        {role === 'tenant' && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-accent text-accent-foreground gap-2"
          >
            <Plus className="h-4 w-4" /> New request
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Lifecycle legend */}
      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        {STATUS_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`rounded-full px-2 py-0.5 ${statusColor(s)}`}>
              {statusLabel(s)}
            </span>
            {i < STATUS_FLOW.length - 1 && <span>→</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-2">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No maintenance requests yet.
            </div>
          ) : (
            requests.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openRequest(r)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selected?.id === r.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {r.category}
                      {r.unit_number ? ` · Unit ${r.unit_number}` : ''}
                      {role === 'landlord' && r.tenant?.full_name
                        ? ` · ${r.tenant.full_name}`
                        : ''}
                    </p>
                  </div>
                  <Badge className={`${statusColor(r.status)} border-0 shrink-0`}>
                    {statusLabel(r.status)}
                  </Badge>
                </div>
                {r.staff && (
                  <p className="mt-2 text-xs text-accent flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    {r.staff.first_name} {r.staff.last_name} · {r.staff.specialty}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.created_at).toLocaleString('en-KE')}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="rounded-2xl border border-border bg-secondary/30 p-10 text-center text-sm text-muted-foreground">
              Select a request to see status, assigned staff, and conversation.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-popover p-5 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{selected.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {selected.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={`${statusColor(selected.status)} border-0`}>
                  {statusLabel(selected.status)}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selected.category}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selected.priority} priority
                </Badge>
                {selected.unit_number && (
                  <Badge variant="outline">Unit {selected.unit_number}</Badge>
                )}
              </div>

              {/* Assigned staff + contact */}
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Assigned staff
                </p>
                {staffMember ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {staffMember.first_name} {staffMember.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {staffMember.specialty}
                        {staffMember.phone ? ` · ${staffMember.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {call && (
                        <a href={call}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> Call
                          </Button>
                        </a>
                      )}
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not assigned yet
                    {role === 'tenant'
                      ? ' — your landlord will assign someone shortly.'
                      : '.'}
                  </p>
                )}

                {role === 'landlord' && (
                  <div className="mt-3 space-y-2">
                    <Select
                      value={selected.assigned_staff_id || ''}
                      onValueChange={(v) =>
                        updateRequest({ assigned_staff_id: v || null })
                      }
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Assign staff…" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} · {s.specialty}
                            {s.availability !== 'available' ? ` (${s.availability})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {suggestions.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Suggested:{' '}
                        {suggestions
                          .slice(0, 3)
                          .map(
                            (s) =>
                              `${s.first_name} ${s.last_name} (${s.specialty})`
                          )
                          .join(' · ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {['assigned', 'in_progress', 'completed', 'closed'].map(
                        (s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() => updateRequest({ status: s })}
                          >
                            Mark {statusLabel(s)}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {role === 'tenant' &&
                  ['completed', 'resolved'].includes(selected.status) && (
                    <Button
                      size="sm"
                      className="mt-3 gap-1.5"
                      onClick={() => updateRequest({ status: 'closed' })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Close request
                    </Button>
                  )}
              </div>

              {/* Contextual thread */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Conversation about this issue
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-3">
                  {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No messages yet. Ask a question or share an update.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.sender_id === user?.id
                            ? 'bg-accent/10 ml-6'
                            : 'bg-muted mr-6'
                        }`}
                      >
                        <p className="text-[10px] uppercase text-muted-foreground mb-0.5">
                          {m.sender_role}
                          {m.sender?.full_name ? ` · ${m.sender.full_name}` : ''}
                        </p>
                        {m.body}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Message about this request…"
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage} className="gap-1.5 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New request modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Report a problem</h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Urgency</label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Kitchen sink leaking"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                className="mt-1"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What happened? When did it start?"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={submitRequest} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Submit request'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
