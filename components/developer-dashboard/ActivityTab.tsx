'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, MessagesSquare, AlertCircle, Wrench, FileText, Bell, Mail, CalendarCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatBar } from './StatCard'
import { EmptyRow, SkeletonRows } from './DataRow'
import { fmt, timeAgo } from './helpers'

const supabase = createClient()

interface ActivityItem {
  id: string
  type: 'signup' | 'payment'
  description: string
  time: string
  color: string
}

interface PlatformCounts {
  messages: number
  conversations: number
  complaints: number
  requests: number
  policies: number
  pushSubscriptions: number
  contactSubmissions: number
  viewingRequests: number
}

const EMPTY: PlatformCounts = {
  messages: 0, conversations: 0, complaints: 0, requests: 0,
  policies: 0, pushSubscriptions: 0, contactSubmissions: 0, viewingRequests: 0,
}

interface ActivityTabProps {
  refreshKey: number
}

export function ActivityTab({ refreshKey }: ActivityTabProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [counts, setCounts] = useState<PlatformCounts>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [
          recentUsersRes, paymentsJson, messagesRes, convsRes, complaintsRes,
          requestsRes, policiesRes, pushRes, contactRes, viewingRes,
        ] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(6),
          // payments RLS has no developer exception, so the anon client sees
          // zero rows — go through the service-role API route instead.
          fetch('/api/developer/payments').then((r) => r.json()),
          supabase.from('messages').select('id', { count: 'exact', head: true }),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
          supabase.from('complaints').select('id', { count: 'exact', head: true }),
          supabase.from('requests').select('id', { count: 'exact', head: true }),
          supabase.from('policies').select('id', { count: 'exact', head: true }),
          supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }),
          supabase.from('contact_submissions').select('id', { count: 'exact', head: true }),
          supabase.from('viewing_requests').select('id', { count: 'exact', head: true }),
        ])
        if (cancelled) return
        for (const res of [
          recentUsersRes, messagesRes, convsRes, complaintsRes,
          requestsRes, policiesRes, pushRes, contactRes, viewingRes,
        ]) {
          if (res.error) throw res.error
        }
        if (paymentsJson.error) throw new Error(paymentsJson.error)

        const items: ActivityItem[] = []
        ;(recentUsersRes.data || []).forEach((u: any) => {
          items.push({
            id: `user-${u.id}`, type: 'signup',
            description: `${u.full_name || u.email} joined as ${u.role}`,
            time: u.created_at, color: 'bg-primary',
          })
        })
        ;((paymentsJson.payments || []) as any[]).slice(0, 6).forEach((p: any) => {
          items.push({
            id: `pay-${p.id}`, type: 'payment',
            description: `KES ${Number(p.amount).toLocaleString()} received — ${p.payment_month}`,
            time: p.created_at, color: 'bg-green-500',
          })
        })
        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

        setActivity(items)
        setCounts({
          messages: messagesRes.count || 0,
          conversations: convsRes.count || 0,
          complaints: complaintsRes.count || 0,
          requests: requestsRes.count || 0,
          policies: policiesRes.count || 0,
          pushSubscriptions: pushRes.count || 0,
          contactSubmissions: contactRes.count || 0,
          viewingRequests: viewingRes.count || 0,
        })
      } catch (err: any) {
        if (!cancelled) toast.error('Failed to load activity', { description: err?.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent Activity Feed</div>
        <Card className="gap-0 overflow-hidden py-0">
          {loading ? (
            <SkeletonRows />
          ) : activity.length === 0 ? (
            <EmptyRow>No recent activity</EmptyRow>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3.5 px-4 py-3">
                  <div className={`size-2 shrink-0 rounded-full ${a.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{a.description}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{a.type}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.time)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform Counts</div>
        <StatBar
          items={[
            { label: 'Messages', value: loading ? '—' : fmt(counts.messages), icon: MessageSquare, tone: 'blue' },
            { label: 'Conversations', value: loading ? '—' : fmt(counts.conversations), icon: MessagesSquare, tone: 'purple' },
            { label: 'Complaints', value: loading ? '—' : fmt(counts.complaints), icon: AlertCircle, tone: 'red' },
            { label: 'Maintenance Requests', value: loading ? '—' : fmt(counts.requests), icon: Wrench, tone: 'amber' },
          ]}
          loading={loading}
        />
        <StatBar
          items={[
            { label: 'Policies', value: loading ? '—' : fmt(counts.policies), icon: FileText, tone: 'slate' },
            { label: 'Push Subscriptions', value: loading ? '—' : fmt(counts.pushSubscriptions), icon: Bell, tone: 'teal' },
            { label: 'Contact Forms', value: loading ? '—' : fmt(counts.contactSubmissions), icon: Mail, tone: 'pink' },
            { label: 'Viewing Requests', value: loading ? '—' : fmt(counts.viewingRequests), icon: CalendarCheck, tone: 'green' },
          ]}
          loading={loading}
        />
      </div>
    </div>
  )
}
